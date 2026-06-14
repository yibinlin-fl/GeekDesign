from pydantic import BaseModel, Field


class ExportCreate(BaseModel):
    project_id: str = Field(min_length=1)
    scale: float = Field(default=1, ge=0.25, le=4)
