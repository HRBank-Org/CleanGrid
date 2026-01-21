"""
Stripe Payment Routes for CleanGrid
Handles payment processing for cleaning service bookings
Includes Stripe Connect for franchisee payouts
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

# Platform fee percentage (CleanGrid keeps 18%, franchisee gets 82%)
PLATFORM_FEE_PERCENT = 18

router = APIRouter(prefix="/payments", tags=["payments"])


class CreatePaymentIntentRequest(BaseModel):
    amount: int  # Amount in cents
    booking_id: str
    customer_email: str
    customer_name: str
    service_name: str
    franchisee_stripe_account: Optional[str] = None  # For Connect transfers
    metadata: Optional[dict] = None


class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str
    booking_id: str


class CreateConnectAccountRequest(BaseModel):
    franchisee_email: str
    franchisee_name: str
    business_name: Optional[str] = None
    return_url: str
    refresh_url: str


class TransferToFranchiseeRequest(BaseModel):
    payment_intent_id: str
    franchisee_stripe_account: str
    booking_id: str


@router.get("/config")
def get_stripe_config():
    """Return publishable key for frontend"""
    return {
        "publishableKey": os.getenv("STRIPE_PUBLISHABLE_KEY"),
        "platformFeePercent": PLATFORM_FEE_PERCENT
    }


# ==================== STRIPE CONNECT FOR FRANCHISEES ====================

@router.post("/connect/create-account")
def create_connect_account(request: CreateConnectAccountRequest):
    """
    Create a Stripe Connect Express account for a franchisee.
    Returns an onboarding URL where the franchisee can complete setup.
    """
    try:
        # Create a Connect Express account
        account = stripe.Account.create(
            type="express",
            country="CA",  # Canada
            email=request.franchisee_email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            business_profile={
                "name": request.business_name or request.franchisee_name,
                "mcc": "7349",  # Cleaning services
                "product_description": "Professional cleaning services via CleanGrid platform"
            },
            metadata={
                "franchisee_name": request.franchisee_name,
                "platform": "cleangrid"
            }
        )
        
        # Create onboarding link
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=request.refresh_url,
            return_url=request.return_url,
            type="account_onboarding",
        )
        
        return {
            "success": True,
            "accountId": account.id,
            "onboardingUrl": account_link.url,
            "expiresAt": account_link.expires_at
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connect account error: {str(e)}")


@router.get("/connect/account/{account_id}")
def get_connect_account(account_id: str):
    """Get the status of a Connect account"""
    try:
        account = stripe.Account.retrieve(account_id)
        
        return {
            "id": account.id,
            "email": account.email,
            "chargesEnabled": account.charges_enabled,
            "payoutsEnabled": account.payouts_enabled,
            "detailsSubmitted": account.details_submitted,
            "requirements": account.requirements,
            "businessProfile": account.business_profile
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="Account not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect/create-login-link/{account_id}")
def create_connect_login_link(account_id: str):
    """Create a login link for franchisee to access their Stripe dashboard"""
    try:
        login_link = stripe.Account.create_login_link(account_id)
        return {
            "url": login_link.url
        }
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect/transfer")
def transfer_to_franchisee(request: TransferToFranchiseeRequest):
    """
    Transfer payment to franchisee after job completion.
    Deducts 18% platform fee, transfers 82% to franchisee.
    """
    try:
        # Get the payment intent to find the charge
        payment_intent = stripe.PaymentIntent.retrieve(request.payment_intent_id)
        
        if payment_intent.status != "succeeded":
            raise HTTPException(
                status_code=400, 
                detail=f"Payment not yet captured. Status: {payment_intent.status}"
            )
        
        # Get the charge ID from the payment intent
        if not payment_intent.latest_charge:
            raise HTTPException(status_code=400, detail="No charge found for this payment")
        
        # Calculate transfer amount (82% to franchisee)
        total_amount = payment_intent.amount
        platform_fee = int(total_amount * PLATFORM_FEE_PERCENT / 100)
        franchisee_amount = total_amount - platform_fee
        
        # Create transfer to franchisee's Connect account
        transfer = stripe.Transfer.create(
            amount=franchisee_amount,
            currency="cad",
            destination=request.franchisee_stripe_account,
            source_transaction=payment_intent.latest_charge,
            metadata={
                "booking_id": request.booking_id,
                "payment_intent_id": request.payment_intent_id,
                "platform_fee": platform_fee,
                "platform_fee_percent": PLATFORM_FEE_PERCENT
            },
            description=f"CleanGrid job payout - Booking {request.booking_id[:8]}"
        )
        
        return {
            "success": True,
            "transferId": transfer.id,
            "amount": transfer.amount,
            "franchiseeAmount": franchisee_amount,
            "platformFee": platform_fee,
            "platformFeePercent": PLATFORM_FEE_PERCENT,
            "destination": transfer.destination,
            "status": "transferred"
        }
        
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transfer error: {str(e)}")


@router.post("/connect/payout/{account_id}")
def create_payout(account_id: str, amount: Optional[int] = None):
    """
    Trigger an instant payout to franchisee's bank account.
    If amount is not specified, pays out the entire available balance.
    """
    try:
        # Get account balance
        balance = stripe.Balance.retrieve(stripe_account=account_id)
        available = balance.available[0].amount if balance.available else 0
        
        if amount is None:
            amount = available
        
        if amount <= 0:
            return {
                "success": False,
                "message": "No funds available for payout",
                "availableBalance": available
            }
        
        # Create payout
        payout = stripe.Payout.create(
            amount=amount,
            currency="cad",
            stripe_account=account_id
        )
        
        return {
            "success": True,
            "payoutId": payout.id,
            "amount": payout.amount,
            "status": payout.status,
            "arrivalDate": payout.arrival_date
        }
        
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
