from sqlalchemy import (
    Column, Integer, String, Text, Enum, Boolean, DateTime,
    ForeignKey, DECIMAL, Date, JSON, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# ── Enums ─────────────────────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    user = "user"
    therapist = "therapist"
    admin = "admin"


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"

class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    rescheduled = "rescheduled"

class SessionType(str, enum.Enum):
    video = "video"
    chat = "chat"
    audio = "audio"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    refunded = "refunded"

class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"

class SubscriptionStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"


# ── Users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    full_name       = Column(String(150), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    phone           = Column(String(20), unique=True, nullable=True)
    password_hash   = Column(String(255), nullable=False)
    role            = Column(Enum(UserRole), nullable=False, default=UserRole.user)
    gender          = Column(Enum(GenderEnum), nullable=True)
    date_of_birth   = Column(Date, nullable=True)
    profile_picture = Column(String(500), nullable=True)
    is_active       = Column(Boolean, default=True, nullable=False)
    is_verified     = Column(Boolean, default=False, nullable=False)
    otp_code        = Column(String(6), nullable=True)
    otp_expires_at  = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    therapist_profile    = relationship("TherapistProfile", back_populates="user", uselist=False)
    appointments_as_user = relationship("Appointment", back_populates="user", foreign_keys="Appointment.user_id")
    mood_logs            = relationship("MoodLog", back_populates="user")
    messages_sent        = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    payments             = relationship("Payment", back_populates="user")
    subscriptions        = relationship("Subscription", back_populates="user")
    refresh_tokens       = relationship("RefreshToken", back_populates="user")


# ── Therapist Profile ─────────────────────────────────────────────────────────
class TherapistProfile(Base):
    __tablename__ = "therapist_profiles"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    user_id             = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    license_number      = Column(String(100), unique=True, nullable=False)
    specializations     = Column(JSON, nullable=False)
    languages           = Column(JSON, nullable=False)
    experience_years    = Column(Integer, nullable=False)
    education           = Column(Text, nullable=True)
    bio                 = Column(Text, nullable=True)
    session_fee         = Column(DECIMAL(10, 2), nullable=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.pending)
    rating              = Column(DECIMAL(3, 2), default=0.00)
    total_reviews       = Column(Integer, default=0)
    is_available        = Column(Boolean, default=True)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user         = relationship("User", back_populates="therapist_profile")
    availability = relationship("TherapistAvailability", back_populates="therapist")
    appointments = relationship("Appointment", back_populates="therapist", foreign_keys="Appointment.therapist_id")
    reviews      = relationship("Review", back_populates="therapist")


# ── Therapist Availability ────────────────────────────────────────────────────
class TherapistAvailability(Base):
    __tablename__ = "therapist_availability"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    therapist_id = Column(Integer, ForeignKey("therapist_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week  = Column(Integer, nullable=False)
    start_time   = Column(String(5), nullable=False)
    end_time     = Column(String(5), nullable=False)
    is_active    = Column(Boolean, default=True)

    therapist = relationship("TherapistProfile", back_populates="availability")


# ── Appointments ────────────────────────────────────────────────────────────── updated from 124 to 138 
class Appointment(Base):
    __tablename__ = "appointments"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    therapist_id  = Column(Integer, ForeignKey("therapist_profiles.id", ondelete="CASCADE"), nullable=False)
    scheduled_at  = Column(DateTime, nullable=False)
    duration_mins = Column(Integer, default=25)
    session_type  = Column(Enum(SessionType), default=SessionType.video)
    status        = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending)
    meeting_link  = Column(String(500), nullable=True)
    notes         = Column(Text, nullable=True)
    recording_url = Column(String(500), nullable=True)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user      = relationship("User", back_populates="appointments_as_user", foreign_keys=[user_id])
    therapist = relationship("TherapistProfile", back_populates="appointments", foreign_keys=[therapist_id])
    payment   = relationship("Payment", back_populates="appointment", uselist=False)
    review    = relationship("Review", back_populates="appointment", uselist=False)


# ── Payments ──────────────────────────────────────────────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    user_id             = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    appointment_id      = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    subscription_id     = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    amount              = Column(DECIMAL(10, 2), nullable=False)
    currency            = Column(String(10), default="INR")
    razorpay_order_id   = Column(String(200), nullable=True)
    razorpay_payment_id = Column(String(200), nullable=True)
    razorpay_signature  = Column(String(500), nullable=True)
    status              = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    created_at          = Column(DateTime, server_default=func.now())

    user         = relationship("User", back_populates="payments")
    appointment  = relationship("Appointment", back_populates="payment")
    subscription = relationship("Subscription", back_populates="payments")


# ── Subscriptions ─────────────────────────────────────────────────────────────
class Subscription(Base):
    __tablename__ = "subscriptions"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_name  = Column(String(100), nullable=False)
    price      = Column(DECIMAL(10, 2), nullable=False)
    sessions   = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date   = Column(Date, nullable=False)
    status     = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.active)
    created_at = Column(DateTime, server_default=func.now())

    user     = relationship("User", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")


# ── Mood Logs ─────────────────────────────────────────────────────────────────
class MoodLog(Base):
    __tablename__ = "mood_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mood_score = Column(Integer, nullable=False)
    mood_label = Column(String(50), nullable=True)
    notes      = Column(Text, nullable=True)
    logged_at  = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="mood_logs")


# ── Messages ──────────────────────────────────────────────────────────────────
class Message(Base):
    __tablename__ = "messages"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    sender_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    content        = Column(Text, nullable=False)
    is_read        = Column(Boolean, default=False)
    sent_at        = Column(DateTime, server_default=func.now())

    sender = relationship("User", back_populates="messages_sent", foreign_keys=[sender_id])


# ── Reviews ───────────────────────────────────────────────────────────────────
class Review(Base):
    __tablename__ = "reviews"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    therapist_id   = Column(Integer, ForeignKey("therapist_profiles.id", ondelete="CASCADE"), nullable=False)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=True)
    rating         = Column(Integer, nullable=False)
    comment        = Column(Text, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    therapist   = relationship("TherapistProfile", back_populates="reviews")
    appointment = relationship("Appointment", back_populates="review")


# ── Refresh Tokens ────────────────────────────────────────────────────────────
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked    = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")



# ── Audit Logs ────────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, nullable=True)
    action     = Column(String(100), nullable=False)
    entity     = Column(String(100), nullable=True)
    entity_id  = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())