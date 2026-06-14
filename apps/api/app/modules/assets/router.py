from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from sqlalchemy import select

from app.core.auth import CurrentUserId
from app.core.responses import success
from app.db.models import Asset
from app.db.session import DatabaseSession
from app.modules.assets.storage import (
    AssetStorage,
    AssetStorageDependency,
    InvalidImageError,
)

router = APIRouter(prefix="/assets", tags=["assets"])
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def asset_data(asset: Asset) -> dict:
    return {
        "id": asset.id,
        "filename": asset.filename,
        "mime_type": asset.mime_type,
        "size_bytes": asset.size_bytes,
        "url": f"/uploads/{asset.storage_key}",
        "thumbnail_url": f"/uploads/{asset.thumbnail_key}",
        "created_at": asset.created_at.isoformat(),
    }


@router.post("/upload", status_code=201)
async def upload_asset(
    user_id: CurrentUserId,
    file: Annotated[UploadFile, File()],
    database: DatabaseSession,
    storage: Annotated[AssetStorage, AssetStorageDependency],
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported asset MIME type")
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Asset exceeds upload size limit")
    try:
        stored = storage.save(user_id, file.content_type, contents)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    asset = Asset(
        id=f"asset_{uuid4().hex}",
        owner_id=user_id,
        filename=Path(file.filename or "upload").name,
        mime_type=file.content_type,
        storage_key=stored.storage_key,
        thumbnail_key=stored.thumbnail_key,
        size_bytes=len(contents),
    )
    database.add(asset)
    database.commit()
    database.refresh(asset)
    return success(asset_data(asset), "asset uploaded", 201)


@router.get("")
def list_assets(user_id: CurrentUserId, database: DatabaseSession):
    assets = database.scalars(
        select(Asset).where(Asset.owner_id == user_id).order_by(Asset.created_at.desc())
    ).all()
    return success([asset_data(asset) for asset in assets])


@router.get("/{asset_id}")
def get_asset(asset_id: str, user_id: CurrentUserId, database: DatabaseSession):
    return success(asset_data(_require_asset(database, asset_id, user_id)))


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str,
    user_id: CurrentUserId,
    database: DatabaseSession,
    storage: Annotated[AssetStorage, AssetStorageDependency],
):
    asset = _require_asset(database, asset_id, user_id)
    storage.delete(asset.storage_key, asset.thumbnail_key)
    database.delete(asset)
    database.commit()
    return success({"id": asset_id}, "asset deleted")


def _require_asset(database: DatabaseSession, asset_id: str, user_id: str) -> Asset:
    asset = database.scalar(select(Asset).where(Asset.id == asset_id, Asset.owner_id == user_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset
