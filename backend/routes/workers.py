"""
CleanGrid Worker/Janitor Management
Handles worker accounts, invitations, and franchisee-worker relationships
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import os

router = APIRouter(prefix="/workers", tags=["workers"])

# Database reference (initialized from main server)
db = None

def init_db(database):
    global db
    db = database


# ==================== MODELS ====================

class WorkerInvite(BaseModel):
    """Invitation to join as a worker"""
    email: EmailStr
    name: str
    phone: Optional[str] = None


class WorkerInviteResponse(BaseModel):
    inviteId: str
    email: str
    inviteCode: str
    expiresAt: datetime


class AcceptInviteRequest(BaseModel):
    inviteCode: str
    password: str
    phone: Optional[str] = None


class WorkerProfile(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str]
    role: str
    franchiseeId: str
    franchiseeName: Optional[str]
    profilePhoto: Optional[str]
    status: str  # 'pending-training', 'active', 'inactive', 'suspended'
    hrbankWorkerId: Optional[str]  # Link to HR Bank worker account
    trainingStatus: dict
    createdAt: datetime


class WorkerStatusUpdate(BaseModel):
    status: str  # 'active', 'inactive', 'suspended'
    reason: Optional[str] = None


class LinkHRBankRequest(BaseModel):
    hrbankWorkerId: str


# ==================== HELPER FUNCTIONS ====================

async def get_current_user_from_token(token: str):
    """Helper to get user from token - imported from main server"""
    from server import get_current_user, oauth2_scheme
    # This will be called with proper dependency injection
    pass


async def check_worker_training_status(worker_id: str) -> dict:
    """Check if worker has completed all required training"""
    # Get all mandatory training courses
    required_courses = await db.training_courses.find({
        "isActive": True,
        "$or": [
            {"requiredForServices": {"$size": 0}},
            {"requiredForServices": {"$exists": False}}
        ]
    }).to_list(100)
    
    # Get worker's credentials
    credentials = await db.worker_credentials.find({
        "workerId": worker_id,
        "isValid": True
    }).to_list(100)
    
    # Filter valid (non-expired) credentials
    valid_credential_course_ids = []
    for cred in credentials:
        if cred.get("expiresAt") is None or cred["expiresAt"] > datetime.utcnow():
            if cred.get("courseId"):
                valid_credential_course_ids.append(cred["courseId"])
    
    # Check completion
    completed = []
    missing = []
    for course in required_courses:
        course_id = str(course["_id"])
        if course_id in valid_credential_course_ids:
            completed.append(course["name"])
        else:
            missing.append(course["name"])
    
    total = len(required_courses)
    completed_count = len(completed)
    
    return {
        "totalRequired": total,
        "completed": completed_count,
        "completedCourses": completed,
        "missingCourses": missing,
        "isFullyTrained": completed_count >= total,
        "percentComplete": int((completed_count / total) * 100) if total > 0 else 100
    }


# ==================== FRANCHISEE ENDPOINTS ====================

@router.post("/invite")
async def invite_worker(invite: WorkerInvite, franchisee_id: str):
    """
    Franchisee invites a worker to join CleanGrid.
    Sends an invitation email with a unique code.
    """
    # Check if worker already exists
    existing = await db.users.find_one({"email": invite.email})
    if existing:
        if existing.get("role") == "worker":
            raise HTTPException(status_code=400, detail="This email is already registered as a worker")
        else:
            raise HTTPException(status_code=400, detail="This email is already registered with a different role")
    
    # Check for existing pending invite
    existing_invite = await db.worker_invites.find_one({
        "email": invite.email,
        "status": "pending",
        "expiresAt": {"$gt": datetime.utcnow()}
    })
    if existing_invite:
        raise HTTPException(status_code=400, detail="An invitation is already pending for this email")
    
    # Get franchisee info
    franchisee = await db.users.find_one({"_id": ObjectId(franchisee_id)})
    if not franchisee or franchisee.get("role") != "franchisee":
        raise HTTPException(status_code=403, detail="Only franchisees can invite workers")
    
    # Generate invite code
    invite_code = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)  # 7 day expiry
    
    # Save invitation
    invite_doc = {
        "email": invite.email,
        "name": invite.name,
        "phone": invite.phone,
        "franchiseeId": franchisee_id,
        "franchiseeName": franchisee.get("name"),
        "inviteCode": invite_code,
        "status": "pending",
        "createdAt": datetime.utcnow(),
        "expiresAt": expires_at
    }
    
    result = await db.worker_invites.insert_one(invite_doc)
    
    # Send invitation email
    try:
        from services.email_service import send_worker_invite_email
        send_worker_invite_email(
            to_email=invite.email,
            worker_name=invite.name,
            franchisee_name=franchisee.get("name"),
            invite_code=invite_code
        )
    except Exception as e:
        print(f"Failed to send invite email: {e}")
    
    return {
        "success": True,
        "inviteId": str(result.inserted_id),
        "email": invite.email,
        "inviteCode": invite_code,
        "expiresAt": expires_at,
        "message": f"Invitation sent to {invite.email}"
    }


@router.get("/team")
async def get_franchisee_workers(franchisee_id: str):
    """Get all workers for a franchisee"""
    workers = await db.users.find({
        "role": "worker",
        "franchiseeId": franchisee_id
    }).to_list(100)
    
    result = []
    for worker in workers:
        # Get training status
        training_status = await check_worker_training_status(str(worker["_id"]))
        
        result.append({
            "id": str(worker["_id"]),
            "email": worker["email"],
            "name": worker["name"],
            "phone": worker.get("phone"),
            "status": worker.get("status", "active"),
            "profilePhoto": worker.get("profilePhoto"),
            "hrbankWorkerId": worker.get("hrbankWorkerId"),
            "trainingStatus": training_status,
            "isEligibleForJobs": training_status["isFullyTrained"] and worker.get("status") == "active",
            "createdAt": worker.get("createdAt")
        })
    
    return result


@router.get("/pending-invites")
async def get_pending_invites(franchisee_id: str):
    """Get all pending invitations for a franchisee"""
    invites = await db.worker_invites.find({
        "franchiseeId": franchisee_id,
        "status": "pending",
        "expiresAt": {"$gt": datetime.utcnow()}
    }).to_list(100)
    
    for invite in invites:
        invite["_id"] = str(invite["_id"])
    
    return invites


@router.delete("/invite/{invite_id}")
async def cancel_invite(invite_id: str, franchisee_id: str):
    """Cancel a pending invitation"""
    result = await db.worker_invites.update_one(
        {
            "_id": ObjectId(invite_id),
            "franchiseeId": franchisee_id,
            "status": "pending"
        },
        {"$set": {"status": "cancelled", "cancelledAt": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")
    
    return {"success": True, "message": "Invitation cancelled"}


@router.patch("/{worker_id}/status")
async def update_worker_status(worker_id: str, update: WorkerStatusUpdate, franchisee_id: str):
    """Update a worker's status (active, inactive, suspended)"""
    worker = await db.users.find_one({
        "_id": ObjectId(worker_id),
        "role": "worker",
        "franchiseeId": franchisee_id
    })
    
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    await db.users.update_one(
        {"_id": ObjectId(worker_id)},
        {"$set": {
            "status": update.status,
            "statusUpdatedAt": datetime.utcnow(),
            "statusReason": update.reason
        }}
    )
    
    return {"success": True, "message": f"Worker status updated to {update.status}"}


