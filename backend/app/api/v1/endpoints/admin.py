from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.models import (
    User, TherapistProfile, Appointment,
    Payment, MoodLog, Review,
    VerificationStatus, AppointmentStatus
)


# router = APIRouter(prefix="/admin", tags=["Admin"])
router = APIRouter(tags=["Admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    id:          int
    full_name:   str
    email:       str
    role:        str
    is_active:   bool
    is_verified: bool
    created_at:  datetime

    class Config:
        from_attributes = True


class VerifyTherapistRequest(BaseModel):
    status: str  # verified or rejected


# ── List All Users ────────────────────────────────────────────────────────────
@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    role:    Optional[str] = Query(None),
    page:    int = Query(1, ge=1),
    limit:   int = Query(20, le=100),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    if role:
        query = query.where(User.role == role)

    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()
    return users


# ── Get Single User ───────────────────────────────────────────────────────────
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Activate or Deactivate User ───────────────────────────────────────────────
@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    await db.commit()
    status = "activated" if user.is_active else "deactivated"
    return {"message": f"User {status} successfully"}


# ── List Pending Therapists ───────────────────────────────────────────────────
@router.get("/therapists/pending")
async def list_pending_therapists(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TherapistProfile).where(
            TherapistProfile.verification_status == VerificationStatus.pending
        )
    )
    therapists = result.scalars().all()
    return {"pending_therapists": [
        {
            "id":               t.id,
            "user_id":          t.user_id,
            "license_number":   t.license_number,
            "specializations":  t.specializations,
            "experience_years": t.experience_years,
            "session_fee":      float(t.session_fee),
        }
        for t in therapists
    ]}


# ── Verify or Reject Therapist ────────────────────────────────────────────────
@router.put("/therapists/{therapist_id}/verify")
async def verify_therapist(
    therapist_id: int,
    body: VerifyTherapistRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if body.status not in ["verified", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be verified or rejected"
        )

    therapist = await db.get(TherapistProfile, therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    therapist.verification_status = VerificationStatus(body.status)
    await db.commit()
    return {"message": f"Therapist {body.status} successfully"}


# ── Platform Analytics ────────────────────────────────────────────────────────
@router.get("/analytics")
async def platform_analytics(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Total users
    total_users = await db.scalar(
        select(func.count(User.id))
    )

    # Total therapists
    total_therapists = await db.scalar(
        select(func.count(TherapistProfile.id))
    )

    # Verified therapists
    verified_therapists = await db.scalar(
        select(func.count(TherapistProfile.id)).where(
            TherapistProfile.verification_status == VerificationStatus.verified
        )
    )

    # Total appointments
    total_appointments = await db.scalar(
        select(func.count(Appointment.id))
    )

    # Completed appointments
    completed_appointments = await db.scalar(
        select(func.count(Appointment.id)).where(
            Appointment.status == AppointmentStatus.completed
        )
    )

    # Total revenue
    total_revenue = await db.scalar(
        select(func.sum(Payment.amount)).where(
            Payment.status == "success"
        )
    )

    return {
        "total_users":             total_users or 0,
        "total_therapists":        total_therapists or 0,
        "verified_therapists":     verified_therapists or 0,
        "total_appointments":      total_appointments or 0,
        "completed_appointments":  completed_appointments or 0,
        "total_revenue":           float(total_revenue or 0),
    }


# ── All Payments ──────────────────────────────────────────────────────────────
@router.get("/payments")
async def all_payments(
    page:  int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Payment)
        .order_by(Payment.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    payments = result.scalars().all()
    return {"payments": [
        {
            "id":                  p.id,
            "user_id":             p.user_id,
            "appointment_id":      p.appointment_id,
            "amount":              float(p.amount),
            "currency":            p.currency,
            "razorpay_order_id":   p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "status":              p.status,
            "created_at":          p.created_at,
        }
        for p in payments
    ]}


# ── All Reviews ───────────────────────────────────────────────────────────────
@router.get("/reviews")
async def all_reviews(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Review).order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()
    return {"reviews": [
        {
            "id":           r.id,
            "therapist_id": r.therapist_id,
            "user_id":      r.user_id,
            "rating":       r.rating,
            "comment":      r.comment,
            "created_at":   r.created_at,
        }
        for r in reviews
    ]}



# --------------------------------addd this at the end of   backend/app/api/v1/endpoints/admin.py -------

# ── Session Recordings ──────────────────────────────────────────────────────
from app.models.models import Message

@router.get("/sessions")
async def list_all_sessions(
    session_type: Optional[str] = Query(None),  # chat or video
    page:  int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Appointment).where(
        Appointment.status == AppointmentStatus.completed
    )
    if session_type:
        query = query.where(Appointment.session_type == session_type)

    offset = (page - 1) * limit
    query = query.order_by(Appointment.scheduled_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    appointments = result.scalars().all()

    sessions = []
    for appt in appointments:
        patient = await db.get(User, appt.user_id)
        therapist_profile = await db.get(TherapistProfile, appt.therapist_id)
        therapist_user = await db.get(User, therapist_profile.user_id) if therapist_profile else None

        sessions.append({
            "id": appt.id,
            "patient_id": appt.user_id,
            "patient_name": patient.full_name if patient else "Unknown",
            "therapist_id": appt.therapist_id,
            "therapist_name": therapist_user.full_name if therapist_user else "Unknown",
            "session_type": appt.session_type,
            "scheduled_at": appt.scheduled_at,
            "duration_mins": appt.duration_mins,
            "status": appt.status,
            "has_recording": appt.recording_url is not None if hasattr(appt, 'recording_url') else False,
        })

    return {"sessions": sessions}


@router.get("/sessions/{appointment_id}/chat-transcript")
async def get_chat_transcript(
    appointment_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    appt = await db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    therapist_profile = await db.get(TherapistProfile, appt.therapist_id)
    if not therapist_profile:
        raise HTTPException(status_code=404, detail="Therapist not found")

    therapist_user_id = therapist_profile.user_id

    result = await db.execute(
        select(Message).where(
            ((Message.sender_id == appt.user_id) & (Message.receiver_id == therapist_user_id)) |
            ((Message.sender_id == therapist_user_id) & (Message.receiver_id == appt.user_id))
        ).order_by(Message.sent_at.asc())
    )
    messages = result.scalars().all()

    patient = await db.get(User, appt.user_id)
    therapist_user = await db.get(User, therapist_user_id)

    transcript = []
    for msg in messages:
        sender = patient if msg.sender_id == appt.user_id else therapist_user
        transcript.append({
            "id": msg.id,
            "sender_name": sender.full_name if sender else "Unknown",
            "sender_role": "patient" if msg.sender_id == appt.user_id else "therapist",
            "content": msg.content,
            "sent_at": msg.sent_at,
        })

    return {
        "appointment_id": appointment_id,
        "patient_name": patient.full_name if patient else "Unknown",
        "therapist_name": therapist_user.full_name if therapist_user else "Unknown",
        "transcript": transcript,
    }


@router.get("/sessions/{appointment_id}/video-recording")
async def get_video_recording(
    appointment_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    appt = await db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    recording_url = getattr(appt, 'recording_url', None)
    if not recording_url:
        raise HTTPException(status_code=404, detail="No recording found for this session")

    return {
        "appointment_id": appointment_id,
        "recording_url": recording_url,
    }