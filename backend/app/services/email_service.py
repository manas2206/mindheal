import httpx
import os

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"
FROM_EMAIL = "mwp.counseling@gmail.com"
FROM_NAME = "MindHeal"


async def _send_email(to_email: str, to_name: str, subject: str, html: str) -> bool:
    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": to_name}]}],
        "from": {"email": FROM_EMAIL, "name": FROM_NAME},
        "subject": subject,
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
                print(f"✅ Email sent to {to_email}")
                return True
            else:
                print(f"SendGrid error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False


def _base_template(content: str) -> str:
    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f9fafb;">
        <div style="background-color: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💚 MindHeal</h1>
          <p style="color: #dcfce7; margin: 4px 0; font-size: 14px;">Mental Wellness Platform</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; border-radius: 0 0 12px 12px;">
          {content}
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>© 2026 MindHeal — mwp.counseling@gmail.com</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </body>
    </html>
    """


async def send_otp_email(email: str, otp: str, full_name: str) -> bool:
    content = f"""
        <h2 style="color: #1a2332;">Hello {full_name}! 👋</h2>
        <p style="color: #6b7280;">Thank you for registering on MindHeal. Use the OTP below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #16a34a;
            background: #dcfce7; padding: 15px 30px; border-radius: 10px;">{otp}</span>
        </div>
        <p style="color: #6b7280;">This OTP is valid for <strong>10 minutes</strong>.</p>
        <p style="color: #6b7280;">If you did not register, please ignore this email.</p>
    """
    return await _send_email(email, full_name, "MindHeal — Your OTP Verification Code", _base_template(content))


async def send_appointment_confirmation_email(
    to_email: str,
    patient_name: str,
    therapist_name: str,
    scheduled_at: str,
    session_type: str,
    role: str = "patient",
) -> bool:
    if role == "therapist":
        content = f"""
            <h2 style="color: #1a2332;">New Appointment Request 📅</h2>
            <p style="color: #6b7280;">Hi {therapist_name},</p>
            <p style="color: #6b7280;">You have a new appointment request from <strong>{patient_name}</strong>.</p>
            <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <p style="margin: 8px 0; color: #374151;"><strong>Patient:</strong> {patient_name}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {scheduled_at}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Session Type:</strong> {session_type.capitalize()}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Duration:</strong> 25 minutes</p>
            </div>
            <p style="color: #6b7280;">Please login to MindHeal to confirm or reject this appointment.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://mindheal-nine.vercel.app/therapist/dashboard"
                style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px;
                text-decoration: none; font-weight: bold;">View Dashboard</a>
            </div>
        """
        subject = f"MindHeal — New Appointment Request from {patient_name}"
    else:
        content = f"""
            <h2 style="color: #1a2332;">Appointment Booked! 🎉</h2>
            <p style="color: #6b7280;">Hi {patient_name},</p>
            <p style="color: #6b7280;">Your appointment has been booked successfully. Here are your details:</p>
            <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <p style="margin: 8px 0; color: #374151;"><strong>Therapist:</strong> {therapist_name}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {scheduled_at}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Session Type:</strong> {session_type.capitalize()}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Duration:</strong> 25 minutes</p>
              <p style="margin: 8px 0; color: #f59e0b;"><strong>Status:</strong> Pending therapist confirmation</p>
            </div>
            <p style="color: #6b7280;">You'll receive another email once your therapist confirms the appointment.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://mindheal-nine.vercel.app/appointments"
                style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px;
                text-decoration: none; font-weight: bold;">View My Appointments</a>
            </div>
        """
        subject = f"MindHeal — Appointment Booked with {therapist_name}"

    return await _send_email(to_email, patient_name if role == "patient" else therapist_name, subject, _base_template(content))


async def send_appointment_reminder_email(
    to_email: str,
    patient_name: str,
    therapist_name: str,
    scheduled_at: str,
    session_type: str,
) -> bool:
    content = f"""
        <h2 style="color: #1a2332;">Appointment Confirmed ✅</h2>
        <p style="color: #6b7280;">Hi {patient_name},</p>
        <p style="color: #6b7280;">Great news! Your therapist has confirmed your appointment.</p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p style="margin: 8px 0; color: #374151;"><strong>Therapist:</strong> {therapist_name}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {scheduled_at}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Session Type:</strong> {session_type.capitalize()}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Duration:</strong> 25 minutes</p>
          <p style="margin: 8px 0; color: #16a34a;"><strong>Status:</strong> ✅ Confirmed</p>
        </div>
        <p style="color: #6b7280;">💡 <strong>Tip:</strong> The session link will be available 5 minutes before your scheduled time.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://mindheal-nine.vercel.app/appointments"
            style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px;
            text-decoration: none; font-weight: bold;">View My Sessions</a>
        </div>
    """
    return await _send_email(to_email, patient_name, f"MindHeal — Appointment Confirmed with {therapist_name}", _base_template(content))


async def send_appointment_cancelled_email(
    to_email: str,
    patient_name: str,
    therapist_name: str,
    scheduled_at: str,
    session_type: str,
) -> bool:
    content = f"""
        <h2 style="color: #1a2332;">Appointment Cancelled ❌</h2>
        <p style="color: #6b7280;">Hi {patient_name},</p>
        <p style="color: #6b7280;">Your appointment has been cancelled. Here were the details:</p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 8px 0; color: #374151;"><strong>Therapist:</strong> {therapist_name}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> {scheduled_at}</p>
          <p style="margin: 8px 0; color: #374151;"><strong>Session Type:</strong> {session_type.capitalize()}</p>
          <p style="margin: 8px 0; color: #ef4444;"><strong>Status:</strong> Cancelled</p>
        </div>
        <p style="color: #6b7280;">You can book a new session anytime on MindHeal.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://mindheal-nine.vercel.app/therapists"
            style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px;
            text-decoration: none; font-weight: bold;">Book New Session</a>
        </div>
    """
    return await _send_email(to_email, patient_name, f"MindHeal — Appointment Cancelled", _base_template(content))