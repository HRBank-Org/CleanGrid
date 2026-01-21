"""
SendGrid Email Service for CleanGrid
Handles all transactional emails: booking confirmations, status updates, etc.
"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent
from dotenv import load_dotenv
from typing import Optional, List
from datetime import datetime

load_dotenv()

# SendGrid Configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@cleangrid.at")
FROM_NAME = os.getenv("SENDGRID_FROM_NAME", "CleanGrid")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    to_name: Optional[str] = None
) -> bool:
    """Send an email using SendGrid"""
    try:
        if not SENDGRID_API_KEY:
            print("SendGrid API key not configured")
            return False
            
        message = Mail(
            from_email=Email(FROM_EMAIL, FROM_NAME),
            to_emails=To(to_email, to_name),
            subject=subject,
            html_content=HtmlContent(html_content)
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        print(f"Email sent to {to_email}: Status {response.status_code}")
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False


# Email Templates
def get_base_template(content: str) -> str:
    """Wrap content in base email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; }}
            .header {{ background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ padding: 30px; }}
            .button {{ display: inline-block; background: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }}
            .footer {{ background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }}
            .detail-label {{ color: #6b7280; }}
            .detail-value {{ font-weight: 600; color: #111827; }}
            .price {{ font-size: 24px; color: #10B981; font-weight: 700; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CleanGrid</h1>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <p>© 2026 CleanGrid. All rights reserved.</p>
                <p>Questions? Contact us at support@cleangrid.at</p>
            </div>
        </div>
    </body>
    </html>
    """


def send_booking_confirmation(
    to_email: str,
    customer_name: str,
    booking_id: str,
    service_name: str,
    address: str,
    scheduled_date: str,
    scheduled_time: str,
    total_price: float
) -> bool:
    """Send booking confirmation email to customer"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Booking Confirmed! 🎉</h2>
    <p style="color: #6b7280;">Hi {customer_name},</p>
    <p style="color: #6b7280;">Your cleaning has been booked successfully. Here are your booking details:</p>
    
    <div class="info-box">
        <div class="detail-row">
            <span class="detail-label">Booking ID</span>
            <span class="detail-value">#{booking_id[:8].upper()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">{service_name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Address</span>
            <span class="detail-value">{address}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">{scheduled_date}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">{scheduled_time}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Total</span>
            <span class="price">${total_price:.2f} CAD</span>
        </div>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
        <strong>💳 Payment:</strong> Your card has been authorized. You'll only be charged once the cleaning is complete and you're satisfied.
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
        <strong>📱 What's next:</strong> We're assigning a trusted cleaning professional to your booking. You'll receive another email once confirmed.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="https://cleangrid.at/bookings" class="button">View My Bookings</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"Booking Confirmed - {service_name} on {scheduled_date}",
        html_content=get_base_template(content),
        to_name=customer_name
    )


def send_booking_assigned(
    to_email: str,
    customer_name: str,
    booking_id: str,
    franchisee_name: str,
    scheduled_date: str,
    scheduled_time: str
) -> bool:
    """Send email when a franchisee is assigned to the booking"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Your Cleaner is Assigned! ✨</h2>
    <p style="color: #6b7280;">Hi {customer_name},</p>
    <p style="color: #6b7280;">Great news! A cleaning professional has been assigned to your booking.</p>
    
    <div class="info-box">
        <div class="detail-row">
            <span class="detail-label">Cleaning Team</span>
            <span class="detail-value">{franchisee_name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">{scheduled_date}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Time Window</span>
            <span class="detail-value">{scheduled_time}</span>
        </div>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
        Your cleaner will arrive during the scheduled time window. Please ensure access to your property.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="https://cleangrid.at/bookings" class="button">View Booking Details</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"Cleaner Assigned - {franchisee_name} on {scheduled_date}",
        html_content=get_base_template(content),
        to_name=customer_name
    )


def send_booking_completed(
    to_email: str,
    customer_name: str,
    booking_id: str,
    service_name: str,
    total_charged: float
) -> bool:
    """Send email when cleaning is completed"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Cleaning Complete! 🏠✨</h2>
    <p style="color: #6b7280;">Hi {customer_name},</p>
    <p style="color: #6b7280;">Your {service_name} has been completed!</p>
    
    <div class="info-box">
        <div class="detail-row">
            <span class="detail-label">Booking ID</span>
            <span class="detail-value">#{booking_id[:8].upper()}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Amount Charged</span>
            <span class="price">${total_charged:.2f} CAD</span>
        </div>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
        Your card has been charged. Thank you for choosing CleanGrid!
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
        <strong>⭐ Rate your experience:</strong> Help us improve by leaving a review.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="https://cleangrid.at/bookings/{booking_id}/review" class="button">Leave a Review</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"Cleaning Complete - Thanks for using CleanGrid!",
        html_content=get_base_template(content),
        to_name=customer_name
    )


def send_booking_cancelled(
    to_email: str,
    customer_name: str,
    booking_id: str,
    service_name: str,
    refund_amount: Optional[float] = None
) -> bool:
    """Send email when booking is cancelled"""
    
    refund_text = ""
    if refund_amount:
        refund_text = f"""
        <div class="info-box" style="background: #fef2f2; border-color: #fecaca;">
            <p style="margin: 0; color: #991b1b;">
                <strong>Refund:</strong> ${refund_amount:.2f} CAD will be refunded to your card within 5-10 business days.
            </p>
        </div>
        """
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Booking Cancelled</h2>
    <p style="color: #6b7280;">Hi {customer_name},</p>
    <p style="color: #6b7280;">Your booking for {service_name} (#{booking_id[:8].upper()}) has been cancelled.</p>
    
    {refund_text}
    
    <p style="color: #6b7280; font-size: 14px;">
        We're sorry to see you go. If you have any questions, please contact us.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="https://cleangrid.at/book" class="button">Book Again</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"Booking Cancelled - #{booking_id[:8].upper()}",
        html_content=get_base_template(content),
        to_name=customer_name
    )


def send_welcome_email(to_email: str, name: str) -> bool:
    """Send welcome email to new customers"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Welcome to CleanGrid! 🎉</h2>
    <p style="color: #6b7280;">Hi {name},</p>
    <p style="color: #6b7280;">Thank you for joining CleanGrid! We're excited to help keep your space spotless.</p>
    
    <div class="info-box">
        <h3 style="margin-top: 0; color: #111827;">What you can do:</h3>
        <ul style="color: #6b7280; padding-left: 20px;">
            <li>📅 Book residential or commercial cleaning</li>
            <li>💰 Get instant quotes with transparent pricing</li>
            <li>⭐ Choose from trusted, vetted professionals</li>
            <li>🔄 Set up recurring cleanings and save up to 15%</li>
        </ul>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="https://cleangrid.at/book" class="button">Book Your First Cleaning</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject="Welcome to CleanGrid! 🏠✨",
        html_content=get_base_template(content),
        to_name=name
    )


def send_franchisee_new_job(
    to_email: str,
    franchisee_name: str,
    job_id: str,
    service_name: str,
    address: str,
    scheduled_date: str,
    payout_amount: float
) -> bool:
    """Send email to franchisee when new job is assigned"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">New Job Available! 💼</h2>
    <p style="color: #6b7280;">Hi {franchisee_name},</p>
    <p style="color: #6b7280;">A new cleaning job has been assigned to your territory.</p>
    
    <div class="info-box">
        <div class="detail-row">
            <span class="detail-label">Job ID</span>
            <span class="detail-value">#{job_id[:8].upper()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Service</span>
            <span class="detail-value">{service_name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Location</span>
            <span class="detail-value">{address}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">{scheduled_date}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Your Payout</span>
            <span class="price">${payout_amount:.2f}</span>
        </div>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
        Please accept or decline this job within 2 hours.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="https://cleangrid.at/franchisee/jobs" class="button">View Job Details</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"New Job Available - {service_name} on {scheduled_date}",
        html_content=get_base_template(content),
        to_name=franchisee_name
    )
