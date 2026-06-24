from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Appointment, TherapistProfile, User, Payment, Review
from app.services.email_service import (
    send_appointment_confirmation_email,
    send_appointment_reminder_email,
    send_appointment_cancelled_email,
)
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class AppointmentCreate(BaseModel):
    therapist_id: int
    scheduled_at: str
    duration_mins: int = 25
    session_type: str = "video"
    notes: Optional[str] = None


class ReviewCreate(BaseModel):
    rating: int
    comment: str


async def get_enriched_appointment(appt, db):
    therapist_profile = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.id == appt.therapist_id)
    )
    therapist_user = None
    if therapist_profile:
        therapist_user = await db.scalar(
            select(User).where(User.id == therapist_profile.user_id)
        )

    patient_user = await db.scalar(
        select(User).where(User.id == appt.user_id)
    )

    return {
        "id": appt.id,
        "user_id": appt.user_id,
        "patient_name": patient_user.full_name if patient_user else f"Patient #{appt.user_id}",
        "patient_email": patient_user.email if patient_user else None,
        "patient_picture": patient_user.profile_picture if patient_user else None,
        "therapist_id": appt.therapist_id,
        "therapist_user_id": therapist_user.id if therapist_user else None,
        "therapist_email": therapist_user.email if therapist_user else None,
        "therapist_name": therapist_user.full_name if therapist_user else f"Therapist #{appt.therapist_id}",
        "therapist_picture": therapist_user.profile_picture if therapist_user else None,
        "scheduled_at": str(appt.scheduled_at),
        "duration_mins": appt.duration_mins,
        "session_type": appt.session_type,
        "status": appt.status,
        "meeting_link": appt.meeting_link,
        "notes": appt.notes,
        "created_at": str(appt.created_at),
        "updated_at": str(appt.updated_at),
    }


# ── IMPORTANT: specific routes BEFORE parameterized routes ──────────────────

@router.get("/reviews/therapist/{therapist_id}")
async def get_therapist_reviews(
    therapist_id: int,
    db: AsyncSession = Depends(get_db)
):
    reviews = await db.scalars(
        select(Review).where(Review.therapist_id == therapist_id)
        .order_by(Review.created_at.desc())
    )
    result = []
    for r in reviews:
        user = await db.scalar(select(User).where(User.id == r.user_id))
        result.append({
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": str(r.created_at),
            "user_name": user.full_name if user else f"User #{r.user_id}",
            "user_id": r.user_id,
        })
    return result


@router.get("")
async def list_appointments(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == 'therapist':
        profile = await db.scalar(
            select(TherapistProfile).where(TherapistProfile.user_id == current_user.id)
        )
        if not profile:
            await db.commit()
            return []
        appts = await db.scalars(
            select(Appointment).where(
                Appointment.therapist_id == profile.id
            ).order_by(Appointment.scheduled_at.desc())
        )
    else:
        appts = await db.scalars(
            select(Appointment).where(
                Appointment.user_id == current_user.id
            ).order_by(Appointment.scheduled_at.desc())
        )

    result = []
    for appt in appts:
        result.append(await get_enriched_appointment(appt, db))

    await db.commit()
    return result


@router.post("")
async def create_appointment(
    body: AppointmentCreate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    therapist = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.id == body.therapist_id)
    )
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    therapist_user = await db.scalar(
        select(User).where(User.id == therapist.user_id)
    )

    try:
        scheduled_at = datetime.fromisoformat(body.scheduled_at.replace('Z', '+00:00'))
    except Exception:
        scheduled_at = datetime.fromisoformat(body.scheduled_at)

    appt = Appointment(
        user_id=current_user.id,
        therapist_id=body.therapist_id,
        scheduled_at=scheduled_at,
        duration_mins=25,
        session_type=body.session_type,
        status='pending',
        notes=body.notes,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)

    # Format scheduled time for emails
    scheduled_str = scheduled_at.strftime("%d %b %Y at %I:%M %p")

    # Send confirmation email to patient
    background_tasks.add_task(
        send_appointment_confirmation_email,
        to_email=current_user.email,
        patient_name=current_user.full_name,
        therapist_name=therapist_user.full_name if therapist_user else "Your Therapist",
        scheduled_at=scheduled_str,
        session_type=body.session_type,
        role="patient",
    )

    # Send notification email to therapist
    if therapist_user:
        background_tasks.add_task(
            send_appointment_confirmation_email,
            to_email=therapist_user.email,
            patient_name=current_user.full_name,
            therapist_name=therapist_user.full_name,
            scheduled_at=scheduled_str,
            session_type=body.session_type,
            role="therapist",
        )

    return await get_enriched_appointment(appt, db)


