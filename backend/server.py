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
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from bson import ObjectId
from quote_calculator import (
    QuoteCalculator, QuoteRequest as EnhancedQuoteRequest,
    QuoteResponse as EnhancedQuoteResponse, AVAILABLE_ADDONS
)

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

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class User(UserBase):
    id: str = Field(alias="_id")
    address: Optional[str] = None
    postalCode: Optional[str] = None
    assignedFSAs: Optional[List[str]] = []
    franchiseeId: Optional[str] = None  # For workforce: which franchisee they work for
    profilePhoto: Optional[str] = None  # Base64 encoded photo or URL
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    postalCode: Optional[str] = None
    profilePhoto: Optional[str] = None  # Base64 encoded photo

# Property Models
class PropertyCreate(BaseModel):
    name: str  # e.g., "Home", "Downtown Office", "Vacation House"
    address: str
    apartmentNumber: Optional[str] = None
    buzzNumber: Optional[str] = None
    postalCode: str
    propertyType: str  # residential, commercial
    bedrooms: Optional[int] = 0
    bathrooms: Optional[int] = 0
    squareFeet: Optional[int] = 0
    notes: Optional[str] = None

class Property(PropertyCreate):
    id: str = Field(alias="_id")
    customerId: str
    fsaCode: str
    isActive: bool = True  # Active/Inactive status
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Task Models
class Task(BaseModel):
    id: str = Field(alias="_id")
    bookingId: str
    taskType: str  # room, addon, appliance
    name: str
    description: Optional[str] = None
    isCompleted: bool = False
    completedBy: Optional[str] = None  # workforce user id
    completedAt: Optional[datetime] = None
    notes: Optional[str] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class TaskUpdate(BaseModel):
    isCompleted: bool
    notes: Optional[str] = None

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
    # HR Bank integration fields
    hrbankTaskId: Optional[str] = None
    hrbankWorkplace: Optional[str] = None
    
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
    """Extract FIRST 3 characters from postal code (e.g., N8L1E6 -> N8L)"""
    clean_code = postal_code.replace(" ", "").upper()
    if len(clean_code) >= 3:
        return clean_code[:3]  # FIRST 3 characters, not last
    return clean_code

async def find_franchisee_by_fsa(fsa_code: str) -> Optional[dict]:
    """Find a franchisee assigned to this FSA"""
    franchisee = await db.users.find_one({
        "role": "franchisee",
        "assignedFSAs": fsa_code
    })
    return franchisee

# ==================== HR BANK INTEGRATION ====================

HRBANK_API_URL = os.environ.get('HRBANK_API_URL', '')
HRBANK_API_KEY = os.environ.get('HRBANK_API_KEY', '')

