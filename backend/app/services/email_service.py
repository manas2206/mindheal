import httpx
import os
from app.core.config import settings

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"
FROM_EMAIL = "mwp.counseling@gmail.com"
FROM_NAME = "MindHeal"


async def send_otp_email(email: str, otp: str, full_name: str):
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="background-color: #16a34a; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">💚 MindHeal</h1>
          <p style="color: #dcfce7; margin: 5px 0;">Mental Wellness Platform</p>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1a2332;">Hello {full_name}!</h2>
          <p style="color: #6b7280;">Use the OTP below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 10px;
              color: #16a34a;
              background: #dcfce7;
              padding: 15px 30px;
              border-radius: 10px;
            ">{otp}</span>
          </div>
          <p style="color: #6b7280;">This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #6b7280;">If you did not register, please ignore this email.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>© 2026 MindHeal — mwp.counseling@gmail.com</p>
        </div>
      </body>
    </html>
    """

    payload = {
        "personalizations": [{"to": [{"email": email, "name": full_name}]}],
        "from": {"email": FROM_EMAIL, "name": FROM_NAME},
        "subject": "MindHeal — Your OTP Verification Code",
        "content": [{"type": "text/html", "value": html}],
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SENDGRID_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )
            if response.status_code in (200, 202):
                print(f"OTP email sent to {email} via SendGrid ✅")
                return True
            else:
                print(f"SendGrid error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False


async def send_appointment_confirmation_email(
    to_email: str,
    patient_name: str,
    therapist_name: str,
    scheduled_at: str,
    session_type: str
):
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="background-color: #16a34a; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">💚 MindHeal</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1a2332;">Appointment Confirmed! ✅</h2>
          <p style="color: #6b7280;">Hi {patient_name},</p>
          <p style="color: #6b7280;">Your session has been confirmed:</p>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <p style="margin: 8px 0; color: #374151;"><strong>Therapist:</strong> {therapist_name}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {scheduled_at}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Session Type:</strong> {session_type.capitalize()}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Duration:</strong> 50 minutes</p>
          </div>
          <p style="color: #6b7280;">Login to MindHeal to join your session when it's time.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>© 2026 MindHeal — mwp.counseling@gmail.com</p>
        </div>
      </body>
    </html>
    """

    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": patient_name}]}],
        "from": {"email": FROM_EMAIL, "name": FROM_NAME},
        "subject": "MindHeal — Appointment Confirmed ✅",
        "content": [{"type": "text/html", "value": html}],
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SENDGRID_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )
            if response.status_code in (200, 202):
                print(f"Appointment email sent to {to_email} ✅")
                return True
            else:
                print(f"SendGrid error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"Appointment email failed: {e}")
        return False