@router.get("/{appointment_id}")
async def get_appointment(
    appointment_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    appt = await db.scalar(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return await get_enriched_appointment(appt, db)


@router.put("/{appointment_id}/confirm")
async def confirm_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != 'therapist':
        raise HTTPException(status_code=403, detail="Only therapists can confirm appointments")

    profile = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.user_id == current_user.id)
    )
    appt = await db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.therapist_id == (profile.id if profile else -1)
        )
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = 'confirmed'
    await db.commit()

    # Send confirmation to patient
    patient = await db.get(User, appt.user_id)
    therapist_user = await db.get(User, current_user.id)
    scheduled_str = appt.scheduled_at.strftime("%d %b %Y at %I:%M %p")

    if patient:
        background_tasks.add_task(
            send_appointment_reminder_email,
            to_email=patient.email,
            patient_name=patient.full_name,
            therapist_name=therapist_user.full_name if therapist_user else "Your Therapist",
            scheduled_at=scheduled_str,
            session_type=str(appt.session_type),
        )

    return {"message": "Appointment confirmed"}


@router.put("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    appt = await db.scalar(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = 'cancelled'
    await db.commit()

    # Send cancellation email
    enriched = await get_enriched_appointment(appt, db)
    scheduled_str = appt.scheduled_at.strftime("%d %b %Y at %I:%M %p")

    if enriched.get('patient_email'):
        background_tasks.add_task(
            send_appointment_cancelled_email,
            to_email=enriched['patient_email'],
            patient_name=enriched['patient_name'],
            therapist_name=enriched['therapist_name'],
            scheduled_at=scheduled_str,
            session_type=str(appt.session_type),
        )

    return {"message": "Appointment cancelled"}


@router.put("/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == 'therapist':
        profile = await db.scalar(
            select(TherapistProfile).where(TherapistProfile.user_id == current_user.id)
        )
        appt = await db.scalar(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.therapist_id == (profile.id if profile else -1)
            )
        )
    else:
        appt = await db.scalar(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.user_id == current_user.id
            )
        )

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = 'completed'
    await db.commit()
    return {"message": "Appointment completed"}


@router.post("/{appointment_id}/review")
async def create_review(
    appointment_id: int,
    body: ReviewCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    appt = await db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.user_id == current_user.id,
        )
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    existing = await db.scalar(
        select(Review).where(
            Review.appointment_id == appointment_id,
            Review.user_id == current_user.id
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Review already submitted for this session")

    review = Review(
        appointment_id=appointment_id,
        user_id=current_user.id,
        therapist_id=appt.therapist_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    await db.flush()

    therapist = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.id == appt.therapist_id)
    )
    if therapist:
        all_reviews = await db.scalars(
            select(Review).where(Review.therapist_id == appt.therapist_id)
        )
        reviews_list = list(all_reviews)
        if reviews_list:
            avg = sum(r.rating for r in reviews_list) / len(reviews_list)
            therapist.rating = round(avg, 1)
            therapist.total_reviews = len(reviews_list)

    await db.commit()
    return {"message": "Review submitted successfully!"}