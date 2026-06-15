import os
import secrets
from dataclasses import dataclass
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_URL = f"sqlite:///{(API_ROOT / 'geekdesign.db').as_posix()}"


@dataclass(frozen=True)
class Settings:
    app_name: str = "GeekDesign API"
    api_prefix: str = "/api"
    database_url: str = os.getenv(
        "DATABASE_URL",
        DEFAULT_DATABASE_URL,
    )
    jwt_secret: str = os.getenv("JWT_SECRET") or secrets.token_urlsafe(48)
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
    uploads_dir: str = os.getenv("UPLOADS_DIR", str(API_ROOT / "uploads"))
    exports_dir: str = os.getenv("EXPORTS_DIR", str(API_ROOT / "exports"))
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            (
                "http://localhost:3000,http://127.0.0.1:3000,"
                "http://localhost:3400,http://127.0.0.1:3400"
            ),
        ).split(",")
        if origin.strip()
    )


settings = Settings()
