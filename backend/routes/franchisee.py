"""Franchisee Routes for CleanGrid"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from jose import JWTError, jwt
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/franchisee", tags=["Franchisee"])

# Security
security = HTTPBearer()
SECRET_KEY = os.environ.get("SECRET_KEY", "neatify-secret-key-change-in-production")
ALGORITHM = "HS256"

async def get_current_user_from_token(credentials: HTTPAuthorizationCredentials, db):
    """Extract and verify user from JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ==================== APPLICATION ENDPOINTS ====================

@router.post("/apply", response_model=Dict)
async def submit_application(application_data: dict, request: Request):
    """
    Submit a franchisee application.
    This is a public endpoint - no auth required.
    """
    db = request.app.state.db
    
    # Validate required fields
    required_fields = [
        "legalName", "legalType", "operatingName", "contactName",
        "email", "phone", "address", "city", "province", "postalCode"
    ]
    
    for field in required_fields:
        if not application_data.get(field):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}"
            )
    
    # Check if email already has an application
    existing = await db.franchisees.find_one({"email": application_data["email"]})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An application with this email already exists"
        )
    
    # Create franchisee record
    franchisee_doc = {
        "_id": ObjectId(),
        "ownerId": None,  # Will be set when user account is created
        
        # Business Info
        "legalName": application_data["legalName"],
        "legalType": application_data["legalType"],
        "operatingName": application_data["operatingName"],
        "businessNumber": application_data.get("businessNumber"),
        "taxNumber": application_data.get("taxNumber"),
        
        # Contact
        "contactName": application_data["contactName"],
        "email": application_data["email"],
        "phone": application_data["phone"],
        "address": application_data["address"],
        "city": application_data["city"],
        "province": application_data["province"],
        "postalCode": application_data["postalCode"],
        
        # Preferences
        "preferredFSAs": application_data.get("preferredFSAs", []),
        "vehicleAccess": application_data.get("vehicleAccess", False),
        "experience": application_data.get("experience"),
        
        # Agreements
        "agreesToHRBank": application_data.get("agreesToHRBank", False),
        "agreesToInsuranceMinimums": application_data.get("agreesToInsuranceMinimums", False),
        
        # Status
        "status": "submitted",
        "assignedFSAs": [],
        
        # Payment (to be configured)
        "stripeConnectAccountId": None,
        "payoutSchedule": "weekly",
        "reservePercentage": 10.0,
        "perJobFeeTier": "standard",
        
        # HR Bank (to be configured)
        "hrbankEmployerId": None,
        "hrbankApiKey": None,
        
        # KPIs (default values)
        "kpiScore": 100.0,
        "acceptanceRate": 100.0,
        "completionRate": 100.0,
        "avgRating": 5.0,
        
        # Timestamps
        "applicationSubmittedAt": datetime.utcnow(),
        "createdAt": datetime.utcnow()
    }
    
    await db.franchisees.insert_one(franchisee_doc)
    
    # Create audit log
    await db.audit_logs.insert_one({
        "_id": ObjectId(),
        "actorId": "public",
        "actorRole": "applicant",
        "action": "franchisee_application_submitted",
        "resourceType": "franchisee",
        "resourceId": str(franchisee_doc["_id"]),
        "changes": {"status": "submitted"},
        "createdAt": datetime.utcnow()
    })
    
    return {
        "success": True,
        "data": {
            "application_id": str(franchisee_doc["_id"]),
            "status": "submitted"
        },
        "message": "Application submitted successfully. You will be contacted within 5 business days."
    }


@router.get("/application/{application_id}", response_model=Dict)
async def get_application_status(application_id: str, request: Request):
    """Get application status (public with application ID)"""
    db = request.app.state.db
    
    franchisee = await db.franchisees.find_one({"_id": ObjectId(application_id)})
    if not franchisee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return {
        "success": True,
        "data": {
            "application_id": str(franchisee["_id"]),
            "operating_name": franchisee.get("operatingName"),
            "status": franchisee.get("status"),
            "submitted_at": franchisee.get("applicationSubmittedAt"),
            "assigned_fsas": franchisee.get("assignedFSAs", [])
        }
    }


# ==================== AUTHENTICATED FRANCHISEE ENDPOINTS ====================

