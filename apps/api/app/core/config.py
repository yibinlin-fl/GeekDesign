import os
from dataclasses import dataclass
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    app_name: str = "GeekDesign API"
    api_prefix: str = "/api"
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://geekdesign:geekdesign@localhost:5432/geekdesign",
    )
    mock_user_id: str = os.getenv("MOCK_USER_ID", "user_local")
    uploads_dir: str = os.getenv("UPLOADS_DIR", str(API_ROOT / "uploads"))
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if origin.strip()
    )


settings = Settings()
