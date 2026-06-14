from typing import Annotated

from fastapi import Depends

from app.core.config import settings


def get_current_user_id() -> str:
    """Mock user dependency; replace with verified authentication later."""
    return settings.mock_user_id


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