@router.get("/dashboard", response_model=Dict)
async def get_dashboard(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get franchisee dashboard with KPIs and territory info.
    Requires authenticated franchisee_owner.
    """
    db = request.app.state.db
    
    # Get user from token
    user = await get_current_user_from_token(credentials, db)
    
    # Get franchisee - try by ownerId first, then by email
    franchisee = await db.franchisees.find_one({"ownerId": str(user["_id"])})
    if not franchisee:
        # Try to find by email (for users who applied before account linking)
        franchisee = await db.franchisees.find_one({"email": user.get("email")})
    
    if not franchisee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Franchisee profile not found"
        )
    
    # Get territory info
    territories = await db.territories.find({
        "currentFranchiseeId": str(franchisee["_id"])
    }).to_list(100)
    
    # Get job stats
    now = datetime.utcnow()
    start_of_week = now - timedelta(days=now.weekday())
    
    jobs_this_week = await db.jobs.count_documents({
        "franchiseeId": str(franchisee["_id"]),
        "createdAt": {"$gte": start_of_week}
    })
    
    pending_jobs = await db.jobs.count_documents({
        "franchiseeId": str(franchisee["_id"]),
        "status": {"$in": ["pending_assignment", "assigned"]}
    })
    
    completed_jobs = await db.jobs.count_documents({
        "franchiseeId": str(franchisee["_id"]),
        "status": "qa_approved"
    })
    
    # Get compliance status
    compliance_docs = await db.compliance_documents.find({
        "franchiseeId": str(franchisee["_id"])
    }).to_list(10)
    
    compliance_status = {
        "cgl_insurance": "missing",
        "auto_insurance": "missing",
        "wsib": "missing"
    }
    
    for doc in compliance_docs:
        doc_type = doc.get("docType")
        if doc.get("status") == "verified":
            if doc.get("expiresAt") and doc["expiresAt"] < now:
                compliance_status[doc_type] = "expired"
            else:
                compliance_status[doc_type] = "verified"
        elif doc.get("status") == "pending":
            compliance_status[doc_type] = "pending"
    
    return {
        "success": True,
        "data": {
            "franchisee": {
                "id": str(franchisee["_id"]),
                "operating_name": franchisee.get("operatingName"),
                "status": franchisee.get("status")
            },
            "kpis": {
                "score": franchisee.get("kpiScore", 100),
                "acceptance_rate": franchisee.get("acceptanceRate", 100),
                "completion_rate": franchisee.get("completionRate", 100),
                "avg_rating": franchisee.get("avgRating", 5.0)
            },
            "territories": [{
                "fsa_code": t.get("fsaCode"),
                "city": t.get("city"),
                "protection_status": t.get("protectionStatus")
            } for t in territories],
            "stats": {
                "jobs_this_week": jobs_this_week,
                "pending_jobs": pending_jobs,
                "completed_jobs": completed_jobs
            },
            "compliance": compliance_status,
            "hrbank_configured": bool(franchisee.get("hrbankEmployerId"))
        }
    }


@router.get("/jobs", response_model=Dict)
async def get_jobs(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security), status_filter: Optional[str] = None, limit: int = 50):
    """Get franchisee's jobs"""
    db = request.app.state.db
    user = await get_current_user_from_token(credentials, db)
    
    franchisee = await db.franchisees.find_one({"ownerId": str(user["_id"])})
    if not franchisee:
        franchisee = await db.franchisees.find_one({"email": user.get("email")})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    query = {"franchiseeId": str(franchisee["_id"])}
    if status_filter:
        query["status"] = status_filter
    
    jobs = await db.jobs.find(query).sort("scheduledDate", 1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "jobs": [{
                "id": str(j["_id"]),
                "booking_id": j.get("bookingId"),
                "customer_name": j.get("customerName"),
                "service_name": j.get("serviceName"),
                "address": j.get("address"),
                "fsa_code": j.get("fsaCode"),
                "scheduled_date": j.get("scheduledDate"),
                "time_window": f"{j.get('timeWindowStart', '')} - {j.get('timeWindowEnd', '')}",
                "status": j.get("status"),
                "gross_amount": j.get("grossAmount"),
                "net_to_franchisee": j.get("netToFranchisee")
            } for j in jobs]
        }
    }


