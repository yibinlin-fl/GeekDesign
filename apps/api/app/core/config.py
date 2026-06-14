import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "GeekDesign API"
    api_prefix: str = "/api"
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://geekdesign:geekdesign@localhost:5432/geekdesign",
    )
    mock_user_id: str = os.getenv("MOCK_USER_ID", "user_local")


settings = Settings()
