from uuid import uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.auth import (
    CurrentUserId,
    RateLimit,
    create_access_token,
    hash_password,
    verify_password,
)
from app.core.responses import success
from app.db.models import User
from app.db.session import DatabaseSession
from app.modules.users.schemas import LoginRequest, RegisterRequest

router = APIRouter(prefix="/users", tags=["users"])


def user_data(user: User) -> dict:
    return {"id": user.id, "email": user.email, "display_name": user.display_name}


def auth_data(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user_data(user),
    }


@router.post("/register", status_code=201)
def register(payload: RegisterRequest, database: DatabaseSession, _rate_limit: RateLimit):
    if database.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=409, detail="Email is already registered")
    user = User(
        id=f"user_{uuid4().hex}",
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    database.add(user)
    database.commit()
    database.refresh(user)
    return success(auth_data(user), "user registered", 201)


@router.post("/login")
def login(payload: LoginRequest, database: DatabaseSession, _rate_limit: RateLimit):
    user = database.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return success(auth_data(user), "login successful")


@router.get("/me")
def me(user_id: CurrentUserId, database: DatabaseSession):
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return success(user_data(user))
