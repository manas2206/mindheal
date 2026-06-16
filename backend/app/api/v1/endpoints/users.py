from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from pydantic import BaseModel
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = "uploads/profiles"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None


@router.get("/me")
async def get_me(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "gender": current_user.gender,
        "date_of_birth": str(current_user.date_of_birth) if current_user.date_of_birth else None,
        "profile_picture": current_user.profile_picture,
        "is_verified": current_user.is_verified,
        "is_active": current_user.is_active,
        "created_at": str(current_user.created_at),
    }


@router.put("/me")
async def update_me(
    body: UserUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.id == current_user.id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.full_name is not None: user.full_name = body.full_name
    if body.phone is not None: user.phone = body.phone
    if body.gender is not None: user.gender = body.gender
    if body.date_of_birth is not None:
        try:
            from datetime import datetime
            user.date_of_birth = datetime.strptime(body.date_of_birth, '%Y-%m-%d').date()
        except:
            pass

    await db.commit()
    return {"message": "Profile updated successfully"}


@router.post("/me/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if file.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP images allowed")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")

    ext = file.filename.split('.')[-1].lower()
    filename = f"user_{current_user.id}.{ext}"
    filepath = f"{UPLOAD_DIR}/{filename}"

    with open(filepath, 'wb') as f:
        f.write(contents)

    user = await db.scalar(select(User).where(User.id == current_user.id))
    user.profile_picture = f"/uploads/profiles/{filename}"
    await db.commit()

    return {"profile_picture": f"/uploads/profiles/{filename}"}


@router.delete("/me")
async def deactivate_account(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.id == current_user.id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return {"message": "Account deactivated"}
