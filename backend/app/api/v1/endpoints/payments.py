from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import hmac
import hashlib

from app.core.database import get_db
from app.core.security import get_current_user, require_user
from app.core.config import settings
from app.models.models import Payment, Appointment, PaymentStatus


# router = APIRouter(prefix="/payments", tags=["Payments"])
router = APIRouter(tags=["Payments"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    appointment_id: int


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id:   str
    razorpay_payment_id: str
    razorpay_signature:  str
    appointment_id:      int


class PaymentResponse(BaseModel):
    id:                  int
    user_id:             int
    appointment_id:      Optional[int]
    amount:              float
    currency:            str
    razorpay_order_id:   Optional[str]
    razorpay_payment_id: Optional[str]
    status:              str
    created_at:          datetime

    class Config:
        from_attributes = True


# ── Create Razorpay Order ─────────────────────────────────────────────────────
@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    appointment = await db.get(Appointment, body.appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    from app.models.models import TherapistProfile
    therapist = await db.get(TherapistProfile, appointment.therapist_id)
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    amount_paise = int(therapist.session_fee * 100)

    try:
        import requests
        auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        response = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=auth,
            json={
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
            }
        )
        order = response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {str(e)}")

    payment = Payment(
        user_id=current_user.id,
        appointment_id=body.appointment_id,
        amount=therapist.session_fee,
        currency="INR",
        razorpay_order_id=order["id"],
        status=PaymentStatus.pending,
    )
    db.add(payment)
    await db.commit()

    return {
        "order_id": order["id"],
        "amount":   amount_paise,
        "currency": "INR",
        "key_id":   settings.RAZORPAY_KEY_ID,
    }


# ── Verify Payment ────────────────────────────────────────────────────────────
@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
    current_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    generated_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256
    ).hexdigest()

    if generated_signature != body.razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    result = await db.execute(
        select(Payment).where(
            Payment.razorpay_order_id == body.razorpay_order_id
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    payment.razorpay_payment_id = body.razorpay_payment_id
    payment.razorpay_signature  = body.razorpay_signature
    payment.status              = PaymentStatus.success

    await db.commit()
    return {"message": "Payment verified successfully", "status": "success"}


# ── Payment History ───────────────────────────────────────────────────────────
@router.get("/history", response_model=List[PaymentResponse])
async def payment_history(
    current_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Payment).where(
            Payment.user_id == current_user.id
        ).order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()
    return payments


# ── Get Single Payment ────────────────────────────────────────────────────────
@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return payment
