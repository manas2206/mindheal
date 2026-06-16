from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import secrets
import hashlib
import logging

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user
)
from app.core.config import settings
from app.core.rate_limiter import limiter
from app.models.models import User, RefreshToken, AuditLog, UserRole
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    OTPVerifyRequest,
    MessageResponse
)
from app.services.email_service import send_otp_email
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Authentication"])

decode_token = verify_token


# ── Register ──────────────────────────────────────────────────────────────────
@router.post("/register", response_model=MessageResponse, status_code=201)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(
    request: Request,
    body: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    existing = await db.scalar(
        select(User).where(User.email == body.email.lower())
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = str(secrets.randbelow(900000) + 100000)
    user = User(
        full_name=body.full_name.strip(),
        email=body.email.lower(),
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=UserRole(body.role),
        otp_code=otp,
        otp_expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(user)
    await db.flush()

    db.add(AuditLog(
        user_id=user.id,
        action="register",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data=None,
    ))
    await db.commit()

    # Send email in background — doesn't block response
    background_tasks.add_task(
        send_otp_email,
        email=user.email,
        otp=otp,
        full_name=user.full_name
    )

    return {"message": "Registration successful. Please verify your email with the OTP sent."}


# ── Verify OTP ────────────────────────────────────────────────────────────────
@router.post("/verify-otp", response_model=MessageResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def verify_otp(
    request: Request,
    body: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(
        select(User).where(User.email == body.email.lower())
    )
    if not user or user.otp_code != body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if datetime.now(timezone.utc) > user.otp_expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    await db.commit()
    return {"message": "Email verified successfully"}


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(
        select(User).where(User.email == body.email.lower())
    )

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")

    access_token = create_access_token(
        {"sub": str(user.id), "role": user.role}
    )
    refresh_token_raw = create_refresh_token(
        {"sub": str(user.id), "role": user.role}
    )

    token_hash = hashlib.sha256(refresh_token_raw.encode()).hexdigest()
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        ),
    ))
    db.add(AuditLog(
        user_id=user.id,
        action="login",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        extra_data=None,
    ))
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_raw,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
    }


# ── Refresh Token ─────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    stored = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
        )
    )
    if not stored:
        raise HTTPException(
            status_code=401,
            detail="Refresh token revoked or not found"
        )

    stored.revoked = True
    user_id = int(payload["sub"])
    role = payload["role"]

    new_access = create_access_token({"sub": str(user_id), "role": role})
    new_refresh_raw = create_refresh_token({"sub": str(user_id), "role": role})
    new_hash = hashlib.sha256(new_refresh_raw.encode()).hexdigest()

    db.add(RefreshToken(
        user_id=user_id,
        token_hash=new_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        ),
    ))

    user = await db.get(User, user_id)
    await db.commit()
    return {
        "access_token": new_access,
        "refresh_token": new_refresh_raw,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
    }


# ── Logout ────────────────────────────────────────────────────────────────────
@router.post("/logout", response_model=MessageResponse)
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    stored = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    if stored:
        stored.revoked = True
        await db.commit()
    return {"message": "Logged out successfully"}


# ── Google Login ──────────────────────────────────────────────────────────────
class GoogleLoginRequest(BaseModel):
    token: str
    email: str
    name: str


@router.post("/google")
async def google_login(
    body: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {body.token}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token")

        email = body.email
        name = body.name or email.split("@")[0]

        user = await db.scalar(select(User).where(User.email == email))

        if not user:
            user = User(
                full_name=name,
                email=email,
                password_hash=hash_password(f"google_{secrets.token_hex(16)}"),
                role="user",
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            await db.flush()

        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token_value = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(refresh_token_value.encode()).hexdigest()

        db.add(RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        ))
        await db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token_value,
            "token_type": "bearer",
            "role": user.role,
            "user_id": user.id,
            "full_name": user.full_name,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google login failed: {str(e)}")


# ── Forgot Password ───────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user:
        return {"message": "If this email exists, an OTP has been sent."}

    otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.commit()

    # Send in background
    background_tasks.add_task(send_otp_email, user.email, otp, user.full_name)

    return {"message": "If this email exists, an OTP has been sent."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp_code or user.otp_code != body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    expires = user.otp_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired. Please request again.")

    user.password_hash = hash_password(body.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    await db.commit()

    return {"message": "Password reset successful! Please login with your new password."}