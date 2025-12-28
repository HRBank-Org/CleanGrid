"""Admin Routes for CleanGrid"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== FRANCHISEE MANAGEMENT ====================

@router.get("/applications", response_model=Dict)
async def get_pending_applications(request: Request, status_filter: Optional[str] = None):
    """Get franchisee applications for review"""
    db = request.app.state.db
    
    query = {}
    if status_filter:
        query["status"] = status_filter
    else:
        query["status"] = {"$in": ["submitted", "under_review"]}
    
    applications = await db.franchisees.find(query).sort("applicationSubmittedAt", 1).to_list(100)
    
    return {
        "success": True,
        "data": {
            "applications": [{
                "id": str(a["_id"]),
                "operating_name": a.get("operatingName"),
                "legal_name": a.get("legalName"),
                "contact_name": a.get("contactName"),
                "email": a.get("email"),
                "phone": a.get("phone"),
                "city": a.get("city"),
                "province": a.get("province"),
                "preferred_fsas": a.get("preferredFSAs", []),
                "vehicle_access": a.get("vehicleAccess"),
                "status": a.get("status"),
                "submitted_at": a.get("applicationSubmittedAt")
            } for a in applications]
        }
    }


@router.patch("/applications/{application_id}/approve", response_model=Dict)
async def approve_application(
    application_id: str,
    request: Request,
    approval_data: Optional[dict] = None
):
    """Approve a franchisee application"""
    db = request.app.state.db
    approval_data = approval_data or {}
    
    franchisee = await db.franchisees.find_one({"_id": ObjectId(application_id)})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if franchisee.get("status") not in ["submitted", "under_review"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve application with status: {franchisee.get('status')}"
        )
    
    update_data = {
        "status": "approved",
        "approvedAt": datetime.utcnow(),
        "approvedBy": approval_data.get("approved_by", "admin")
    }
    
    # Assign FSAs if provided
    if approval_data.get("assigned_fsas"):
        update_data["assignedFSAs"] = approval_data["assigned_fsas"]
    
    # Set fee tier if provided
    if approval_data.get("per_job_fee_tier"):
        update_data["perJobFeeTier"] = approval_data["per_job_fee_tier"]
    
    await db.franchisees.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": update_data}
    )
    
    # Create audit log
    await db.audit_logs.insert_one({
        "_id": ObjectId(),
        "actorId": approval_data.get("approved_by", "admin"),
        "actorRole": "admin",
        "action": "franchisee_application_approved",
        "resourceType": "franchisee",
        "resourceId": application_id,
        "changes": update_data,
        "createdAt": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": "Application approved. Franchisee can now complete onboarding."
    }


@router.patch("/applications/{application_id}/reject", response_model=Dict)
async def reject_application(application_id: str, request: Request, rejection_data: dict):
    """Reject a franchisee application"""
    db = request.app.state.db
    
    await db.franchisees.update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": "rejected",
                "rejectedAt": datetime.utcnow(),
                "rejectionReason": rejection_data.get("reason")
            }
        }
    )
    
    return {
        "success": True,
        "message": "Application rejected"
    }


@router.patch("/franchisees/{franchisee_id}/activate", response_model=Dict)
async def activate_franchisee(franchisee_id: str, request: Request):
    """Activate a franchisee after all compliance gates are met"""
    db = request.app.state.db
    
    franchisee = await db.franchisees.find_one({"_id": ObjectId(franchisee_id)})
    if not franchisee:
        raise HTTPException(status_code=404, detail="Franchisee not found")
    
    if franchisee.get("status") != "approved":
        raise HTTPException(
            status_code=400,
            detail="Franchisee must be approved before activation"
        )
    
    # Check compliance documents
    required_docs = ["cgl_insurance"]
    if franchisee.get("vehicleAccess"):
        required_docs.append("auto_insurance")
    if franchisee.get("province") == "ON":
        required_docs.append("wsib")
    
    for doc_type in required_docs:
        doc = await db.compliance_documents.find_one({
            "franchiseeId": franchisee_id,
            "docType": doc_type,
            "status": "verified"
        })
        if not doc:
            raise HTTPException(
                status_code=400,
                detail=f"Missing verified {doc_type} document"
            )
    
    # Check HR Bank configuration
    if not franchisee.get("hrbankEmployerId"):
        raise HTTPException(
            status_code=400,
            detail="HR Bank employer ID not configured"
        )
    
    # Activate
    await db.franchisees.update_one(
        {"_id": ObjectId(franchisee_id)},
        {
            "$set": {
                "status": "activated",
                "activatedAt": datetime.utcnow()
            }
        }
    )
    
    # Update territories
    for fsa in franchisee.get("assignedFSAs", []):
        await db.territories.update_one(
            {"fsaCode": fsa},
            {
                "$set": {
                    "currentFranchiseeId": franchisee_id,
                    "assignedAt": datetime.utcnow(),
                    "protectionStatus": "protected"
                }
            },
            upsert=True
        )
    
    return {
        "success": True,
        "message": "Franchisee activated and can now accept jobs"
    }


# ==================== TERRITORY MANAGEMENT ====================

@router.get("/territories", response_model=Dict)
async def get_territories(request: Request):
    """Get all territories (FSAs)"""
    db = request.app.state.db
    
    territories = await db.territories.find({}).to_list(1000)
    
    # Get franchisee names
    franchisee_ids = [t.get("currentFranchiseeId") for t in territories if t.get("currentFranchiseeId")]
    franchisees = {}
    if franchisee_ids:
        for f in await db.franchisees.find({"_id": {"$in": [ObjectId(fid) for fid in franchisee_ids]}}).to_list(100):
            franchisees[str(f["_id"])] = f.get("operatingName")
    
    return {
        "success": True,
        "data": {
            "territories": [{
                "fsa_code": t.get("fsaCode"),
                "city": t.get("city"),
                "province": t.get("province"),
                "franchisee_id": t.get("currentFranchiseeId"),
                "franchisee_name": franchisees.get(t.get("currentFranchiseeId")),
                "protection_status": t.get("protectionStatus", "unassigned"),
                "assigned_at": t.get("assignedAt")
            } for t in territories]
        }
    }


@router.patch("/territories/{fsa_code}/assign", response_model=Dict)
async def assign_territory(
    fsa_code: str,
    request: Request,
    assignment_data: dict
):
    """Assign or reassign a territory to a franchisee"""
    db = request.app.state.db
    
    franchisee_id = assignment_data.get("franchisee_id")
    
    # Verify franchisee exists and is activated
    if franchisee_id:
        franchisee = await db.franchisees.find_one({"_id": ObjectId(franchisee_id)})
        if not franchisee:
            raise HTTPException(status_code=404, detail="Franchisee not found")
        if franchisee.get("status") != "activated":
            raise HTTPException(status_code=400, detail="Franchisee must be activated")
    
    # Update territory
    territory = await db.territories.find_one({"fsaCode": fsa_code})
    
    if territory and territory.get("currentFranchiseeId"):
        # Log the reassignment
        await db.territory_assignments.insert_one({
            "_id": ObjectId(),
            "fsaCode": fsa_code,
            "previousFranchiseeId": territory.get("currentFranchiseeId"),
            "newFranchiseeId": franchisee_id,
            "reason": assignment_data.get("reason", "admin_reassignment"),
            "assignedAt": datetime.utcnow()
        })
    
    await db.territories.update_one(
        {"fsaCode": fsa_code},
        {
            "$set": {
                "fsaCode": fsa_code,
                "currentFranchiseeId": franchisee_id,
                "assignedAt": datetime.utcnow() if franchisee_id else None,
                "protectionStatus": "protected" if franchisee_id else "unassigned",
                "city": assignment_data.get("city", ""),
                "province": assignment_data.get("province", "ON")
            }
        },
        upsert=True
    )
    
    # Update franchisee's assigned FSAs
    if franchisee_id:
        await db.franchisees.update_one(
            {"_id": ObjectId(franchisee_id)},
            {"$addToSet": {"assignedFSAs": fsa_code}}
        )
    
    return {
        "success": True,
        "message": f"Territory {fsa_code} assigned successfully"
    }


# ==================== JOB MANAGEMENT ====================

@router.get("/jobs", response_model=Dict)
async def get_all_jobs(
    request: Request,
    status_filter: Optional[str] = None,
    fsa_filter: Optional[str] = None,
    limit: int = 100
):
    """Get all jobs with filters"""
    db = request.app.state.db
    
    query = {}
    if status_filter:
        query["status"] = status_filter
    if fsa_filter:
        query["fsaCode"] = fsa_filter
    
    jobs = await db.jobs.find(query).sort("createdAt", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "jobs": [{
                "id": str(j["_id"]),
                "booking_id": j.get("bookingId"),
                "franchisee_id": j.get("franchiseeId"),
                "customer_name": j.get("customerName"),
                "service_name": j.get("serviceName"),
                "address": j.get("address"),
                "fsa_code": j.get("fsaCode"),
                "scheduled_date": j.get("scheduledDate"),
                "status": j.get("status"),
                "gross_amount": j.get("grossAmount"),
                "created_at": j.get("createdAt")
            } for j in jobs],
            "total": len(jobs)
        }
    }


@router.post("/jobs/{job_id}/reassign", response_model=Dict)
async def reassign_job(job_id: str, request: Request, reassign_data: dict):
    """Reassign a job to a different franchisee"""
    db = request.app.state.db
    
    new_franchisee_id = reassign_data.get("franchisee_id")
    
    # Verify franchisee
    franchisee = await db.franchisees.find_one({"_id": ObjectId(new_franchisee_id)})
    if not franchisee or franchisee.get("status") != "activated":
        raise HTTPException(status_code=400, detail="Invalid or inactive franchisee")
    
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Cancel existing work order if any
    if job.get("workOrderId"):
        from utils.hrbank_webhook import get_hrbank_service
        hrbank = get_hrbank_service(db)
        await hrbank.cancel_work_order(job_id, "Reassigned by admin")
    
    # Update job
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$set": {
                "franchiseeId": new_franchisee_id,
                "status": "assigned",
                "assignedAt": datetime.utcnow(),
                "reassignedBy": reassign_data.get("admin_id", "admin"),
                "reassignReason": reassign_data.get("reason")
            }
        }
    )
    
    return {
        "success": True,
        "message": "Job reassigned successfully"
    }


# ==================== SETTLEMENTS ====================

@router.get("/settlements", response_model=Dict)
async def get_all_settlements(request: Request, status_filter: Optional[str] = None):
    """Get all settlement statements"""
    db = request.app.state.db
    
    query = {}
    if status_filter:
        query["payoutStatus"] = status_filter
    
    settlements = await db.settlement_statements.find(query).sort("periodEnd", -1).to_list(100)
    
    # Get franchisee names
    franchisee_ids = list(set([s.get("franchiseeId") for s in settlements]))
    franchisees = {}
    for f in await db.franchisees.find({"_id": {"$in": [ObjectId(fid) for fid in franchisee_ids if fid]}}).to_list(100):
        franchisees[str(f["_id"])] = f.get("operatingName")
    
    return {
        "success": True,
        "data": {
            "settlements": [{
                "id": str(s["_id"]),
                "franchisee_id": s.get("franchiseeId"),
                "franchisee_name": franchisees.get(s.get("franchiseeId")),
                "period_start": s.get("periodStart"),
                "period_end": s.get("periodEnd"),
                "job_count": s.get("jobCount"),
                "gross_revenue": s.get("grossRevenue"),
                "net_payout": s.get("netPayout"),
                "payout_status": s.get("payoutStatus")
            } for s in settlements]
        }
    }


@router.post("/settlements/{settlement_id}/approve", response_model=Dict)
async def approve_settlement(settlement_id: str, request: Request):
    """Approve a settlement for payout"""
    db = request.app.state.db
    
    await db.settlement_statements.update_one(
        {"_id": ObjectId(settlement_id)},
        {
            "$set": {
                "payoutStatus": "processing",
                "approvedAt": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": "Settlement approved for payout"
    }


# ==================== REPORTING ====================

@router.get("/stats", response_model=Dict)
async def get_platform_stats(request: Request):
    """Get platform-wide statistics"""
    db = request.app.state.db
    
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Counts
    total_franchisees = await db.franchisees.count_documents({"status": "activated"})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_jobs = await db.jobs.count_documents({})
    jobs_this_month = await db.jobs.count_documents({"createdAt": {"$gte": start_of_month}})
    
    # Revenue
    pipeline = [
        {"$match": {"status": "qa_approved", "createdAt": {"$gte": start_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$grossAmount"}}}
    ]
    revenue_result = await db.jobs.aggregate(pipeline).to_list(1)
    revenue_this_month = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "success": True,
        "data": {
            "franchisees": {
                "active": total_franchisees,
                "pending_applications": await db.franchisees.count_documents({"status": {"$in": ["submitted", "under_review"]}})
            },
            "customers": {
                "total": total_customers
            },
            "jobs": {
                "total": total_jobs,
                "this_month": jobs_this_month,
                "pending": await db.jobs.count_documents({"status": "pending_assignment"}),
                "in_progress": await db.jobs.count_documents({"status": {"$in": ["accepted", "scheduled", "en_route", "in_progress"]}})
            },
            "revenue": {
                "this_month": revenue_this_month
            },
            "territories": {
                "total": await db.territories.count_documents({}),
                "assigned": await db.territories.count_documents({"currentFranchiseeId": {"$ne": None}})
            }
        }
    }
