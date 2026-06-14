from pydantic import BaseModel


class ExportCreate(BaseModel):
    project_id: str | None = None