@router.post("/jobs/{job_id}/accept", response_model=Dict)
async def accept_job(job_id: str, request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Accept a job - triggers work order creation to HR Bank"""
    db = request.app.state.db
    user = await get_current_user_from_token(credentials, db)
    
    franchisee = await db.franchisees.find_one({"ownerId": str(user["_id"])})
    if not franchisee:
        franchisee = await db.franchisees.find_one({"email": user.get("email")})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    job = await db.jobs.find_one({
        "_id": ObjectId(job_id),
        "franchiseeId": str(franchisee["_id"])
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.get("status") not in ["pending_assignment", "assigned"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept job with status: {job.get('status')}"
        )
    
    # Update job status
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$set": {
                "status": "accepted",
                "acceptedAt": datetime.utcnow()
            }
        }
    )
    
    # Create work order to HR Bank
    from utils.hrbank_webhook import get_hrbank_service
    hrbank = get_hrbank_service(db)
    work_order_result = await hrbank.create_work_order(job_id)
    
    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "accepted",
            "work_order_sent": work_order_result.get("success", False),
            "work_order_details": work_order_result
        },
        "message": "Job accepted and sent to HR Bank for scheduling"
    }


@router.post("/jobs/{job_id}/decline", response_model=Dict)
async def decline_job(job_id: str, request: Request, credentials: HTTPAuthorizationCredentials = Depends(security), reason: Optional[str] = None):
    """Decline a job - will be re-routed to another franchisee"""
    db = request.app.state.db
    user = await get_current_user_from_token(credentials, db)
    
    franchisee = await db.franchisees.find_one({"ownerId": str(user["_id"])})
    if not franchisee:
        franchisee = await db.franchisees.find_one({"email": user.get("email")})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    job = await db.jobs.find_one({
        "_id": ObjectId(job_id),
        "franchiseeId": str(franchisee["_id"])
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update job for re-routing
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$set": {
                "status": "pending_assignment",
                "franchiseeId": None,
                "declinedBy": str(franchisee["_id"]),
                "declineReason": reason,
                "declinedAt": datetime.utcnow()
            }
        }
    )
    
    # Update franchisee KPI (affects acceptance rate)
    # This would trigger KPI recalculation in a real system
    
    return {
        "success": True,
        "data": {"job_id": job_id, "status": "pending_assignment"},
        "message": "Job declined and will be re-routed"
    }


@router.get("/settlements", response_model=Dict)
async def get_settlements(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security), limit: int = 10):
    """Get franchisee settlement statements"""
    db = request.app.state.db
    user = await get_current_user_from_token(credentials, db)
    
    franchisee = await db.franchisees.find_one({"ownerId": str(user["_id"])})
    if not franchisee:
        franchisee = await db.franchisees.find_one({"email": user.get("email")})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    settlements = await db.settlement_statements.find({
        "franchiseeId": str(franchisee["_id"])
    }).sort("periodEnd", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "settlements": [{
                "id": str(s["_id"]),
                "period_start": s.get("periodStart"),
                "period_end": s.get("periodEnd"),
                "job_count": s.get("jobCount", 0),
                "gross_revenue": s.get("grossRevenue", 0),
                "platform_fees": s.get("platformFees", 0),
                "adjustments_total": s.get("adjustmentsTotal", 0),
                "net_payout": s.get("netPayout", 0),
                "payout_status": s.get("payoutStatus", "pending"),
                "paid_at": s.get("paidAt")
            } for s in settlements]
        }
    }


@router.get("/compliance", response_model=Dict)
async def get_compliance_documents(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get compliance document status"""
    db = request.app.state.db
    user = await get_current_user_from_token(credentials, db)
    
    franchisee = await db.franchisees.find_one({"ownerId": str(user["_id"])})
    if not franchisee:
        franchisee = await db.franchisees.find_one({"email": user.get("email")})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    docs = await db.compliance_documents.find({
        "franchiseeId": str(franchisee["_id"])
    }).to_list(20)
    
    return {
        "success": True,
        "data": {
            "documents": [{
                "id": str(d["_id"]),
                "doc_type": d.get("docType"),
                "file_name": d.get("fileName"),
                "status": d.get("status"),
                "expires_at": d.get("expiresAt"),
                "uploaded_at": d.get("uploadedAt")
            } for d in docs],
            "required_documents": [
                {"type": "cgl_insurance", "name": "Commercial General Liability Insurance", "min_coverage": "$2,000,000"},
                {"type": "auto_insurance", "name": "Commercial Auto Insurance", "required_if": "vehicle_access"},
                {"type": "wsib", "name": "WSIB Coverage", "required_in": ["ON"]}
            ]
        }
    }


@router.patch("/hrbank/configure", response_model=Dict)
async def configure_hrbank(request: Request, config_data: dict):
    """Configure HR Bank integration for franchisee"""
    db = request.app.state.db
    user = getattr(request.state, 'current_user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    franchisee = await db.franchisees.find_one({"ownerId": user.get("_id") or user.get("id")})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    update_data = {}
    
    if "hrbank_employer_id" in config_data:
        update_data["hrbankEmployerId"] = config_data["hrbank_employer_id"]
    
    if "hrbank_api_key" in config_data:
        update_data["hrbankApiKey"] = config_data["hrbank_api_key"]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No configuration provided")
    
    await db.franchisees.update_one(
        {"_id": franchisee["_id"]},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "HR Bank configuration updated"
    }
