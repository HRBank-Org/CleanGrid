"""
Twilio SMS Service for CleanGrid
Handles all SMS notifications: booking confirmations, reminders, status updates
"""
import os
from twilio.rest import Client
from dotenv import load_dotenv
from typing import Optional
import logging

load_dotenv()

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        logging.error(f"Failed to initialize Twilio client: {e}")


def send_sms(to_number: str, message: str) -> dict:
    """
    Send an SMS message using Twilio
    
    Args:
        to_number: Recipient phone number (E.164 format: +1234567890)
        message: SMS message content (max 1600 chars for long SMS)
    
    Returns:
        dict with success status and message sid or error
    """
    try:
        if not twilio_client:
            logging.warning("Twilio client not initialized - SMS not sent")
            return {"success": False, "error": "Twilio not configured"}
        
        if not to_number:
            return {"success": False, "error": "No phone number provided"}
        
        # Ensure phone number is in E.164 format
        if not to_number.startswith('+'):
            # Assume Canadian/US number if no country code
            to_number = f"+1{to_number.replace('-', '').replace(' ', '').replace('(', '').replace(')', '')}"
        
        # Send the SMS
        sms = twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_number
        )
        
        logging.info(f"SMS sent to {to_number}: SID {sms.sid}")
        return {
            "success": True,
            "sid": sms.sid,
            "status": sms.status
        }
        
    except Exception as e:
        logging.error(f"Failed to send SMS to {to_number}: {str(e)}")
        return {"success": False, "error": str(e)}


# SMS Templates
def send_booking_confirmation_sms(
    to_number: str,
    customer_name: str,
    service_name: str,
    scheduled_date: str,
    scheduled_time: str
) -> dict:
    """Send booking confirmation SMS to customer"""
    
    message = f"""✅ CleanGrid Booking Confirmed!

Hi {customer_name.split()[0]}, your {service_name} is booked for {scheduled_date} at {scheduled_time}.

We'll text you when your cleaner is on the way.

View details: cleangrid.at/bookings"""
    
    return send_sms(to_number, message)


def send_cleaner_assigned_sms(
    to_number: str,
    customer_name: str,
    franchisee_name: str,
    scheduled_date: str,
    scheduled_time: str
) -> dict:
    """Send SMS when cleaner is assigned"""
    
    message = f"""🏠 CleanGrid Update

Hi {customer_name.split()[0]}, {franchisee_name} has been assigned to your cleaning on {scheduled_date} at {scheduled_time}.

Questions? Reply to this text or call us."""
    
    return send_sms(to_number, message)


def send_cleaner_on_way_sms(
    to_number: str,
    customer_name: str,
    eta_minutes: int = 15
) -> dict:
    """Send SMS when cleaner is en route"""
    
    message = f"""🚗 Your cleaner is on the way!

Hi {customer_name.split()[0]}, your CleanGrid cleaner will arrive in approximately {eta_minutes} minutes.

Please ensure access to your property."""
    
    return send_sms(to_number, message)


def send_cleaning_complete_sms(
    to_number: str,
    customer_name: str,
    total_charged: float
) -> dict:
    """Send SMS when cleaning is completed"""
    
    message = f"""✨ Cleaning Complete!

Hi {customer_name.split()[0]}, your cleaning is done! ${total_charged:.2f} has been charged to your card.

How did we do? Rate your experience: cleangrid.at/review"""
    
    return send_sms(to_number, message)


def send_booking_reminder_sms(
    to_number: str,
    customer_name: str,
    service_name: str,
    scheduled_date: str,
    scheduled_time: str
) -> dict:
    """Send reminder SMS 24 hours before cleaning"""
    
    message = f"""⏰ Cleaning Reminder

Hi {customer_name.split()[0]}, your {service_name} is tomorrow ({scheduled_date}) at {scheduled_time}.

Need to reschedule? Visit cleangrid.at/bookings"""
    
    return send_sms(to_number, message)


def send_booking_cancelled_sms(
    to_number: str,
    customer_name: str,
    booking_id: str,
    refund_amount: Optional[float] = None
) -> dict:
    """Send SMS when booking is cancelled"""
    
    refund_text = f" ${refund_amount:.2f} will be refunded." if refund_amount else ""
    
    message = f"""❌ Booking Cancelled

Hi {customer_name.split()[0]}, your CleanGrid booking #{booking_id[:8].upper()} has been cancelled.{refund_text}

Book again: cleangrid.at/book"""
    
    return send_sms(to_number, message)


# Franchisee SMS notifications
def send_new_job_sms(
    to_number: str,
    franchisee_name: str,
    service_name: str,
    address: str,
    payout_amount: float
) -> dict:
    """Send SMS to franchisee for new job assignment"""
    
    message = f"""💼 New Job Available!

Hi {franchisee_name.split()[0]}, new {service_name} job:
📍 {address}
💰 ${payout_amount:.2f}

Accept in app: cleangrid.at/franchisee/jobs"""
    
    return send_sms(to_number, message)


def send_job_reminder_sms(
    to_number: str,
    franchisee_name: str,
    service_name: str,
    address: str,
    scheduled_time: str
) -> dict:
    """Send reminder to franchisee before job"""
    
    message = f"""⏰ Job Reminder

Hi {franchisee_name.split()[0]}, you have a {service_name} today at {scheduled_time}:
📍 {address}

Start job in app when you arrive."""
    
    return send_sms(to_number, message)


# Verification SMS
def send_verification_code_sms(
    to_number: str,
    code: str
) -> dict:
    """Send verification code SMS"""
    
    message = f"""Your CleanGrid verification code is: {code}

This code expires in 10 minutes. Don't share this code with anyone."""
    
    return send_sms(to_number, message)
