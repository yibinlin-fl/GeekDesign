from uuid import uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUserId
from app.core.responses import success
from app.db.models import ExportTask, Project
from app.db.session import DatabaseSession
from app.modules.exports.schemas import ExportCreate

router = APIRouter(prefix="/exports", tags=["exports"])


def export_task_data(task: ExportTask) -> dict:
    return {
        "id": task.id,
        "project_id": task.project_id,
        "format": task.format,
        "status": task.status,
        "options": task.options,
        "result_url": task.result_url,
        "error_message": task.error_message,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


def require_owned_project(database: Session, project_id: str, user_id: str) -> Project:
    project = database.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user_id,
            Project.deleted_at.is_(None),
        )
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def queue_export(format_name: str, payload: ExportCreate, user_id: str, database: Session):
    require_owned_project(database, payload.project_id, user_id)
    task = ExportTask(
        id=f"export_{uuid4().hex}",
        owner_id=user_id,
        project_id=payload.project_id,
        format=format_name,
        status="queued",
        options={"scale": payload.scale},
    )
    database.add(task)
    database.commit()
    database.refresh(task)
    return success(export_task_data(task), f"{format_name} export queued", 202)


@router.post("/png", status_code=202)
def export_png(payload: ExportCreate, user_id: CurrentUserId, database: DatabaseSession):
    return queue_export("png", payload, user_id, database)


@router.post("/pdf", status_code=202)
def export_pdf(payload: ExportCreate, user_id: CurrentUserId, database: DatabaseSession):
    return queue_export("pdf", payload, user_id, database)


@router.get("/{task_id}")
def get_export_task(task_id: str, user_id: CurrentUserId, database: DatabaseSession):
    task = database.scalar(
        select(ExportTask).where(ExportTask.id == task_id, ExportTask.owner_id == user_id)
    )
    if not task:
        raise HTTPException(status_code=404, detail="Export task not found")
    return success(export_task_data(task))
