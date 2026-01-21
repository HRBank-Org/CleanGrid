"""
Stripe Payment Routes for CleanGrid
Handles payment processing for cleaning service bookings
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import stripe
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/payments", tags=["payments"])


class CreatePaymentIntentRequest(BaseModel):
    amount: int  # Amount in cents
    booking_id: str
    customer_email: str
    customer_name: str
    service_name: str
    metadata: Optional[dict] = None


class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str
    booking_id: str


@router.get("/config")
def get_stripe_config():
    """Return publishable key for frontend"""
    return {
        "publishableKey": os.getenv("STRIPE_PUBLISHABLE_KEY")
    }


@router.post("/create-payment-intent")
def create_payment_intent(request: CreatePaymentIntentRequest):
    """
    Create a Stripe PaymentIntent with manual capture.
    This holds the payment until the job is completed.
    """
    try:
        # Create payment intent with manual capture (hold until job complete)
        payment_intent = stripe.PaymentIntent.create(
            amount=request.amount,
            currency="cad",
            capture_method="manual",  # Hold payment, don't charge immediately
            metadata={
                "booking_id": request.booking_id,
                "customer_email": request.customer_email,
                "service_name": request.service_name,
                **(request.metadata or {})
            },
            description=f"CleanGrid Booking - {request.service_name}",
            receipt_email=request.customer_email,
        )
        
        return {
            "clientSecret": payment_intent.client_secret,
            "paymentIntentId": payment_intent.id,
            "amount": payment_intent.amount,
            "status": payment_intent.status
        }
        
    except stripe.error.CardError as e:
        raise HTTPException(status_code=400, detail=f"Card error: {e.user_message}")
    except stripe.error.RateLimitError:
        raise HTTPException(status_code=429, detail="Too many requests to payment provider")
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    except stripe.error.AuthenticationError:
        raise HTTPException(status_code=500, detail="Payment provider authentication failed")
    except stripe.error.APIConnectionError:
        raise HTTPException(status_code=503, detail="Could not connect to payment provider")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")


@router.post("/capture/{payment_intent_id}")
def capture_payment(payment_intent_id: str):
    """
    Capture a previously authorized payment after job completion.
    Called when franchisee completes the job.
    """
    try:
        # Retrieve the payment intent
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status != "requires_capture":
            raise HTTPException(
                status_code=400,
                detail=f"Payment cannot be captured. Current status: {payment_intent.status}"
            )
        
        # Capture the payment
        captured = stripe.PaymentIntent.capture(payment_intent_id)
        
        return {
            "success": True,
            "paymentIntentId": captured.id,
            "status": captured.status,
            "amountCaptured": captured.amount_received
        }
        
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Capture error: {str(e)}")


@router.post("/cancel/{payment_intent_id}")
def cancel_payment(payment_intent_id: str):
    """
    Cancel an authorized payment (void the hold).
    Called when booking is cancelled before completion.
    """
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        # If already captured, need to refund instead
        if payment_intent.status == "succeeded":
            # Create refund
            refund = stripe.Refund.create(
                payment_intent=payment_intent_id
            )
            return {
                "success": True,
                "action": "refunded",
                "refundId": refund.id,
                "amount": refund.amount
            }
        
        # Cancel the payment intent (void authorization)
        cancelled = stripe.PaymentIntent.cancel(payment_intent_id)
        
        return {
            "success": True,
            "action": "cancelled",
            "paymentIntentId": cancelled.id,
            "status": cancelled.status
        }
        
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cancel error: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events for payment status updates.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    # If no webhook secret configured, skip verification (dev mode)
    if not webhook_secret:
        try:
            event = stripe.Event.construct_from(
                stripe.util.convert_to_stripe_object(payload.decode()),
                stripe.api_key
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid payload: {str(e)}")
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    event_type = event["type"]
    event_data = event["data"]["object"]
    
    if event_type == "payment_intent.succeeded":
        # Payment was successfully captured
        print(f"Payment succeeded: {event_data['id']}")
        # TODO: Update booking status in database
        
    elif event_type == "payment_intent.payment_failed":
        # Payment failed
        print(f"Payment failed: {event_data['id']}")
        # TODO: Notify customer, update booking status
        
    elif event_type == "payment_intent.canceled":
        # Payment was cancelled
        print(f"Payment cancelled: {event_data['id']}")
        
    elif event_type == "charge.refunded":
        # Refund was processed
        print(f"Refund processed: {event_data['id']}")
    
    return {"status": "success", "event": event_type}


@router.get("/payment-intent/{payment_intent_id}")
def get_payment_intent(payment_intent_id: str):
    """Get the status of a payment intent"""
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        return {
            "id": payment_intent.id,
            "amount": payment_intent.amount,
            "currency": payment_intent.currency,
            "status": payment_intent.status,
            "metadata": payment_intent.metadata,
            "created": payment_intent.created
        }
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=404, detail="Payment not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
