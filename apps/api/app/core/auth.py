import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User
from app.db.session import get_db


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt$16384$8$1${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$")
        if algorithm != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode(),
            salt=_b64decode(salt),
            n=int(n),
            r=int(r),
            p=int(p),
        )
        return secrets.compare_digest(digest, _b64decode(expected))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(UTC)
    header = _b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64encode(
        json.dumps(
            {
                "sub": user_id,
                "jti": secrets.token_urlsafe(16),
                "iat": int(now.timestamp()),
                "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp()),
            }
        ).encode()
    )
    signature = _b64encode(
        hmac.new(
            settings.jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256
        ).digest()
    )
    return f"{header}.{payload}.{signature}"


def decode_access_token(token: str) -> str:
    try:
        header, payload, signature = token.split(".")
        token_header = json.loads(_b64decode(header))
        if token_header != {"alg": "HS256", "typ": "JWT"}:
            raise ValueError("unsupported token header")
        expected = _b64encode(
            hmac.new(
                settings.jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256
            ).digest()
        )
        if not secrets.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        claims = json.loads(_b64decode(payload))
        if int(claims["exp"]) < int(datetime.now(UTC).timestamp()):
            raise ValueError("expired")
        return str(claims["sub"])
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc


def get_current_user_id(
    database: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = decode_access_token(authorization.removeprefix("Bearer ").strip())
    if database.get(User, user_id) is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


def rate_limit_placeholder() -> None:
    """Dependency seam for Redis-backed per-user and per-IP rate limiting."""


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
RateLimit = Annotated[None, Depends(rate_limit_placeholder)]
