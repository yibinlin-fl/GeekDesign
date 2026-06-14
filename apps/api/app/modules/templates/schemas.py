from typing import Any

from pydantic import BaseModel, Field


class CreateProjectFromTemplate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    variables: dict[str, Any] = Field(default_factory=dict)
