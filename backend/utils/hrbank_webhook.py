"""HR Bank Webhook Integration for CleanGrid"""
import os
import logging
import httpx
import hmac
import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Optional
from bson import ObjectId

logger = logging.getLogger(__name__)

# HR Bank Configuration
HRBANK_API_URL = os.environ.get('HRBANK_API_URL', '')
HRBANK_API_KEY = os.environ.get('HRBANK_API_KEY', '')
HRBANK_WEBHOOK_SECRET = os.environ.get('HRBANK_WEBHOOK_SECRET', 'cleangrid-webhook-secret')

# Platform callback URL
CALLBACK_BASE_URL = os.environ.get('CALLBACK_BASE_URL', 'https://cleangrid.com')


class HRBankWebhookService:
    """Service for HR Bank webhook operations"""
    
    def __init__(self, db):
        self.db = db
    
    async def check_coverage(self, postal_code: str, franchisee_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Check if HR Bank has coverage for a given FSA.
        If franchisee_id is provided, check if that franchisee has HR Bank configured.
        """
        fsa_code = postal_code.replace(" ", "").upper()[:3]
        
        # First check if we have a franchisee for this FSA
        territory = await self.db.territories.find_one({"fsaCode": fsa_code})
        
        if not territory or not territory.get("currentFranchiseeId"):
            return {
                "success": True,
                "covered": False,
                "reason": "no_franchisee_assigned",
                "fsa_code": fsa_code
            }
        
        # Get the franchisee
        franchisee = await self.db.franchisees.find_one({
            "_id": ObjectId(territory["currentFranchiseeId"])
        })
        
        if not franchisee:
            return {
                "success": True,
                "covered": False,
                "reason": "franchisee_not_found",
                "fsa_code": fsa_code
            }
        
        # Check if franchisee is activated and has HR Bank configured
        if franchisee.get("status") != "activated":
            return {
                "success": True,
                "covered": False,
                "reason": "franchisee_not_activated",
                "fsa_code": fsa_code
            }
        
        if not franchisee.get("hrbankEmployerId"):
            return {
                "success": True,
                "covered": False,
                "reason": "hrbank_not_configured",
                "fsa_code": fsa_code
            }
        
        return {
            "success": True,
            "covered": True,
            "fsa_code": fsa_code,
            "franchisee_id": str(franchisee["_id"]),
            "franchisee_name": franchisee.get("operatingName"),
            "hrbank_employer_id": franchisee.get("hrbankEmployerId")
        }
    
    async def create_work_order(self, job_id: str) -> Dict[str, Any]:
        """
        Create and send a work order to HR Bank for a job.
        This creates a route-based shift in HR Bank.
        """
        # Fetch job with all related data
        job = await self.db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            return {"success": False, "error": "Job not found"}
        
        # Get booking details
        booking = await self.db.bookings.find_one({"_id": ObjectId(job["bookingId"])})
        if not booking:
            return {"success": False, "error": "Booking not found"}
        
        # Get franchisee
        franchisee = await self.db.franchisees.find_one({"_id": ObjectId(job["franchiseeId"])})
        if not franchisee:
            return {"success": False, "error": "Franchisee not found"}
        
        if not franchisee.get("hrbankEmployerId"):
            return {"success": False, "error": "Franchisee has no HR Bank employer configured"}
        
        # Get customer
        customer = await self.db.users.find_one({"_id": ObjectId(job["customerId"])})
        
        # Get service for checklist
        service = await self.db.services.find_one({"_id": ObjectId(booking["serviceId"])})
        
        # Generate idempotency key
        idempotency_key = f"wo_{job_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Build work order payload
        payload = {
            "idempotency_key": idempotency_key,
            "work_order": {
                "cleangrid_job_id": str(job["_id"]),
                "franchisee_id": str(franchisee["_id"]),
                "hrbank_employer_id": franchisee["hrbankEmployerId"],
                
                "service": {
                    "name": job.get("serviceName", "Cleaning Service"),
                    "category": service.get("category", "cleaning") if service else "cleaning",
                    "duration_minutes": service.get("durationMinutes", 120) if service else 120
                },
                
                "customer": {
                    "name": customer.get("name", "Customer") if customer else "Customer",
                    "phone": customer.get("phone", "") if customer else "",
                    "email": customer.get("email", "") if customer else ""
                },
                
                "location": {
                    "address": job.get("address", ""),
                    "city": booking.get("city", ""),
                    "province": booking.get("province", "ON"),
                    "postal_code": booking.get("postalCode", ""),
                    "fsa_code": job.get("fsaCode", ""),
                    "lat": booking.get("lat"),
                    "lng": booking.get("lng"),
                    "unit": booking.get("unit"),
                    "buzz_code": booking.get("buzzCode"),
                    "access_notes": booking.get("accessNotes")
                },
                
                "schedule": {
                    "date": job["scheduledDate"].strftime("%Y-%m-%d") if isinstance(job["scheduledDate"], datetime) else job["scheduledDate"],
                    "time_window_start": job.get("timeWindowStart", "09:00"),
                    "time_window_end": job.get("timeWindowEnd", "12:00")
                },
                
                "checklist": self._build_checklist(service),
                
                "photo_requirements": [
                    {"type": "before", "locations": ["main_area", "kitchen", "bathroom"]},
                    {"type": "after", "locations": ["main_area", "kitchen", "bathroom"]}
                ],
                
                "pricing": {
                    "gross_amount": job.get("grossAmount", 0),
                    "platform_fee": job.get("platformFee", 0),
                    "net_to_franchisee": job.get("netToFranchisee", 0),
                    "currency": "CAD"
                },
                
                "notes": booking.get("notes", "")
            },
            "callback_url": f"{CALLBACK_BASE_URL}/api/webhooks/hrbank/status",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Store work order in database
        work_order_doc = {
            "_id": ObjectId(),
            "jobId": str(job["_id"]),
            "franchiseeId": str(franchisee["_id"]),
            "idempotencyKey": idempotency_key,
            "payload": payload,
            "callbackUrl": payload["callback_url"],
            "status": "pending",
            "retryCount": 0,
            "createdAt": datetime.utcnow()
        }
        
        await self.db.work_orders.insert_one(work_order_doc)
        
        # Send to HR Bank
        result = await self._send_to_hrbank(str(work_order_doc["_id"]), payload, franchisee)
        
        # Update job with work order reference
        await self.db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"workOrderId": str(work_order_doc["_id"])}}
        )
        
        return result
    
    def _build_checklist(self, service: Optional[Dict]) -> list:
        """Build checklist items based on service"""
        default_checklist = [
            {"item": "General cleaning and dusting", "required": True},
            {"item": "Vacuum all floors", "required": True},
            {"item": "Mop hard floors", "required": True},
            {"item": "Clean bathrooms", "required": True},
            {"item": "Clean kitchen surfaces", "required": True}
        ]
        
        if not service:
            return default_checklist
        
        category = service.get("category", "")
        
        if category == "deep-clean":
            return default_checklist + [
                {"item": "Clean inside appliances", "required": True},
                {"item": "Clean inside cabinets", "required": False},
                {"item": "Clean baseboards", "required": True},
                {"item": "Clean light fixtures", "required": True}
            ]
        elif category == "move-in-out":
            return default_checklist + [
                {"item": "Clean inside all cabinets", "required": True},
                {"item": "Clean inside all appliances", "required": True},
                {"item": "Clean windows (interior)", "required": True},
                {"item": "Clean closets", "required": True}
            ]
        
        return default_checklist
    
    async def _send_to_hrbank(self, work_order_id: str, payload: Dict, franchisee: Dict) -> Dict[str, Any]:
        """Send work order to HR Bank API"""
        if not HRBANK_API_URL:
            logger.warning("HR Bank API URL not configured")
            return {"success": False, "error": "HR Bank not configured"}
        
        # Use franchisee's API key if available, otherwise use platform key
        api_key = franchisee.get("hrbankApiKey") or HRBANK_API_KEY
        
        if not api_key:
            return {"success": False, "error": "No HR Bank API key available"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{HRBANK_API_URL}/api/external/workorders",
                    headers={
                        "X-API-Key": api_key,
                        "Content-Type": "application/json",
                        "X-Idempotency-Key": payload["idempotency_key"]
                    },
                    json=payload,
                    timeout=15.0
                )
                
                result = response.json()
                
                # Update work order status
                update_data = {
                    "sentAt": datetime.utcnow(),
                    "status": "sent" if response.status_code == 200 else "failed"
                }
                
                if result.get("success"):
                    update_data["hrbankWorkOrderId"] = result.get("hrbank_work_order_id")
                    update_data["status"] = "acknowledged"
                    update_data["acknowledgedAt"] = datetime.utcnow()
                else:
                    update_data["lastError"] = result.get("error", "Unknown error")
                
                await self.db.work_orders.update_one(
                    {"_id": ObjectId(work_order_id)},
                    {"$set": update_data}
                )
                
                return result
                
        except Exception as e:
            logger.error(f"Failed to send work order to HR Bank: {e}")
            
            # Update work order with error
            await self.db.work_orders.update_one(
                {"_id": ObjectId(work_order_id)},
                {
                    "$set": {
                        "status": "failed",
                        "lastError": str(e)
                    },
                    "$inc": {"retryCount": 1}
                }
            )
            
            return {"success": False, "error": str(e)}
    
    async def cancel_work_order(self, job_id: str, reason: str = "Cancelled by customer") -> Dict[str, Any]:
        """Cancel a work order in HR Bank"""
        job = await self.db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            return {"success": False, "error": "Job not found"}
        
        work_order = await self.db.work_orders.find_one({"jobId": job_id})
        if not work_order:
            return {"success": False, "error": "Work order not found"}
        
        if not HRBANK_API_URL or not HRBANK_API_KEY:
            return {"success": False, "error": "HR Bank not configured"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{HRBANK_API_URL}/api/external/workorders/{work_order.get('hrbankWorkOrderId')}",
                    headers={"X-API-Key": HRBANK_API_KEY},
                    params={"reason": reason},
                    timeout=10.0
                )
                
                result = response.json()
                
                # Update work order status
                await self.db.work_orders.update_one(
                    {"_id": work_order["_id"]},
                    {"$set": {"status": "cancelled", "cancelledAt": datetime.utcnow()}}
                )
                
                return result
                
        except Exception as e:
            logger.error(f"Failed to cancel work order in HR Bank: {e}")
            return {"success": False, "error": str(e)}
    
    def verify_webhook_signature(self, payload: bytes, signature: str, secret: str = None) -> bool:
        """Verify the HMAC signature of incoming webhook"""
        secret = secret or HRBANK_WEBHOOK_SECRET
        expected_signature = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
    
    async def process_status_update(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process status update from HR Bank webhook.
        Updates job status based on HR Bank events.
        """
        event_type = event_data.get("event_type")
        cleangrid_job_id = event_data.get("cleangrid_job_id")
        hrbank_status = event_data.get("status")
        data = event_data.get("data", {})
        
        if not cleangrid_job_id:
            return {"success": False, "error": "Missing cleangrid_job_id"}
        
        # Map HR Bank status to CleanGrid job status
        status_mapping = {
            "accepted": "accepted",
            "scheduled": "scheduled",
            "en_route": "en_route",
            "started": "in_progress",
            "completed": "completed",
            "qa_submitted": "qa_submitted"
        }
        
        new_status = status_mapping.get(hrbank_status)
        if not new_status:
            return {"success": False, "error": f"Unknown status: {hrbank_status}"}
        
        # Update job
        update_data = {
            "status": new_status,
            "lastUpdatedAt": datetime.utcnow()
        }
        
        # Add timestamps based on status
        timestamp_field = event_data.get("timestamp")
        if timestamp_field:
            if new_status == "accepted":
                update_data["acceptedAt"] = timestamp_field
            elif new_status == "in_progress":
                update_data["startedAt"] = timestamp_field
            elif new_status == "completed":
                update_data["completedAt"] = timestamp_field
            elif new_status == "qa_submitted":
                update_data["qaSubmittedAt"] = timestamp_field
        
        # Add worker info if provided
        if data.get("worker_name"):
            update_data["assignedWorkerName"] = data["worker_name"]
        
        if data.get("photos_submitted"):
            update_data["hrbankPhotosCount"] = data["photos_submitted"]
        
        result = await self.db.jobs.update_one(
            {"_id": ObjectId(cleangrid_job_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return {"success": False, "error": "Job not found or not updated"}
        
        # Create notification for franchisee
        job = await self.db.jobs.find_one({"_id": ObjectId(cleangrid_job_id)})
        if job and job.get("franchiseeId"):
            franchisee = await self.db.franchisees.find_one({"_id": ObjectId(job["franchiseeId"])})
            if franchisee:
                await self.db.notifications.insert_one({
                    "_id": ObjectId(),
                    "userId": franchisee["ownerId"],
                    "type": "job_status_update",
                    "title": f"Job Status: {new_status.replace('_', ' ').title()}",
                    "body": f"Job at {job.get('address', 'N/A')} is now {new_status.replace('_', ' ')}",
                    "data": {"jobId": cleangrid_job_id, "status": new_status},
                    "read": False,
                    "createdAt": datetime.utcnow()
                })
        
        # Log the webhook event
        await self.db.webhook_logs.insert_one({
            "_id": ObjectId(),
            "direction": "inbound",
            "source": "hrbank",
            "eventType": event_type,
            "jobId": cleangrid_job_id,
            "payload": event_data,
            "processedAt": datetime.utcnow()
        })
        
        return {
            "success": True,
            "message": f"Job {cleangrid_job_id} updated to {new_status}"
        }


# Singleton instance (will be initialized with db)
hrbank_service: Optional[HRBankWebhookService] = None

def get_hrbank_service(db) -> HRBankWebhookService:
    global hrbank_service
    if hrbank_service is None:
        hrbank_service = HRBankWebhookService(db)
    return hrbank_service
