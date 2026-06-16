from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from pydantic import BaseModel, field_validator
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_user
from app.models.models import MoodLog


# router = APIRouter(prefix="/mood", tags=["Mood Tracker"])
router = APIRouter(tags=["Mood Tracker"])


# ── Schemas ───────────────────────────────────────────────────────────────────
class MoodLogRequest(BaseModel):
    mood_score: int
    mood_label: Optional[str] = None
    notes:      Optional[str] = None

    @field_validator("mood_score")
    @classmethod
    def validate_score(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("Mood score must be between 1 and 10")
        return v


class MoodLogResponse(BaseModel):
    id:         int
    user_id:    int
    mood_score: int
    mood_label: Optional[str]
    notes:      Optional[str]
    logged_at:  datetime

    class Config:
        from_attributes = True


# ── Log Mood ──────────────────────────────────────────────────────────────────
@router.post("/", response_model=MoodLogResponse, status_code=201)
async def log_mood(
    body: MoodLogRequest,
    current_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    mood = MoodLog(
        user_id=current_user.id,
        mood_score=body.mood_score,
        mood_label=body.mood_label,
        notes=body.notes,
    )
    db.add(mood)
    await db.commit()
    await db.refresh(mood)
    return mood


# ── Mood History ──────────────────────────────────────────────────────────────
@router.get("/history", response_model=List[MoodLogResponse])
async def mood_history(
    page:  int = Query(1, ge=1),
    limit: int = Query(30, le=100),
    current_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(MoodLog)
        .where(MoodLog.user_id == current_user.id)
        .order_by(MoodLog.logged_at.desc())
        .offset(offset)
        .limit(limit)
    )
    logs = result.scalars().all()
    return logs


# ── Mood Analytics ────────────────────────────────────────────────────────────
@router.get("/analytics")
async def mood_analytics(
    current_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MoodLog)
        .where(MoodLog.user_id == current_user.id)
        .order_by(MoodLog.logged_at.asc())
    )
    logs = result.scalars().all()

    if not logs:
        return {
            "total_logs":    0,
            "average_score": 0,
            "highest_score": 0,
            "lowest_score":  0,
            "trend":         [],
        }

    scores = [log.mood_score for log in logs]

    # Weekly average
    trend = [
        {
            "date":  log.logged_at.strftime("%Y-%m-%d"),
            "score": log.mood_score,
            "label": log.mood_label,
        }
        for log in logs
    ]

    return {
        "total_logs":    len(logs),
        "average_score": round(sum(scores) / len(scores), 2),
        "highest_score": max(scores),
        "lowest_score":  min(scores),
        "trend":         trend,
    }


# ── Delete Mood Log ───────────────────────────────────────────────────────────
@router.delete("/{mood_id}")
async def delete_mood_log(
    mood_id: int,
    current_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    mood = await db.get(MoodLog, mood_id)
    if not mood:
        raise HTTPException(status_code=404, detail="Mood log not found")
    if mood.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(mood)
    await db.commit()
    return {"message": "Mood log deleted successfully"}
