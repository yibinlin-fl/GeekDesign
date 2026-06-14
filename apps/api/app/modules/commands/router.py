from fastapi import APIRouter

from app.core.auth import CurrentUserId
from app.core.responses import success
from app.db.models import CommandLog
from app.db.session import DatabaseSession
from app.modules.commands.schemas import CommandRequest
from app.modules.commands.service import design_summary, element_list, execute_command
from app.modules.projects.router import require_project

router = APIRouter(prefix="/projects/{project_id}", tags=["commands"])


@router.get("/summary")
def get_design_summary(project_id: str, user_id: CurrentUserId, database: DatabaseSession):
    project = require_project(database, project_id, user_id)
    return success(design_summary(project.document_json))


@router.get("/elements")
def list_elements(project_id: str, user_id: CurrentUserId, database: DatabaseSession):
    project = require_project(database, project_id, user_id)
    return success(element_list(project.document_json))


@router.post("/commands")
def run_command(
    project_id: str,
    payload: CommandRequest,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    project = require_project(database, project_id, user_id)
    document = execute_command(project.document_json, payload)
    status = "dry_run" if payload.dry_run else "applied"
    if not payload.dry_run:
        project.document_json = document
    database.add(
        CommandLog(
            id=payload.id,
            project_id=project.id,
            user_id=user_id,
            source=payload.source,
            command_type=payload.type,
            payload=payload.payload,
            status=status,
        )
    )
    database.commit()
    return success(
        {"commandId": payload.id, "status": status, "summary": design_summary(document)},
        "command validated" if payload.dry_run else "command applied",
    )
