from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.core.auth import CurrentUserId
from app.core.design_document import validate_design_document
from app.core.responses import success
from app.db.models import Project
from app.db.session import DatabaseSession
from app.modules.pptx.converter import export_pptx, import_pptx
from app.modules.projects.router import project_data, require_project

router = APIRouter(prefix="/pptx", tags=["exports"])
PptxUpload = Annotated[UploadFile, File()]


@router.post("/import", status_code=201)
async def import_editable_pptx(
    user_id: CurrentUserId,
    database: DatabaseSession,
    file: PptxUpload,
):
    pptx_mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    if file.content_type != pptx_mime:
        raise HTTPException(status_code=400, detail="Upload a valid .pptx file")
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PPTX file is too large")
    title = Path(file.filename or "Imported presentation").stem
    document = validate_design_document(import_pptx(contents, title))
    project = Project(
        id=f"project_{uuid4().hex}",
        owner_id=user_id,
        title=title,
        document_json=document,
    )
    database.add(project)
    database.commit()
    database.refresh(project)
    return success(project_data(project), "PPTX imported", 201)


@router.get("/export/{project_id}")
def export_editable_pptx(
    project_id: str,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    project = require_project(database, project_id, user_id)
    contents = export_pptx(project.document_json)
    filename = "".join(
        character for character in project.title if character.isalnum() or character in " _-"
    )
    return Response(
        contents,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename or "design"}.pptx"'},
    )
