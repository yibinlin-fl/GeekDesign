from copy import deepcopy
from datetime import UTC, datetime
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUserId, RateLimit
from app.core.design_document import validate_design_document
from app.core.responses import success
from app.db.models import Project, ProjectVersion
from app.db.session import DatabaseSession
from app.modules.projects.schemas import (
    AutoSaveRequest,
    ProjectCreate,
    ProjectRename,
    ProjectUpdate,
    ProjectVersionCreate,
    ShareRequest,
)

router = APIRouter(prefix="/projects", tags=["projects"])
share_router = APIRouter(prefix="/shares", tags=["projects"])


def project_data(project: Project, include_document: bool = True) -> dict:
    data = {
        "id": project.id,
        "owner_id": project.owner_id,
        "title": project.title,
        "share_enabled": project.share_enabled,
        "share_token": project.share_token if project.share_enabled else None,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }
    if include_document:
        data["document_json"] = project.document_json
    return data


def version_data(version: ProjectVersion, include_document: bool = False) -> dict:
    data = {
        "id": version.id,
        "project_id": version.project_id,
        "created_by": version.created_by,
        "created_at": version.created_at.isoformat(),
    }
    if include_document:
        data["document_json"] = version.document_json
    return data


def require_project(database: Session, project_id: str, user_id: str) -> Project:
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


def save_version(database: Session, project: Project, user_id: str) -> ProjectVersion:
    version = ProjectVersion(
        id=f"version_{uuid4().hex}",
        project_id=project.id,
        created_by=user_id,
        document_json=deepcopy(project.document_json),
    )
    database.add(version)
    return version


@router.post("", status_code=201)
def create_project(
    payload: ProjectCreate,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    project = Project(
        id=f"project_{uuid4().hex}",
        owner_id=user_id,
        title=payload.title,
        document_json=validate_design_document(payload.document_json),
    )
    database.add(project)
    database.commit()
    database.refresh(project)
    return success(project_data(project), "project created", 201)


@router.get("")
def list_projects(user_id: CurrentUserId, database: DatabaseSession):
    projects = database.scalars(
        select(Project)
        .where(Project.owner_id == user_id, Project.deleted_at.is_(None))
        .order_by(Project.updated_at.desc())
    ).all()
    return success([project_data(project, include_document=False) for project in projects])


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


@router.patch("/{project_id}/rename")
def rename_project(
    project_id: str, payload: ProjectRename, user_id: CurrentUserId, database: DatabaseSession
):
    project = require_project(database, project_id, user_id)
    project.title = payload.title
    database.commit()
    database.refresh(project)
    return success(project_data(project, include_document=False), "project renamed")


@router.post("/{project_id}/duplicate", status_code=201)
def duplicate_project(project_id: str, user_id: CurrentUserId, database: DatabaseSession):
    source = require_project(database, project_id, user_id)
    document = deepcopy(source.document_json)
    document["documentId"] = f"design_{uuid4().hex}"
    document["title"] = f"{source.title} Copy"
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    document["createdAt"] = now
    document["updatedAt"] = now
    duplicate = Project(
        id=f"project_{uuid4().hex}",
        owner_id=user_id,
        title=f"{source.title} Copy",
        document_json=validate_design_document(document),
    )
    database.add(duplicate)
    database.commit()
    database.refresh(duplicate)
    return success(project_data(duplicate), "project duplicated", 201)


@router.delete("/{project_id}")
def delete_project(project_id: str, user_id: CurrentUserId, database: DatabaseSession):
    project = require_project(database, project_id, user_id)
    project.deleted_at = datetime.now(UTC)
    project.share_enabled = False
    database.commit()
    return success({"id": project.id}, "project deleted")


@router.post("/{project_id}/autosave")
def auto_save(
    project_id: str,
    payload: AutoSaveRequest,
    user_id: CurrentUserId,
    database: DatabaseSession,
    _rate_limit: RateLimit,
):
    project = require_project(database, project_id, user_id)
    document = validate_design_document(payload.document_json)
    save_version(database, project, user_id)
    project.document_json = document
    database.commit()
    database.refresh(project)
    return success(project_data(project, include_document=False), "project autosaved")


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
    return success(version_data(version), "project version created", 201)


@router.get("/{project_id}/versions")
def list_project_versions(project_id: str, user_id: CurrentUserId, database: DatabaseSession):
    require_project(database, project_id, user_id)
    versions = database.scalars(
        select(ProjectVersion)
        .where(ProjectVersion.project_id == project_id)
        .order_by(ProjectVersion.created_at.desc())
    ).all()
    return success([version_data(version) for version in versions])


@router.get("/{project_id}/versions/{version_id}")
def get_project_version(
    project_id: str, version_id: str, user_id: CurrentUserId, database: DatabaseSession
):
    require_project(database, project_id, user_id)
    version = database.scalar(
        select(ProjectVersion).where(
            ProjectVersion.id == version_id, ProjectVersion.project_id == project_id
        )
    )
    if not version:
        raise HTTPException(status_code=404, detail="Project version not found")
    return success(version_data(version, include_document=True))


@router.post("/{project_id}/versions/{version_id}/restore")
def restore_project_version(
    project_id: str, version_id: str, user_id: CurrentUserId, database: DatabaseSession
):
    project = require_project(database, project_id, user_id)
    version = database.scalar(
        select(ProjectVersion).where(
            ProjectVersion.id == version_id, ProjectVersion.project_id == project_id
        )
    )
    if not version:
        raise HTTPException(status_code=404, detail="Project version not found")
    save_version(database, project, user_id)
    project.document_json = validate_design_document(deepcopy(version.document_json))
    database.commit()
    database.refresh(project)
    return success(project_data(project), "project version restored")


@router.post("/{project_id}/share")
def update_share(
    project_id: str,
    payload: ShareRequest,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    project = require_project(database, project_id, user_id)
    if payload.enabled and not project.share_token:
        project.share_token = token_urlsafe(32)
    project.share_enabled = payload.enabled
    database.commit()
    database.refresh(project)
    return success(
        {
            "enabled": project.share_enabled,
            "token": project.share_token if project.share_enabled else None,
            "url": f"/share/{project.share_token}" if project.share_enabled else None,
        },
        "share link updated",
    )


@share_router.get("/{token}")
def read_shared_project(token: str, database: DatabaseSession):
    project = database.scalar(
        select(Project).where(
            Project.share_token == token,
            Project.share_enabled.is_(True),
            Project.deleted_at.is_(None),
        )
    )
    if not project:
        raise HTTPException(status_code=404, detail="Shared project not found")
    return success(
        {
            "id": project.id,
            "title": project.title,
            "document_json": project.document_json,
            "updated_at": project.updated_at.isoformat(),
            "readonly": True,
        }
    )
