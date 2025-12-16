from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.environ.get("SECRET_KEY", "neatify-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: str
    role: str  # 'customer', 'franchisee', 'admin'

class UserCreate(UserBase):
    password: str
    address: Optional[str] = None
    postalCode: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str = Field(alias="_id")
    address: Optional[str] = None
    postalCode: Optional[str] = None
    assignedFSAs: Optional[List[str]] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ServiceCreate(BaseModel):
    name: str
    category: str  # 'deep-clean', 'regular', 'move-in-out', 'commercial'
    serviceType: str  # 'residential', 'commercial'
    basePriceResidential: float
    basePriceCommercial: float
    pricePerSqFt: float
    description: str
    estimatedDuration: int  # in minutes

class Service(ServiceCreate):
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class QuoteRequest(BaseModel):
    serviceId: str
    serviceType: str  # 'residential' or 'commercial'
    squareFeet: int
    isRecurring: bool = False
    frequency: Optional[str] = None  # 'weekly', 'biweekly', 'monthly'

class QuoteResponse(BaseModel):
    serviceId: str
    serviceName: str
    basePrice: float
    sqftPrice: float
    totalPrice: float
    discount: float = 0
    finalPrice: float
    isRecurring: bool
    frequency: Optional[str] = None

class BookingCreate(BaseModel):
    serviceId: str
    serviceType: str
    address: str
    postalCode: str
    squareFeet: int
    scheduledDate: datetime
    isRecurring: bool = False
    recurringFrequency: Optional[str] = None
    totalPrice: float
    notes: Optional[str] = None

class Booking(BookingCreate):
    id: str = Field(alias="_id")
    customerId: str
    franchiseeId: Optional[str] = None
    fsaCode: str
    status: str = "pending"  # pending, assigned, in-progress, completed, cancelled
    escrowStatus: str = "held"  # held, released-to-franchisee, released-to-company
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class BookingStatusUpdate(BaseModel):
    status: str

class ReviewCreate(BaseModel):
    bookingId: str
    rating: int  # 1-5
    comment: str

class Review(ReviewCreate):
    id: str = Field(alias="_id")
    customerId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class FSAAssignment(BaseModel):
    franchiseeId: str
    fsaCodes: List[str]

# ==================== AUTH UTILITIES ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    
    user["_id"] = str(user["_id"])
    return User(**user)

# ==================== HELPER FUNCTIONS ====================

def extract_fsa(postal_code: str) -> str:
    """Extract last 3 characters from postal code (e.g., M5V3A8 -> 3A8)"""
    clean_code = postal_code.replace(" ", "").upper()
    if len(clean_code) >= 3:
        return clean_code[-3:]
    return clean_code

async def find_franchisee_by_fsa(fsa_code: str) -> Optional[dict]:
    """Find a franchisee assigned to this FSA"""
    franchisee = await db.users.find_one({
        "role": "franchisee",
        "assignedFSAs": fsa_code
    })
    return franchisee

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Neatify API - Cleaning Services Booking Platform"}

# AUTH ROUTES
@api_router.post("/auth/signup", response_model=Token)
async def signup(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user.password)
    user_dict["createdAt"] = datetime.utcnow()
    user_dict["assignedFSAs"] = []
    
    result = await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token({"sub": str(result.inserted_id)})
    
    # Get created user
    created_user = await db.users.find_one({"_id": result.inserted_id})
    created_user["_id"] = str(created_user["_id"])
    del created_user["password"]
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(**created_user)
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": str(user["_id"])})
    
    user["_id"] = str(user["_id"])
    del user["password"]
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(**user)
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# SERVICE ROUTES
@api_router.post("/services", response_model=Service)
async def create_service(service: ServiceCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    service_dict = service.dict()
    service_dict["createdAt"] = datetime.utcnow()
    
    result = await db.services.insert_one(service_dict)
    created_service = await db.services.find_one({"_id": result.inserted_id})
    created_service["_id"] = str(created_service["_id"])
    
    return Service(**created_service)

@api_router.get("/services", response_model=List[Service])
async def get_services():
    services = await db.services.find().to_list(100)
    for service in services:
        service["_id"] = str(service["_id"])
    return [Service(**service) for service in services]

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str):
    service = await db.services.find_one({"_id": ObjectId(service_id)})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    service["_id"] = str(service["_id"])
    return Service(**service)

# QUOTE ROUTES
@api_router.post("/quotes", response_model=QuoteResponse)
async def calculate_quote(quote_req: QuoteRequest):
    service = await db.services.find_one({"_id": ObjectId(quote_req.serviceId)})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Calculate price
    base_price = service["basePriceCommercial"] if quote_req.serviceType == "commercial" else service["basePriceResidential"]
    sqft_price = service["pricePerSqFt"] * quote_req.squareFeet
    total_price = base_price + sqft_price
    
    # Apply recurring discount
    discount = 0
    if quote_req.isRecurring:
        if quote_req.frequency == "weekly":
            discount = total_price * 0.15  # 15% off
        elif quote_req.frequency == "biweekly":
            discount = total_price * 0.10  # 10% off
        elif quote_req.frequency == "monthly":
            discount = total_price * 0.05  # 5% off
    
    final_price = total_price - discount
    
    return QuoteResponse(
        serviceId=quote_req.serviceId,
        serviceName=service["name"],
        basePrice=base_price,
        sqftPrice=sqft_price,
        totalPrice=total_price,
        discount=discount,
        finalPrice=final_price,
        isRecurring=quote_req.isRecurring,
        frequency=quote_req.frequency
    )

# BOOKING ROUTES
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: BookingCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create bookings")
    
    # Extract FSA code
    fsa_code = extract_fsa(booking.postalCode)
    
    # Find franchisee
    franchisee = await find_franchisee_by_fsa(fsa_code)
    
    booking_dict = booking.dict()
    booking_dict["customerId"] = current_user.id
    booking_dict["franchiseeId"] = str(franchisee["_id"]) if franchisee else None
    booking_dict["fsaCode"] = fsa_code
    booking_dict["status"] = "assigned" if franchisee else "pending"
    booking_dict["escrowStatus"] = "held"
    booking_dict["createdAt"] = datetime.utcnow()
    
    result = await db.bookings.insert_one(booking_dict)
    created_booking = await db.bookings.find_one({"_id": result.inserted_id})
    created_booking["_id"] = str(created_booking["_id"])
    
    return Booking(**created_booking)

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(current_user: User = Depends(get_current_user)):
    query = {}
    
    if current_user.role == "customer":
        query["customerId"] = current_user.id
    elif current_user.role == "franchisee":
        query["franchiseeId"] = current_user.id
    # Admin sees all bookings
    
    bookings = await db.bookings.find(query).sort("createdAt", -1).to_list(100)
    for booking in bookings:
        booking["_id"] = str(booking["_id"])
    return [Booking(**booking) for booking in bookings]

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, current_user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check permissions
    if current_user.role == "customer" and booking["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "franchisee" and booking["franchiseeId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    booking["_id"] = str(booking["_id"])
    return Booking(**booking)

@api_router.patch("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str, 
    status_update: BookingStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Validate permissions
    if current_user.role == "franchisee" and booking["franchiseeId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {"status": status_update.status}
    
    # If completed, release escrow
    if status_update.status == "completed":
        update_data["completedAt"] = datetime.utcnow()
        update_data["escrowStatus"] = "released-to-franchisee"
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": update_data}
    )
    
    updated_booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    updated_booking["_id"] = str(updated_booking["_id"])
    
    return Booking(**updated_booking)

@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, current_user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if current_user.role == "customer" and booking["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if booking["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Booking cancelled successfully"}

# REVIEW ROUTES
@api_router.post("/reviews", response_model=Review)
async def create_review(review: ReviewCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can leave reviews")
    
    # Check if booking exists and belongs to user
    booking = await db.bookings.find_one({"_id": ObjectId(review.bookingId)})
    if not booking or booking["customerId"] != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Check if already reviewed
    existing_review = await db.reviews.find_one({"bookingId": review.bookingId})
    if existing_review:
        raise HTTPException(status_code=400, detail="Booking already reviewed")
    
    review_dict = review.dict()
    review_dict["customerId"] = current_user.id
    review_dict["createdAt"] = datetime.utcnow()
    
    result = await db.reviews.insert_one(review_dict)
    created_review = await db.reviews.find_one({"_id": result.inserted_id})
    created_review["_id"] = str(created_review["_id"])
    
    return Review(**created_review)

@api_router.get("/reviews", response_model=List[Review])
async def get_reviews():
    reviews = await db.reviews.find().sort("createdAt", -1).to_list(100)
    for review in reviews:
        review["_id"] = str(review["_id"])
    return [Review(**review) for review in reviews]

# ADMIN ROUTES - FSA Management
@api_router.get("/admin/franchisees", response_model=List[User])
async def get_franchisees(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    franchisees = await db.users.find({"role": "franchisee"}).to_list(100)
    for franchisee in franchisees:
        franchisee["_id"] = str(franchisee["_id"])
        del franchisee["password"]
    return [User(**franchisee) for franchisee in franchisees]

@api_router.post("/admin/assign-fsa")
async def assign_fsa(assignment: FSAAssignment, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Update franchisee's assigned FSAs
    result = await db.users.update_one(
        {"_id": ObjectId(assignment.franchiseeId), "role": "franchisee"},
        {"$set": {"assignedFSAs": assignment.fsaCodes}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    return {"message": "FSA codes assigned successfully"}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_bookings = await db.bookings.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_franchisees = await db.users.count_documents({"role": "franchisee"})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    
    # Calculate total revenue
    completed = await db.bookings.find({"status": "completed"}).to_list(1000)
    total_revenue = sum(booking.get("totalPrice", 0) for booking in completed)
    
    return {
        "totalBookings": total_bookings,
        "totalCustomers": total_customers,
        "totalFranchisees": total_franchisees,
        "completedBookings": completed_bookings,
        "totalRevenue": total_revenue
    }

# FRANCHISEE DASHBOARD
@api_router.get("/franchisee/earnings")
async def get_franchisee_earnings(current_user: User = Depends(get_current_user)):
    if current_user.role != "franchisee":
        raise HTTPException(status_code=403, detail="Franchisee access required")
    
    completed_bookings = await db.bookings.find({
        "franchiseeId": current_user.id,
        "status": "completed"
    }).to_list(1000)
    
    total_earnings = sum(booking.get("totalPrice", 0) * 0.8 for booking in completed_bookings)  # 80% to franchisee
    
    return {
        "totalEarnings": total_earnings,
        "completedJobs": len(completed_bookings),
        "averageJobValue": total_earnings / len(completed_bookings) if completed_bookings else 0
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
