from typing import Any

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    document_json: dict[str, Any]


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    document_json: dict[str, Any] | None = None


class ProjectVersionCreate(BaseModel):
    document_json: dict[str, Any]
