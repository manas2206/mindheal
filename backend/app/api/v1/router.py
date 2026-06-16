from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, therapists, appointments, payments, mood, messages, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(therapists.router, prefix="/therapists", tags=["therapists"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(mood.router, prefix="/mood", tags=["mood"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])