@router.post("/{worker_id}/link-hrbank")
async def link_hrbank_account(worker_id: str, request: LinkHRBankRequest, franchisee_id: str):
    """Link a CleanGrid worker to their HR Bank worker account"""
    worker = await db.users.find_one({
        "_id": ObjectId(worker_id),
        "role": "worker",
        "franchiseeId": franchisee_id
    })
    
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    await db.users.update_one(
        {"_id": ObjectId(worker_id)},
        {"$set": {"hrbankWorkerId": request.hrbankWorkerId}}
    )
    
    return {"success": True, "message": "HR Bank account linked"}


# ==================== WORKER SELF-SERVICE ENDPOINTS ====================

@router.post("/accept-invite")
async def accept_invitation(request: AcceptInviteRequest):
    """
    Worker accepts an invitation and creates their account.
    """
    # Find the invitation
    invite = await db.worker_invites.find_one({
        "inviteCode": request.inviteCode,
        "status": "pending",
        "expiresAt": {"$gt": datetime.utcnow()}
    })
    
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation code")
    
    # Check if email already registered
    existing = await db.users.find_one({"email": invite["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")
    
    # Hash password
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(request.password)
    
    # Create worker account
    worker_doc = {
        "email": invite["email"],
        "name": invite["name"],
        "phone": request.phone or invite.get("phone"),
        "password": hashed_password,
        "role": "worker",
        "franchiseeId": invite["franchiseeId"],
        "status": "pending-training",  # Must complete training first
        "createdAt": datetime.utcnow(),
        "assignedFSAs": []
    }
    
    result = await db.users.insert_one(worker_doc)
    worker_id = str(result.inserted_id)
    
    # Update invitation status
    await db.worker_invites.update_one(
        {"_id": invite["_id"]},
        {"$set": {
            "status": "accepted",
            "acceptedAt": datetime.utcnow(),
            "workerId": worker_id
        }}
    )
    
    # Send welcome email
    try:
        from services.email_service import send_worker_welcome_email
        franchisee = await db.users.find_one({"_id": ObjectId(invite["franchiseeId"])})
        send_worker_welcome_email(
            to_email=invite["email"],
            worker_name=invite["name"],
            franchisee_name=franchisee.get("name") if franchisee else "your franchisee"
        )
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
    
    # Create JWT token for immediate login
    from jose import jwt
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cleangrid-secret-key-change-in-production")
    access_token = jwt.encode(
        {"sub": worker_id, "exp": datetime.utcnow() + timedelta(days=7)},
        SECRET_KEY,
        algorithm="HS256"
    )
    
    return {
        "success": True,
        "message": "Account created successfully! Please complete your training.",
        "workerId": worker_id,
        "access_token": access_token,
        "token_type": "bearer",
        "nextStep": "training"
    }


@router.get("/me/profile")
async def get_worker_profile(worker_id: str):
    """Get current worker's profile"""
    worker = await db.users.find_one({"_id": ObjectId(worker_id), "role": "worker"})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Get franchisee info
    franchisee = await db.users.find_one({"_id": ObjectId(worker["franchiseeId"])})
    
    # Get training status
    training_status = await check_worker_training_status(worker_id)
    
    return {
        "id": str(worker["_id"]),
        "email": worker["email"],
        "name": worker["name"],
        "phone": worker.get("phone"),
        "role": "worker",
        "status": worker.get("status", "pending-training"),
        "franchiseeId": worker["franchiseeId"],
        "franchiseeName": franchisee.get("name") if franchisee else None,
        "profilePhoto": worker.get("profilePhoto"),
        "hrbankWorkerId": worker.get("hrbankWorkerId"),
        "trainingStatus": training_status,
        "isEligibleForJobs": training_status["isFullyTrained"] and worker.get("status") == "active",
        "createdAt": worker.get("createdAt")
    }


@router.get("/me/training")
async def get_worker_training(worker_id: str):
    """Get worker's training progress and available courses"""
    worker = await db.users.find_one({"_id": ObjectId(worker_id), "role": "worker"})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Get all courses
    courses = await db.training_courses.find({"isActive": True}).to_list(100)
    
    # Get worker's progress
    progress_records = await db.worker_training_progress.find({
        "workerId": worker_id
    }).to_list(100)
    
    # Get credentials
    credentials = await db.worker_credentials.find({
        "workerId": worker_id,
        "isValid": True
    }).to_list(100)
    
    result = []
    for course in courses:
        course_id = str(course["_id"])
        progress = next((p for p in progress_records if p["courseId"] == course_id), None)
        credential = next((c for c in credentials if c.get("courseId") == course_id), None)
        
        # Check if credential is still valid
        has_valid_credential = False
        if credential:
            if credential.get("expiresAt") is None or credential["expiresAt"] > datetime.utcnow():
                has_valid_credential = True
        
        content_count = len(course.get("content", []))
        completed_content = len([c for c in (progress.get("contentProgress", []) if progress else []) if c.get("completed")])
        
        result.append({
            "courseId": course_id,
            "courseName": course["name"],
            "description": course["description"],
            "category": course["category"],
            "icon": course["icon"],
            "totalContent": content_count,
            "completedContent": completed_content,
            "contentProgress": int((completed_content / content_count) * 100) if content_count > 0 else 0,
            "quizPassed": has_valid_credential,
            "isCompleted": has_valid_credential,
            "expiresAt": credential.get("expiresAt") if credential else None,
            "status": "completed" if has_valid_credential else ("in-progress" if progress else "not-started")
        })
    
    # Overall status
    completed_count = len([c for c in result if c["isCompleted"]])
    total_required = len(result)
    
    return {
        "courses": result,
        "summary": {
            "totalCourses": total_required,
            "completedCourses": completed_count,
            "percentComplete": int((completed_count / total_required) * 100) if total_required > 0 else 100,
            "isFullyTrained": completed_count >= total_required,
            "canStartWorking": completed_count >= total_required and worker.get("status") == "active"
        }
    }


@router.post("/me/complete-training")
async def mark_training_complete(worker_id: str):
    """
    Called after worker completes all required training.
    Updates status from 'pending-training' to 'active'.
    """
    worker = await db.users.find_one({"_id": ObjectId(worker_id), "role": "worker"})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Verify all training is complete
    training_status = await check_worker_training_status(worker_id)
    
    if not training_status["isFullyTrained"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Training incomplete. Missing: {', '.join(training_status['missingCourses'])}"
        )
    
    # Update status to active
    if worker.get("status") == "pending-training":
        await db.users.update_one(
            {"_id": ObjectId(worker_id)},
            {"$set": {
                "status": "active",
                "trainingCompletedAt": datetime.utcnow()
            }}
        )
        
        # Notify franchisee
        try:
            from services.email_service import send_email
            franchisee = await db.users.find_one({"_id": ObjectId(worker["franchiseeId"])})
            if franchisee:
                send_email(
                    to_email=franchisee["email"],
                    subject=f"Worker Training Complete - {worker['name']}",
                    html_content=f"""
                    <h2>Training Complete!</h2>
                    <p>{worker['name']} has completed all required CleanGrid training and is now eligible for job assignments.</p>
                    """,
                    to_name=franchisee.get("name")
                )
        except Exception as e:
            print(f"Failed to send notification: {e}")
        
        return {
            "success": True,
            "message": "Congratulations! Training complete. You are now eligible for job assignments.",
            "status": "active"
        }
    else:
        return {
            "success": True,
            "message": "Training already verified.",
            "status": worker.get("status")
        }


@router.get("/me/jobs")
async def get_worker_jobs(worker_id: str, status: Optional[str] = None):
    """Get jobs assigned to this worker"""
    query = {"assignedWorkers": worker_id}
    if status:
        query["status"] = status
    
    jobs = await db.bookings.find(query).sort("scheduledDate", 1).to_list(100)
    
    for job in jobs:
        job["_id"] = str(job["_id"])
    
    return jobs
