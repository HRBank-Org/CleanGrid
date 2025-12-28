"""CleanGrid Database Models and Pydantic Schemas"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
import uuid

# ==================== ENUMS ====================

class UserRole(str, Enum):
    CUSTOMER = "customer"
    FRANCHISEE_OWNER = "franchisee_owner"
    FRANCHISEE_STAFF = "franchisee_staff"
    ADMIN = "admin"
    SUPPORT = "support"
    WORKFORCE = "workforce"  # Legacy support

class FranchiseeStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    ACTIVATED = "activated"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"

class ComplianceDocType(str, Enum):
    CGL_INSURANCE = "cgl_insurance"
    AUTO_INSURANCE = "auto_insurance"
    WSIB = "wsib"

class ComplianceDocStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"
    REJECTED = "rejected"

class TerritoryProtectionStatus(str, Enum):
    PROTECTED = "protected"
    PROBATION = "probation"
    OVERFLOW = "overflow"
    UNASSIGNED = "unassigned"

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

class JobStatus(str, Enum):
    PENDING_ASSIGNMENT = "pending_assignment"
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    SCHEDULED = "scheduled"
    EN_ROUTE = "en_route"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    QA_SUBMITTED = "qa_submitted"
    QA_APPROVED = "qa_approved"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"

class WorkOrderStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    ACKNOWLEDGED = "acknowledged"
    FAILED = "failed"

class PayoutStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"

# ==================== BASE MODELS ====================

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
    def __get_pydantic_json_schema__(cls, schema):
        schema.update(type="string")
        return schema

# ==================== USER MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: str
    role: UserRole = UserRole.CUSTOMER

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
    status: str = "active"
    franchiseeId: Optional[str] = None  # For franchisee_owner/staff
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# ==================== CUSTOMER PROFILE ====================

class AddressEntry(BaseModel):
    label: str  # "Home", "Office"
    street: str
    unit: Optional[str] = None
    city: str
    province: str
    postalCode: str
    fsaCode: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    buzzCode: Optional[str] = None
    accessNotes: Optional[str] = None

class CustomerProfile(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    addresses: List[AddressEntry] = []
    defaultAddressIndex: int = 0
    stripeCustomerId: Optional[str] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== FRANCHISEE MODELS ====================

class FranchiseeApplication(BaseModel):
    # Business Info
    legalName: str
    legalType: str  # "individual", "corporation"
    operatingName: str
    businessNumber: Optional[str] = None
    
    # Contact
    contactName: str
    email: EmailStr
    phone: str
    address: str
    city: str
    province: str
    postalCode: str
    
    # Preferences
    preferredFSAs: List[str] = []
    vehicleAccess: bool = False
    experience: Optional[str] = None
    
    # Agreements
    agreesToHRBank: bool = False
    agreesToInsuranceMinimums: bool = False

class Franchisee(BaseModel):
    id: str = Field(alias="_id")
    ownerId: str  # User ID of franchisee_owner
    operatingName: str
    legalName: str
    legalType: str
    businessNumber: Optional[str] = None
    
    # Contact
    address: str
    city: str
    province: str
    postalCode: str
    phone: str
    email: str
    
    # Status
    status: FranchiseeStatus = FranchiseeStatus.DRAFT
    
    # Payment
    stripeConnectAccountId: Optional[str] = None
    payoutSchedule: str = "weekly"  # weekly, biweekly
    reservePercentage: float = 10.0
    perJobFeeTier: str = "standard"  # standard, premium
    
    # HR Bank Integration
    hrbankEmployerId: Optional[str] = None
    hrbankApiKey: Optional[str] = None
    hrbankWebhookSecret: Optional[str] = None
    
    # Territories
    assignedFSAs: List[str] = []
    
    # KPIs
    kpiScore: float = 100.0
    acceptanceRate: float = 100.0
    completionRate: float = 100.0
    avgRating: float = 5.0
    
    # Timestamps
    applicationSubmittedAt: Optional[datetime] = None
    approvedAt: Optional[datetime] = None
    activatedAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class ComplianceDocument(BaseModel):
    id: str = Field(alias="_id")
    franchiseeId: str
    docType: ComplianceDocType
    fileName: str
    fileUrl: str
    expiresAt: Optional[datetime] = None
    status: ComplianceDocStatus = ComplianceDocStatus.PENDING
    verifiedAt: Optional[datetime] = None
    verifiedBy: Optional[str] = None
    notes: Optional[str] = None
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== TERRITORY MODELS ====================

class TerritoryFSA(BaseModel):
    id: str = Field(alias="_id")
    fsaCode: str  # e.g., "M5V"
    city: str
    province: str
    isActive: bool = True
    currentFranchiseeId: Optional[str] = None
    assignedAt: Optional[datetime] = None
    protectionStatus: TerritoryProtectionStatus = TerritoryProtectionStatus.UNASSIGNED
    
    # KPI Thresholds
    kpiThresholds: Dict[str, float] = {
        "acceptanceRate": 80.0,
        "completionRate": 95.0,
        "ratingMin": 4.0
    }
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== SERVICE MODELS ====================

class Service(BaseModel):
    id: str = Field(alias="_id")
    name: str
    category: str  # deep-clean, regular, move-in-out, commercial
    serviceType: str  # residential, commercial
    description: str
    basePrice: float
    pricePerSqFt: float = 0.0
    durationMinutes: int
    checklistTemplateId: Optional[str] = None
    photoRequirements: List[str] = []
    isActive: bool = True
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class AddOn(BaseModel):
    id: str = Field(alias="_id")
    serviceId: Optional[str] = None
    name: str
    price: float
    description: str
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== BOOKING MODELS ====================

class BookingCreate(BaseModel):
    serviceId: str
    address: str
    unit: Optional[str] = None
    city: str
    province: str
    postalCode: str
    scheduledDate: datetime
    timeWindowStart: str  # "09:00"
    timeWindowEnd: str    # "12:00"
    addOns: List[str] = []
    squareFeet: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    notes: Optional[str] = None
    photos: List[str] = []
    accessNotes: Optional[str] = None
    buzzCode: Optional[str] = None

class Booking(BaseModel):
    id: str = Field(alias="_id")
    customerId: str
    serviceId: str
    serviceName: str
    
    # Location
    address: str
    unit: Optional[str] = None
    city: str
    province: str
    postalCode: str
    fsaCode: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    buzzCode: Optional[str] = None
    accessNotes: Optional[str] = None
    
    # Schedule
    scheduledDate: datetime
    timeWindowStart: str
    timeWindowEnd: str
    
    # Details
    addOns: List[str] = []
    squareFeet: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    notes: Optional[str] = None
    photos: List[str] = []
    
    # Pricing
    basePrice: float
    addOnsPrice: float = 0.0
    totalPrice: float
    
    # Payment
    stripePaymentIntentId: Optional[str] = None
    paymentStatus: str = "pending"  # pending, captured, failed, refunded
    
    # Status
    status: BookingStatus = BookingStatus.PENDING
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    confirmedAt: Optional[datetime] = None
    cancelledAt: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== JOB MODELS ====================

class Job(BaseModel):
    id: str = Field(alias="_id")
    bookingId: str
    franchiseeId: Optional[str] = None
    workOrderId: Optional[str] = None
    
    # Copied from booking for quick access
    customerId: str
    customerName: str
    customerPhone: str
    customerEmail: str
    
    serviceName: str
    address: str
    fsaCode: str
    scheduledDate: datetime
    timeWindowStart: str
    timeWindowEnd: str
    
    # Pricing
    grossAmount: float
    platformFee: float
    netToFranchisee: float
    
    # Status
    status: JobStatus = JobStatus.PENDING_ASSIGNMENT
    
    # Timestamps
    assignedAt: Optional[datetime] = None
    acceptedAt: Optional[datetime] = None
    acceptanceSLADeadline: Optional[datetime] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    
    # QA
    beforePhotos: List[str] = []
    afterPhotos: List[str] = []
    checklistResults: List[Dict[str, Any]] = []
    qaSubmittedAt: Optional[datetime] = None
    qaApprovedAt: Optional[datetime] = None
    
    # Customer Feedback
    customerRating: Optional[int] = None
    customerReview: Optional[str] = None
    
    # Notes
    franchiseeNotes: Optional[str] = None
    adminNotes: Optional[str] = None
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== WORK ORDER MODELS ====================

class WorkOrderPayload(BaseModel):
    """Payload sent to HR Bank"""
    cleangrid_job_id: str
    franchisee_id: str
    hrbank_employer_id: str
    
    service: Dict[str, Any]
    customer: Dict[str, Any]
    location: Dict[str, Any]
    schedule: Dict[str, Any]
    checklist: List[Dict[str, Any]]
    photo_requirements: List[Dict[str, Any]]
    pricing: Dict[str, Any]
    notes: Optional[str] = None

class WorkOrder(BaseModel):
    id: str = Field(alias="_id")
    jobId: str
    franchiseeId: str
    hrbankWorkOrderId: Optional[str] = None
    idempotencyKey: str
    
    payload: Dict[str, Any]
    callbackUrl: str
    
    status: WorkOrderStatus = WorkOrderStatus.PENDING
    sentAt: Optional[datetime] = None
    acknowledgedAt: Optional[datetime] = None
    
    retryCount: int = 0
    lastError: Optional[str] = None
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== SETTLEMENT MODELS ====================

class SettlementAdjustment(BaseModel):
    type: str  # refund, chargeback, credit, penalty
    amount: float
    description: str
    jobId: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class SettlementStatement(BaseModel):
    id: str = Field(alias="_id")
    franchiseeId: str
    periodStart: datetime
    periodEnd: datetime
    
    # Totals
    jobCount: int = 0
    grossRevenue: float = 0.0
    platformFees: float = 0.0
    marketingFund: float = 0.0
    processingFees: float = 0.0
    adjustments: List[SettlementAdjustment] = []
    adjustmentsTotal: float = 0.0
    reserveHoldback: float = 0.0
    netPayout: float = 0.0
    
    # Payout
    payoutStatus: PayoutStatus = PayoutStatus.PENDING
    stripeTransferId: Optional[str] = None
    paidAt: Optional[datetime] = None
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== SUPPORT MODELS ====================

class SupportTicketMessage(BaseModel):
    senderId: str
    senderRole: str
    text: str
    attachments: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class SupportTicket(BaseModel):
    id: str = Field(alias="_id")
    reporterId: str
    reporterType: str  # customer, franchisee
    subject: str
    description: str
    relatedJobId: Optional[str] = None
    relatedBookingId: Optional[str] = None
    
    status: str = "open"  # open, in_progress, resolved, closed
    priority: str = "normal"  # low, normal, high, urgent
    assignedTo: Optional[str] = None
    
    messages: List[SupportTicketMessage] = []
    
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    resolvedAt: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== NOTIFICATION MODELS ====================

class Notification(BaseModel):
    id: str = Field(alias="_id")
    userId: str
    type: str
    title: str
    body: str
    data: Dict[str, Any] = {}
    read: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== AUDIT LOG ====================

class AuditLog(BaseModel):
    id: str = Field(alias="_id")
    actorId: str
    actorRole: str
    action: str
    resourceType: str
    resourceId: str
    changes: Dict[str, Any] = {}
    ipAddress: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ==================== HELPER FUNCTIONS ====================

def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix"""
    unique = uuid.uuid4().hex[:12]
    return f"{prefix}_{unique}" if prefix else unique

def extract_fsa(postal_code: str) -> str:
    """Extract FSA (first 3 chars) from postal code"""
    return postal_code.replace(" ", "").upper()[:3]
