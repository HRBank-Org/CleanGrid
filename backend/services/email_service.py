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

# Frontend URL for links in emails
FRONTEND_URL = os.getenv("FRONTEND_URL", "" + FRONTEND_URL + "")


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
        <a href="" + FRONTEND_URL + "/bookings" class="button">View My Bookings</a>
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
        <a href="" + FRONTEND_URL + "/bookings" class="button">View Booking Details</a>
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
        <a href="" + FRONTEND_URL + "/bookings/{booking_id}/review" class="button">Leave a Review</a>
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
        <a href="" + FRONTEND_URL + "/book" class="button">Book Again</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"Booking Cancelled - #{booking_id[:8].upper()}",
        html_content=get_base_template(content),
        to_name=customer_name
    )


def send_booking_cancelled_email(
    to_email: str,
    customer_name: str,
    booking_id: str,
    refund_amount: float,
    refund_percentage: int
) -> bool:
    """Send detailed cancellation email with refund info based on policy"""
    
    if refund_percentage == 100:
        refund_text = f"""
        <div class="info-box" style="background: #f0fdf4; border-color: #bbf7d0;">
            <p style="margin: 0; color: #166534;">
                <strong>✅ Full Refund:</strong> ${refund_amount:.2f} CAD will be refunded to your card within 5-10 business days.
            </p>
        </div>
        """
        policy_text = "You cancelled more than 24 hours before your scheduled appointment."
    elif refund_percentage == 50:
        refund_text = f"""
        <div class="info-box" style="background: #fef3c7; border-color: #fcd34d;">
            <p style="margin: 0; color: #92400e;">
                <strong>⚠️ Partial Refund:</strong> ${refund_amount:.2f} CAD (50%) will be refunded to your card within 5-10 business days.
            </p>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 13px;">
                A ${refund_amount:.2f} CAD cancellation fee applies as you cancelled within 12-24 hours of your appointment.
            </p>
        </div>
        """
        policy_text = "You cancelled between 12-24 hours before your scheduled appointment."
    else:
        refund_text = f"""
        <div class="info-box" style="background: #fef2f2; border-color: #fecaca;">
            <p style="margin: 0; color: #991b1b;">
                <strong>❌ No Refund:</strong> Unfortunately, cancellations within 12 hours of the scheduled appointment are not eligible for a refund.
            </p>
        </div>
        """
        policy_text = "You cancelled less than 12 hours before your scheduled appointment."
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Booking Cancelled</h2>
    <p style="color: #6b7280;">Hi {customer_name},</p>
    <p style="color: #6b7280;">Your booking (#{booking_id[:8].upper()}) has been cancelled.</p>
    
    {refund_text}
    
    <p style="color: #6b7280; font-size: 14px;">{policy_text}</p>
    
    <div class="info-box" style="background: #f9fafb; border-color: #e5e7eb;">
        <h4 style="margin: 0 0 8px 0; color: #374151;">Our Cancellation Policy:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 13px;">
            <li>24+ hours before: Full refund (100%)</li>
            <li>12-24 hours before: Partial refund (50%)</li>
            <li>Less than 12 hours: No refund</li>
        </ul>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
        Need to rebook? We'd love to have you back!
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="" + FRONTEND_URL + "/book" class="button">Book Again</a>
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
        <a href="" + FRONTEND_URL + "/book" class="button">Book Your First Cleaning</a>
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
        <a href="" + FRONTEND_URL + "/franchisee/jobs" class="button">View Job Details</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"New Job Available - {service_name} on {scheduled_date}",
        html_content=get_base_template(content),
        to_name=franchisee_name
    )



