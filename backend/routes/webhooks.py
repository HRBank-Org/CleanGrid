"""Webhook Routes for CleanGrid - Inbound from HR Bank"""
from fastapi import APIRouter, HTTPException, Request, Header
from typing import Dict, Optional
from datetime import datetime
from bson import ObjectId
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/hrbank/status", response_model=Dict)
async def hrbank_status_webhook(
    request: Request,
    x_hrbank_signature: Optional[str] = Header(None)
):
    """
    Receive status updates from HR Bank.
    
    Expected payload:
    {
        "event_type": "work_order.status_changed",
        "work_order_id": "wo_abc123xyz789",
        "cleangrid_job_id": "job_65f8c2a1b3d4e5f6",
        "hrbank_shift_id": "shift_789ghi",
        "status": "completed",
        "timestamp": "2025-01-15T11:45:00Z",
        "data": {
            "worker_name": "John Worker",
            "worker_id": "wkr_xyz",
            "started_at": "2025-01-15T09:15:00Z",
            "completed_at": "2025-01-15T11:45:00Z",
            "actual_duration_minutes": 150,
            "checklist_completed": true,
            "photos_submitted": 6,
            "notes": "All tasks completed."
        },
        "signature": "sha256=abc123..."
    }
    """
    db = request.app.state.db
    
    try:
        # Get raw body for signature verification
        body = await request.body()
        payload = json.loads(body)
        
        # Log the webhook
        logger.info(f"Received HR Bank webhook: {payload.get('event_type')}")
        
        # Verify signature (optional in dev)
        from utils.hrbank_webhook import get_hrbank_service
        hrbank = get_hrbank_service(db)
        
        if x_hrbank_signature:
            if not hrbank.verify_webhook_signature(body, x_hrbank_signature):
                logger.warning("Invalid webhook signature")
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Process the status update
        result = await hrbank.process_status_update(payload)
        
        if not result.get("success"):
            logger.error(f"Failed to process webhook: {result.get('error')}")
            # Still return 200 to acknowledge receipt
            return {
                "success": False,
                "error": result.get("error"),
                "acknowledged": True
            }
        
        return {
            "success": True,
            "message": result.get("message"),
            "acknowledged": True
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hrbank/test", response_model=Dict)
async def test_hrbank_webhook(request: Request):
    """Test endpoint for HR Bank webhook integration"""
    db = request.app.state.db
    
    # Simulate a status update
    test_payload = {
        "event_type": "work_order.status_changed",
        "work_order_id": "wo_test123",
        "cleangrid_job_id": "test_job_id",
        "status": "accepted",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "worker_name": "Test Worker",
            "message": "This is a test webhook"
        }
    }
    
    # Log test
    await db.webhook_logs.insert_one({
        "_id": ObjectId(),
        "direction": "inbound",
        "source": "hrbank_test",
        "eventType": test_payload["event_type"],
        "payload": test_payload,
        "processedAt": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": "Test webhook received and logged",
        "payload": test_payload
    }


@router.get("/hrbank/logs", response_model=Dict)
async def get_webhook_logs(request: Request, limit: int = 50):
    """Get recent webhook logs (admin only)"""
    db = request.app.state.db
    
    logs = await db.webhook_logs.find({}).sort("processedAt", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "logs": [{
                "id": str(log["_id"]),
                "direction": log.get("direction"),
                "source": log.get("source"),
                "event_type": log.get("eventType"),
                "job_id": log.get("jobId"),
                "processed_at": log.get("processedAt")
            } for log in logs]
        }
    }