async def check_hrbank_coverage(postal_code: str) -> dict:
    """Check if HR Bank has a franchisee serving that area"""
    if not HRBANK_API_URL or not HRBANK_API_KEY:
        return {"success": False, "covered": False, "error": "HR Bank not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{HRBANK_API_URL}/api/external/bookings/check-coverage/{postal_code}",
                headers={"X-API-Key": HRBANK_API_KEY},
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logging.error(f"HR Bank coverage check failed: {e}")
        return {"success": False, "covered": False, "error": str(e)}

async def send_booking_to_hrbank(booking_id: str) -> dict:
    """Send a confirmed booking to HR Bank for workforce management"""
    if not HRBANK_API_URL or not HRBANK_API_KEY:
        return {"success": False, "error": "HR Bank not configured"}
    
    try:
        # Fetch booking with customer and property details
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return {"success": False, "error": "Booking not found"}
        
        customer = await db.users.find_one({"_id": ObjectId(booking["customerId"])})
        property_doc = await db.properties.find_one({
            "customerId": booking["customerId"],
            "address": booking["address"]
        })
        
        # Prepare payload for HR Bank
        payload = {
            "_id": str(booking["_id"]),
            "serviceId": booking.get("serviceId"),
            "serviceType": booking.get("serviceType"),
            "address": booking.get("address"),
            "postalCode": booking.get("postalCode"),
            "squareFeet": booking.get("squareFeet"),
            "scheduledDate": booking["scheduledDate"].isoformat() if isinstance(booking["scheduledDate"], datetime) else booking["scheduledDate"],
            "isRecurring": booking.get("isRecurring", False),
            "recurringFrequency": booking.get("recurringFrequency"),
            "totalPrice": booking.get("totalPrice"),
            "notes": booking.get("notes"),
            "customerId": booking.get("customerId"),
            "franchiseeId": booking.get("franchiseeId"),
            "fsaCode": booking.get("fsaCode"),
            "status": booking.get("status"),
            "escrowStatus": booking.get("escrowStatus"),
            "createdAt": booking["createdAt"].isoformat() if isinstance(booking["createdAt"], datetime) else booking["createdAt"],
            "customer": {
                "name": customer.get("name") if customer else None,
                "phone": customer.get("phone") if customer else None,
                "email": customer.get("email") if customer else None
            },
            "property": {
                "apartmentNumber": property_doc.get("apartmentNumber") if property_doc else None,
                "buzzNumber": property_doc.get("buzzNumber") if property_doc else None,
                "notes": property_doc.get("notes") if property_doc else None
            } if property_doc else None
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{HRBANK_API_URL}/api/external/bookings",
                headers={
                    "X-API-Key": HRBANK_API_KEY,
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=15.0
            )
            result = response.json()
            
            if result.get("success"):
                # Store HR Bank task ID in Neatify
                await db.bookings.update_one(
                    {"_id": ObjectId(booking_id)},
                    {"$set": {
                        "hrbankTaskId": result.get("hrbank_task_id"),
                        "hrbankWorkplace": result.get("routed_to_workplace")
                    }}
                )
            
            return result
    except Exception as e:
        logging.error(f"HR Bank send booking failed: {e}")
        return {"success": False, "error": str(e)}

async def cancel_in_hrbank(neatify_booking_id: str, reason: str = "Customer cancelled") -> dict:
    """Cancel a booking in HR Bank"""
    if not HRBANK_API_URL or not HRBANK_API_KEY:
        return {"success": False, "error": "HR Bank not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{HRBANK_API_URL}/api/external/bookings/booking/{neatify_booking_id}",
                params={"reason": reason},
                headers={"X-API-Key": HRBANK_API_KEY},
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logging.error(f"HR Bank cancel failed: {e}")
        return {"success": False, "error": str(e)}

async def get_hrbank_status(neatify_booking_id: str) -> dict:
    """Get task status from HR Bank"""
    if not HRBANK_API_URL or not HRBANK_API_KEY:
        return {"success": False, "error": "HR Bank not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{HRBANK_API_URL}/api/external/bookings/booking/{neatify_booking_id}",
                headers={"X-API-Key": HRBANK_API_KEY},
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logging.error(f"HR Bank status check failed: {e}")
        return {"success": False, "error": str(e)}

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
    
    # Send welcome email
    try:
        from services.email_service import send_welcome_email
        send_welcome_email(user.email, user.name)
        logging.info(f"Welcome email sent to {user.email}")
    except Exception as e:
        logging.warning(f"Failed to send welcome email: {str(e)}")
    
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

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request a password reset email"""
    import secrets
    
    user = await db.users.find_one({"email": request.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, you will receive a password reset link"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.utcnow() + timedelta(hours=1)
    
    # Store reset token in database
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "resetToken": reset_token,
            "resetTokenExpires": reset_expires
        }}
    )
    
    # Send password reset email
    try:
        from services.email_service import send_password_reset_email
        send_password_reset_email(
            to_email=request.email,
            name=user.get("name", "User"),
            reset_token=reset_token
        )
        logging.info(f"Password reset email sent to {request.email}")
    except Exception as e:
        logging.warning(f"Failed to send password reset email: {str(e)}")
    
    return {"message": "If an account exists with this email, you will receive a password reset link"}

@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """Reset password using token from email"""
    
    # Find user with valid reset token
    user = await db.users.find_one({
        "resetToken": request.token,
        "resetTokenExpires": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password and clear reset token
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password": get_password_hash(request.new_password)},
            "$unset": {"resetToken": "", "resetTokenExpires": ""}
        }
    )
    
    # Send confirmation email
    try:
        from services.email_service import send_password_changed_email
        send_password_changed_email(
            to_email=user["email"],
            name=user.get("name", "User")
        )
    except Exception as e:
        logging.warning(f"Failed to send password changed email: {str(e)}")
    
    return {"message": "Password has been reset successfully"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.patch("/auth/profile")
async def update_profile(profile_update: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile including profile photo"""
    update_data = {k: v for k, v in profile_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # If photo is too large (> 500KB base64), reject it
    if "profilePhoto" in update_data:
        photo_size = len(update_data["profilePhoto"])
        if photo_size > 700000:  # ~500KB in base64
            raise HTTPException(status_code=400, detail="Photo too large. Please use a smaller image.")
    
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )
    
    # Fetch updated user (even if no changes, return current state)
    updated_user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    updated_user["_id"] = str(updated_user["_id"])
    del updated_user["password"]
    
    return updated_user

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

# QUOTE ROUTES (Legacy - kept for backward compatibility)
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

# ENHANCED QUOTE ROUTES (CleanUnits-based)
calculator = QuoteCalculator()

@api_router.post("/quotes/enhanced", response_model=EnhancedQuoteResponse)
async def calculate_enhanced_quote(quote_req: EnhancedQuoteRequest):
    """
    Enhanced quote calculator with CleanUnits system
    Supports residential and commercial with real-time pricing
    """
    try:
        quote = calculator.calculate_quote(quote_req)
        return quote
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quote calculation failed: {str(e)}")

@api_router.get("/quotes/addons")
async def get_available_addons():
    """Get list of available add-on services"""
    return {"addons": AVAILABLE_ADDONS}

# BOOKING ROUTES
@api_router.post("/bookings/check-conflict")
async def check_booking_conflict(data: dict, current_user: User = Depends(get_current_user)):
    """Check if there's a scheduling conflict for the customer"""
    scheduled_date_str = data.get("scheduledDate", "")
    recurring = data.get("recurring")
    
    if not scheduled_date_str:
        return {"hasConflict": False}
    
    try:
        scheduled_date = datetime.fromisoformat(scheduled_date_str.replace('Z', '+00:00'))
    except:
        return {"hasConflict": False}
    
    # Find existing bookings for this customer that might conflict
    # Check bookings within 3 hours of the requested time
    three_hours = timedelta(hours=3)
    start_window = scheduled_date - three_hours
    end_window = scheduled_date + three_hours
    
    existing_bookings = await db.bookings.find({
        "customerId": current_user.id,
        "status": {"$nin": ["cancelled", "completed"]},
        "scheduledDate": {
            "$gte": start_window,
            "$lte": end_window
        }
    }).to_list(length=10)
    
    if existing_bookings:
        conflict = existing_bookings[0]
        conflict_date = conflict.get("scheduledDate")
        return {
            "hasConflict": True,
            "conflictingBooking": {
                "date": conflict_date.strftime("%B %d, %Y") if conflict_date else "",
                "time": conflict_date.strftime("%I:%M %p") if conflict_date else "",
                "service": conflict.get("serviceName", "Cleaning")
            }
        }
    
    # For recurring bookings, check future occurrences
    if recurring and recurring in ['weekly', 'biweekly', 'monthly']:
        # Check the next 4 occurrences
        intervals = {'weekly': 7, 'biweekly': 14, 'monthly': 30}
        interval_days = intervals.get(recurring, 7)
        
        for i in range(1, 5):
            future_date = scheduled_date + timedelta(days=interval_days * i)
            future_start = future_date - three_hours
            future_end = future_date + three_hours
            
            future_conflicts = await db.bookings.find({
                "customerId": current_user.id,
                "status": {"$nin": ["cancelled", "completed"]},
                "scheduledDate": {
                    "$gte": future_start,
                    "$lte": future_end
                }
            }).to_list(length=1)
            
            if future_conflicts:
                conflict = future_conflicts[0]
                conflict_date = conflict.get("scheduledDate")
                return {
                    "hasConflict": True,
                    "conflictingBooking": {
                        "date": conflict_date.strftime("%B %d, %Y") if conflict_date else "",
                        "time": conflict_date.strftime("%I:%M %p") if conflict_date else "",
                        "service": conflict.get("serviceName", "Cleaning"),
                        "isRecurringConflict": True,
                        "occurrence": i
                    }
                }
    
    return {"hasConflict": False}

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: BookingCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create bookings")
    
    # Extract FSA code
    fsa_code = extract_fsa(booking.postalCode)
    
    # Find franchisee
    franchisee = await find_franchisee_by_fsa(fsa_code)
    
    # Get service name for email
    service = await db.services.find_one({"_id": ObjectId(booking.serviceId)})
    service_name = service["name"] if service else "Cleaning Service"
    
    booking_dict = booking.dict()
    booking_dict["customerId"] = current_user.id
    booking_dict["franchiseeId"] = str(franchisee["_id"]) if franchisee else None
    booking_dict["fsaCode"] = fsa_code
    booking_dict["status"] = "assigned" if franchisee else "pending"
    booking_dict["escrowStatus"] = "held"
    booking_dict["createdAt"] = datetime.utcnow()
    booking_dict["hrbankTaskId"] = None
    booking_dict["hrbankWorkplace"] = None
    
    result = await db.bookings.insert_one(booking_dict)
    booking_id = str(result.inserted_id)
    
    # Send booking to HR Bank for workforce management
    hrbank_result = await send_booking_to_hrbank(booking_id)
    if hrbank_result.get("success"):
        logging.info(f"Booking {booking_id} sent to HR Bank: {hrbank_result}")
    else:
        logging.warning(f"Failed to send booking to HR Bank: {hrbank_result}")
    
    # Parse scheduled date for notifications
    try:
        scheduled_dt = datetime.fromisoformat(booking.scheduledDate.replace('Z', '+00:00')) if isinstance(booking.scheduledDate, str) else booking.scheduledDate
        formatted_date = scheduled_dt.strftime("%B %d, %Y")
        formatted_time = scheduled_dt.strftime("%I:%M %p")
    except:
        formatted_date = str(booking.scheduledDate)
        formatted_time = ""
    
    # Send confirmation email to customer
    try:
        from services.email_service import send_booking_confirmation
        send_booking_confirmation(
            to_email=current_user.email,
            customer_name=current_user.name,
            booking_id=booking_id,
            service_name=service_name,
            address=booking.address,
            scheduled_date=formatted_date,
            scheduled_time=formatted_time,
            total_price=booking.totalPrice
        )
        logging.info(f"Confirmation email sent to {current_user.email}")
    except Exception as e:
        logging.warning(f"Failed to send confirmation email: {str(e)}")
    
    # Send confirmation SMS to customer
    try:
        from services.sms_service import send_booking_confirmation_sms
        if current_user.phone:
            send_booking_confirmation_sms(
                to_number=current_user.phone,
                customer_name=current_user.name,
                service_name=service_name,
                scheduled_date=formatted_date,
                scheduled_time=formatted_time
            )
            logging.info(f"Confirmation SMS sent to {current_user.phone}")
    except Exception as e:
        logging.warning(f"Failed to send confirmation SMS: {str(e)}")
    
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
    
    # Cancel in HR Bank first
    hrbank_result = await cancel_in_hrbank(booking_id, "Customer cancelled via Neatify")
    if hrbank_result.get("success"):
        logging.info(f"Booking {booking_id} cancelled in HR Bank")
    else:
        logging.warning(f"Failed to cancel in HR Bank: {hrbank_result}")
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Booking cancelled successfully"}

# HR BANK API ROUTES
@api_router.get("/hrbank/check-coverage/{postal_code}")
async def check_coverage(postal_code: str):
    """Check if HR Bank has coverage for a postal code"""
    result = await check_hrbank_coverage(postal_code)
    return result

@api_router.get("/hrbank/booking-status/{booking_id}")
async def get_booking_hrbank_status(booking_id: str, current_user: User = Depends(get_current_user)):
    """Get HR Bank status for a booking"""
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if current_user.role == "customer" and booking["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await get_hrbank_status(booking_id)
    return result

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

# PROPERTY MANAGEMENT ROUTES
@api_router.post("/properties", response_model=Property)
async def create_property(property_data: PropertyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create properties")
    
    fsa_code = extract_fsa(property_data.postalCode)
    
    property_dict = property_data.dict()
    property_dict["customerId"] = current_user.id
    property_dict["fsaCode"] = fsa_code
    property_dict["createdAt"] = datetime.utcnow()
    
    result = await db.properties.insert_one(property_dict)
    created_property = await db.properties.find_one({"_id": result.inserted_id})
    created_property["_id"] = str(created_property["_id"])
    
    return Property(**created_property)

@api_router.get("/properties", response_model=List[Property])
async def get_properties(current_user: User = Depends(get_current_user)):
    """Get all properties for the current user."""
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can view properties")
    
    properties = await db.properties.find({"customerId": current_user.id}).to_list(100)
    for prop in properties:
        prop["_id"] = str(prop["_id"])
    return [Property(**prop) for prop in properties]

@api_router.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: str, current_user: User = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_doc["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    property_doc["_id"] = str(property_doc["_id"])
    return Property(**property_doc)

@api_router.put("/properties/{property_id}", response_model=Property)
async def update_property(
    property_id: str,
    property_data: PropertyCreate,
    current_user: User = Depends(get_current_user)
):
    property_doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_doc["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    fsa_code = extract_fsa(property_data.postalCode)
    update_dict = property_data.dict()
    update_dict["fsaCode"] = fsa_code
    
    await db.properties.update_one(
        {"_id": ObjectId(property_id)},
        {"$set": update_dict}
    )
    
    updated_property = await db.properties.find_one({"_id": ObjectId(property_id)})
    updated_property["_id"] = str(updated_property["_id"])
    
    return Property(**updated_property)

@api_router.patch("/properties/{property_id}", response_model=Property)
async def patch_property(
    property_id: str,
    property_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Partially update a property"""
    property_doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_doc["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Extract FSA if postal code is updated
    if "postalCode" in property_data:
        property_data["fsaCode"] = extract_fsa(property_data["postalCode"])
    
    await db.properties.update_one(
        {"_id": ObjectId(property_id)},
        {"$set": property_data}
    )
    
    updated_property = await db.properties.find_one({"_id": ObjectId(property_id)})
    updated_property["_id"] = str(updated_property["_id"])
    
    return Property(**updated_property)

@api_router.post("/properties/validate-address")
async def validate_address(data: dict):
    """Validate an address using postal code format and coverage check"""
    address = data.get("address", "")
    postal_code = data.get("postalCode", "")
    
    # Validate postal code format (Canadian)
    import re
    postal_regex = r'^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$'
    if not re.match(postal_regex, postal_code):
        return {
            "valid": False,
            "message": "Invalid postal code format. Use Canadian format (e.g., M5V 3A8)"
        }
    
    # Extract FSA and check if we have coverage
    fsa_code = extract_fsa(postal_code)
    franchisee = await find_franchisee_by_fsa(fsa_code)
    
    # Format postal code consistently
    formatted_postal = postal_code.upper().replace(" ", "")
    if len(formatted_postal) == 6:
        formatted_postal = f"{formatted_postal[:3]} {formatted_postal[3:]}"
    
    return {
        "valid": True,
        "fsa": fsa_code,
        "hasCoverage": franchisee is not None,
        "formattedPostalCode": formatted_postal,
        "message": "Address validated" if franchisee else f"Note: No service coverage in {fsa_code} yet"
    }

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: User = Depends(get_current_user)):
    """Delete a property - only if no active bookings"""
    property_doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_doc["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if property has active bookings (by matching address)
    active_bookings = await db.bookings.count_documents({
        "customerId": current_user.id,
        "address": {"$regex": f"^{property_doc['address']}", "$options": "i"},
        "status": {"$in": ["pending", "assigned", "in-progress"]}
    })
    
    if active_bookings > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete property with {active_bookings} active booking(s). Complete or cancel them first."
        )
    
    # Hard delete
    await db.properties.delete_one({"_id": ObjectId(property_id)})
    return {"message": "Property deleted successfully"}

@api_router.get("/properties/{property_id}/bookings-count")
async def get_property_bookings_count(property_id: str, current_user: User = Depends(get_current_user)):
    """Get count of active bookings for a property"""
    property_doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_doc["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count active bookings by matching address
    active_count = await db.bookings.count_documents({
        "customerId": current_user.id,
        "address": {"$regex": f"^{property_doc['address']}", "$options": "i"},
        "status": {"$in": ["pending", "assigned", "in-progress"]}
    })
    
    completed_count = await db.bookings.count_documents({
        "customerId": current_user.id,
        "address": {"$regex": f"^{property_doc['address']}", "$options": "i"},
        "status": "completed"
    })
    
    return {
        "propertyId": property_id,
        "activeBookings": active_count,
        "completedBookings": completed_count,
        "canDeactivate": active_count == 0
    }

# TASK MANAGEMENT ROUTES
@api_router.get("/bookings/{booking_id}/tasks", response_model=List[Task])
async def get_booking_tasks(booking_id: str, current_user: User = Depends(get_current_user)):
    # Verify booking access
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check permissions
    if current_user.role == "customer" and booking["customerId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role in ["franchisee", "workforce"]:
        if current_user.role == "franchisee" and booking.get("franchiseeId") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role == "workforce" and booking.get("franchiseeId") != current_user.franchiseeId:
            raise HTTPException(status_code=403, detail="Access denied")
    
    tasks = await db.tasks.find({"bookingId": booking_id}).to_list(100)
    for task in tasks:
        task["_id"] = str(task["_id"])
    return [Task(**task) for task in tasks]

@api_router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["workforce", "franchisee"]:
        raise HTTPException(status_code=403, detail="Only workforce can update tasks")
    
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {
        "isCompleted": task_update.isCompleted,
        "notes": task_update.notes
    }
    
    if task_update.isCompleted:
        update_data["completedBy"] = current_user.id
        update_data["completedAt"] = datetime.utcnow()
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    updated_task["_id"] = str(updated_task["_id"])
    
    return Task(**updated_task)

# WORKFORCE ROUTES
@api_router.get("/workforce/jobs")
async def get_workforce_jobs(current_user: User = Depends(get_current_user)):
    if current_user.role != "workforce":
        raise HTTPException(status_code=403, detail="Workforce access required")
    
    # Get jobs assigned to workforce's franchisee
    jobs = await db.bookings.find({
        "franchiseeId": current_user.franchiseeId,
        "status": {"$in": ["assigned", "in-progress"]}
    }).sort("scheduledDate", 1).to_list(100)
    
    for job in jobs:
        job["_id"] = str(job["_id"])
    
    return jobs

# Import and include new CleanGrid routes BEFORE including api_router in app
from routes.franchisee import router as franchisee_router
from routes.webhooks import router as webhooks_router
from routes.admin import router as admin_router
from routes.payments import router as payments_router

api_router.include_router(franchisee_router)
api_router.include_router(webhooks_router)
api_router.include_router(admin_router)
api_router.include_router(payments_router)

# Include the router in the main app
app.include_router(api_router)

# Store db reference in app state for route access
@app.on_event("startup")
async def startup_db_client():
    app.state.db = db

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