def send_password_reset_email(to_email: str, name: str, reset_token: str) -> bool:
    """Send password reset email"""
    
    reset_url = f"" + FRONTEND_URL + "/reset-password?token={reset_token}"
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Reset Your Password 🔐</h2>
    <p style="color: #6b7280;">Hi {name},</p>
    <p style="color: #6b7280;">We received a request to reset your CleanGrid password. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}" class="button">Reset Password</a>
    </div>
    
    <div class="info-box" style="background: #fef3c7; border-color: #fcd34d;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>⏰ This link expires in 1 hour.</strong><br>
            If you didn't request a password reset, you can safely ignore this email.
        </p>
    </div>
    
    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="{reset_url}" style="color: #10B981; word-break: break-all;">{reset_url}</a>
    </p>
    """
    
    return send_email(
        to_email=to_email,
        subject="Reset Your CleanGrid Password",
        html_content=get_base_template(content),
        to_name=name
    )


def send_password_changed_email(to_email: str, name: str) -> bool:
    """Send confirmation email when password is changed"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Password Changed ✅</h2>
    <p style="color: #6b7280;">Hi {name},</p>
    <p style="color: #6b7280;">Your CleanGrid password has been successfully changed.</p>
    
    <div class="info-box" style="background: #fef2f2; border-color: #fecaca;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
            <strong>Didn't make this change?</strong><br>
            If you didn't change your password, please contact us immediately at support@cleangrid.at
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="" + FRONTEND_URL + "/login" class="button">Log In Now</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject="Your CleanGrid Password Has Been Changed",
        html_content=get_base_template(content),
        to_name=name
    )



# ==================== WORKER EMAILS ====================

def send_worker_invite_email(
    to_email: str,
    worker_name: str,
    franchisee_name: str,
    invite_code: str
) -> bool:
    """Send invitation email to a new worker"""
    
    invite_url = f"" + FRONTEND_URL + "/worker/join?code={invite_code}"
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">You're Invited to Join CleanGrid!</h2>
    <p style="color: #6b7280;">Hi {worker_name},</p>
    <p style="color: #6b7280;">
        <strong>{franchisee_name}</strong> has invited you to join their cleaning team on CleanGrid.
    </p>
    
    <div class="info-box" style="background: #f0fdf4; border-color: #bbf7d0;">
        <h4 style="margin: 0 0 8px 0; color: #166534;">What's Next?</h4>
        <ol style="margin: 0; padding-left: 20px; color: #166534;">
            <li>Click the button below to create your account</li>
            <li>Complete the required training courses</li>
            <li>Start accepting cleaning jobs!</li>
        </ol>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{invite_url}" class="button">Accept Invitation</a>
    </div>
    
    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
        This invitation expires in 7 days. If you didn't expect this email, please ignore it.
    </p>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"Join {franchisee_name}'s Team on CleanGrid",
        html_content=get_base_template(content),
        to_name=worker_name
    )


def send_worker_welcome_email(
    to_email: str,
    worker_name: str,
    franchisee_name: str
) -> bool:
    """Send welcome email after worker creates account"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">Welcome to CleanGrid, {worker_name}!</h2>
    <p style="color: #6b7280;">
        Your account has been created and you're now part of <strong>{franchisee_name}'s</strong> team.
    </p>
    
    <div class="info-box">
        <h4 style="margin: 0 0 12px 0; color: #374151;">Before You Start</h4>
        <p style="color: #6b7280; margin: 0;">
            You'll need to complete our training courses to ensure you deliver the CleanGrid quality experience. 
            The training covers:
        </p>
        <ul style="color: #6b7280; margin: 12px 0 0 0; padding-left: 20px;">
            <li>Basic Cleaning SOP</li>
            <li>Equipment Operation</li>
            <li>Customer Service Standards</li>
        </ul>
    </div>
    
    <p style="color: #6b7280;">
        Once you complete all training, you'll be eligible to receive job assignments.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="" + FRONTEND_URL + "/worker/training" class="button">Start Training</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject="Welcome to CleanGrid - Complete Your Training",
        html_content=get_base_template(content),
        to_name=worker_name
    )


def send_worker_training_complete_email(
    to_email: str,
    worker_name: str
) -> bool:
    """Send email when worker completes all training"""
    
    content = f"""
    <h2 style="color: #111827; margin-bottom: 8px;">🎉 Training Complete!</h2>
    <p style="color: #6b7280;">Congratulations, {worker_name}!</p>
    <p style="color: #6b7280;">
        You've successfully completed all required CleanGrid training courses. 
        You're now eligible to receive job assignments.
    </p>
    
    <div class="info-box" style="background: #f0fdf4; border-color: #bbf7d0;">
        <p style="margin: 0; color: #166534;">
            <strong>You're all set!</strong> Your franchisee will now be able to assign you to cleaning jobs.
            Make sure to keep your availability updated in the app.
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="" + FRONTEND_URL + "/worker" class="button">Go to Dashboard</a>
    </div>
    """
    
    return send_email(
        to_email=to_email,
        subject="Training Complete - You're Ready to Work!",
        html_content=get_base_template(content),
        to_name=worker_name
    )
