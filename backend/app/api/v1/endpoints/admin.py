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
