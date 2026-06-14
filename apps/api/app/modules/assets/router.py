from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.auth import CurrentUserId
from app.core.responses import success
from app.db.models import Asset
from app.db.session import DatabaseSession

router = APIRouter(prefix="/assets", tags=["assets"])
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.post("/upload", status_code=201)
async def upload_asset(
    user_id: CurrentUserId,
    file: Annotated[UploadFile, File()],
    database: DatabaseSession,
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported asset MIME type")
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Asset exceeds upload size limit")
    safe_name = Path(file.filename or "upload").name
    asset_id = f"asset_{uuid4().hex}"
    asset = Asset(
        id=asset_id,
        owner_id=user_id,
        filename=safe_name,
        mime_type=file.content_type,
        storage_key=f"mock://uploads/{user_id}/{asset_id}/{safe_name}",
        size_bytes=len(contents),
    )
    database.add(asset)
    database.commit()
    return success(
        {
            "id": asset.id,
            "filename": asset.filename,
            "mime_type": asset.mime_type,
            "storage_key": asset.storage_key,
            "size_bytes": asset.size_bytes,
        },
        "asset upload accepted",
        201,
    )
