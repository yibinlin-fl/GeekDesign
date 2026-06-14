from uuid import uuid4

from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.core.auth import CurrentUserId
from app.core.responses import success
from app.db.models import ExportTask
from app.db.session import DatabaseSession
from app.modules.exports.schemas import ExportCreate

router = APIRouter(prefix="/exports", tags=["exports"])


def queue_export(format_name: str, payload: ExportCreate, user_id: str, database: Session):
    task = ExportTask(
        id=f"export_{uuid4().hex}",
        owner_id=user_id,
        project_id=payload.project_id,
        format=format_name,
        status="queued",
    )
    database.add(task)
    database.commit()
    return success(
        {"id": task.id, "format": task.format, "status": task.status},
        f"{format_name} export queued",
        202,
    )


@router.post("/png", status_code=202)
def export_png(
    payload: ExportCreate,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    return queue_export("png", payload, user_id, database)


@router.post("/pdf", status_code=202)
def export_pdf(
    payload: ExportCreate,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    return queue_export("pdf", payload, user_id, database)
