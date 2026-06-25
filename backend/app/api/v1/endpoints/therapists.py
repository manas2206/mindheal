from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import TherapistProfile, User, TherapistAvailability
from pydantic import BaseModel
from typing import Optional, List
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def parse_json_field(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except:
            return [value] if value else []
    return value or []


@router.get("/")
async def list_therapists(db: AsyncSession = Depends(get_db)):
    profiles = await db.scalars(
        select(TherapistProfile).where(
            TherapistProfile.verification_status == 'verified'
        )
    )
    result = []
    for p in profiles:
        user = await db.scalar(select(User).where(User.id == p.user_id))
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": user.full_name if user else f"Therapist #{p.id}",
            "profile_picture": user.profile_picture if user else None,
            "specializations": parse_json_field(p.specializations),
            "languages": parse_json_field(p.languages),
            "experience_years": p.experience_years,
            "education": p.education,
            "bio": p.bio,
            "session_fee": p.session_fee,
            "rating": float(p.rating) if p.rating else 4.5,
            "total_reviews": p.total_reviews or 0,
            "is_available": p.is_available,
            "verification_status": p.verification_status,
        })
    return result


@router.get("/profile/me")
async def get_my_therapist_profile(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.user_id == current_user.id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Therapist profile not found")
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": current_user.full_name,
        "profile_picture": current_user.profile_picture,
        "specializations": parse_json_field(profile.specializations),
        "languages": parse_json_field(profile.languages),
        "experience_years": profile.experience_years,
        "education": profile.education,
        "bio": profile.bio,
        "session_fee": profile.session_fee,
        "rating": float(profile.rating) if profile.rating else 4.5,
        "total_reviews": profile.total_reviews or 0,
        "is_available": profile.is_available,
        "verification_status": profile.verification_status,
    }


@router.get("/{therapist_id}")
async def get_therapist(
    therapist_id: int,
    db: AsyncSession = Depends(get_db)
):
    profile = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.id == therapist_id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Therapist not found")

    user = await db.scalar(select(User).where(User.id == profile.user_id))
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": user.full_name if user else f"Therapist #{profile.id}",
        "profile_picture": user.profile_picture if user else None,
        "specializations": parse_json_field(profile.specializations),
        "languages": parse_json_field(profile.languages),
        "experience_years": profile.experience_years,
        "education": profile.education,
        "bio": profile.bio,
        "session_fee": profile.session_fee,
        "rating": float(profile.rating) if profile.rating else 4.5,
        "total_reviews": profile.total_reviews or 0,
        "is_available": profile.is_available,
        "verification_status": profile.verification_status,
    }


@router.get("/{therapist_id}/availability")
async def get_availability(
    therapist_id: int,
    db: AsyncSession = Depends(get_db)
):
    slots = await db.scalars(
        select(TherapistAvailability).where(
            TherapistAvailability.therapist_id == therapist_id
        )
    )
    return {"availability": [
        {
            "id": s.id,
            "day_of_week": s.day_of_week,
            "start_time": str(s.start_time),
            "end_time": str(s.end_time),
            "is_available": s.is_active,
        }
        for s in slots
    ]}


class AvailabilityUpdate(BaseModel):
    availability: List[dict]


@router.post("/availability")
async def set_availability(
    body: AvailabilityUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.user_id == current_user.id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Therapist profile not found")

    existing = await db.scalars(
        select(TherapistAvailability).where(TherapistAvailability.therapist_id == profile.id)
    )
    for slot in existing:
        await db.delete(slot)

    for slot in body.availability:
        new_slot = TherapistAvailability(
            therapist_id=profile.id,
            day_of_week=slot['day_of_week'],
            start_time=slot['start_time'],
            end_time=slot['end_time'],
            is_active=slot.get('is_available', True),
        )
        db.add(new_slot)

    await db.commit()
    return {"message": "Availability updated"}


class TherapistProfileUpdate(BaseModel):
    bio: Optional[str] = None
    specializations: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    experience_years: Optional[int] = None
    education: Optional[str] = None
    session_fee: Optional[float] = None


@router.put("/profile/me")
async def update_therapist_profile(
    body: TherapistProfileUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = await db.scalar(
        select(TherapistProfile).where(TherapistProfile.user_id == current_user.id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if body.bio is not None: profile.bio = body.bio
    if body.specializations is not None: profile.specializations = json.dumps(body.specializations)
    if body.languages is not None: profile.languages = json.dumps(body.languages)
    if body.experience_years is not None: profile.experience_years = body.experience_years
    if body.education is not None: profile.education = body.education
    if body.session_fee is not None: profile.session_fee = body.session_fee

    await db.commit()
    return {"message": "Profile updated successfully"}
