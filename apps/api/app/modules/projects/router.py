from uuid import uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUserId
from app.core.design_document import validate_design_document
from app.core.responses import success
from app.db.models import Project, ProjectVersion
from app.db.session import DatabaseSession
from app.modules.projects.schemas import ProjectCreate, ProjectUpdate, ProjectVersionCreate

router = APIRouter(prefix="/projects", tags=["projects"])


def project_data(project: Project) -> dict:
    return {
        "id": project.id,
        "owner_id": project.owner_id,
        "title": project.title,
        "document_json": project.document_json,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }


def require_project(database: Session, project_id: str, user_id: str) -> Project:
    project = database.scalar(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", status_code=201)
def create_project(
    payload: ProjectCreate,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    document = validate_design_document(payload.document_json)
    project = Project(
        id=f"project_{uuid4().hex}",
        owner_id=user_id,
        title=payload.title,
        document_json=document,
    )
    database.add(project)
    database.commit()
    database.refresh(project)
    return success(project_data(project), "project created", 201)


@router.get("")
def list_projects(user_id: CurrentUserId, database: DatabaseSession):
    projects = database.scalars(
        select(Project).where(Project.owner_id == user_id).order_by(Project.updated_at.desc())
    ).all()
    return success([project_data(project) for project in projects])


@router.get("/{project_id}")
def get_project(project_id: str, user_id: CurrentUserId, database: DatabaseSession):
    return success(project_data(require_project(database, project_id, user_id)))


@router.put("/{project_id}")
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    project = require_project(database, project_id, user_id)
    if payload.title is not None:
        project.title = payload.title
    if payload.document_json is not None:
        project.document_json = validate_design_document(payload.document_json)
    database.commit()
    database.refresh(project)
    return success(project_data(project), "project updated")


@router.post("/{project_id}/versions", status_code=201)
def create_project_version(
    project_id: str,
    payload: ProjectVersionCreate,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    require_project(database, project_id, user_id)
    version = ProjectVersion(
        id=f"version_{uuid4().hex}",
        project_id=project_id,
        created_by=user_id,
        document_json=validate_design_document(payload.document_json),
    )
    database.add(version)
    database.commit()
    database.refresh(version)
    return success(
        {
            "id": version.id,
            "project_id": version.project_id,
            "created_at": version.created_at.isoformat(),
        },
        "project version created",
        201,
    )
