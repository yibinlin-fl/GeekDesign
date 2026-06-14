from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Protocol
from uuid import uuid4

from fastapi import Depends
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

MIME_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}
PIL_FORMATS = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/webp": "WEBP",
}


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class StoredAsset:
    storage_key: str
    thumbnail_key: str


class AssetStorage(Protocol):
    def save(self, owner_id: str, mime_type: str, contents: bytes) -> StoredAsset: ...

    def delete(self, storage_key: str, thumbnail_key: str) -> None: ...


class LocalAssetStorage:
    """Local development adapter; replace with a MinIO adapter behind this protocol."""

    def __init__(self, root: str | Path):
        self.root = Path(root).resolve()

    def save(self, owner_id: str, mime_type: str, contents: bytes) -> StoredAsset:
        extension = MIME_EXTENSIONS[mime_type]
        random_name = uuid4().hex
        storage_key = f"{owner_id}/{random_name}{extension}"
        if mime_type == "image/svg+xml":
            # TODO: Sanitize SVG content before allowing production uploads.
            self._validate_svg(contents)
            thumbnail_key = f"{owner_id}/{random_name}_thumb.svg"
            thumbnail = contents
        else:
            thumbnail_key = f"{owner_id}/{random_name}_thumb.webp"
            thumbnail = self._create_thumbnail(contents, mime_type)

        self._write(storage_key, contents)
        self._write(thumbnail_key, thumbnail)
        return StoredAsset(storage_key=storage_key, thumbnail_key=thumbnail_key)

    def delete(self, storage_key: str, thumbnail_key: str) -> None:
        for key in (storage_key, thumbnail_key):
            path = self._path(key)
            if path.is_file():
                path.unlink()

    def _write(self, key: str, contents: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root not in path.parents:
            raise InvalidImageError("Invalid storage key")
        return path

    def _create_thumbnail(self, contents: bytes, mime_type: str) -> bytes:
        try:
            with Image.open(BytesIO(contents)) as image:
                if image.format != PIL_FORMATS[mime_type]:
                    raise InvalidImageError("Uploaded bytes do not match MIME type")
                image.thumbnail((320, 320))
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA")
                output = BytesIO()
                image.save(output, format="WEBP", quality=82)
                return output.getvalue()
        except (UnidentifiedImageError, OSError) as exc:
            raise InvalidImageError("Uploaded file is not a valid image") from exc

    def _validate_svg(self, contents: bytes) -> None:
        prefix = contents.lstrip()[:512].lower()
        if b"<svg" not in prefix:
            raise InvalidImageError("Uploaded file is not a valid SVG")


local_asset_storage = LocalAssetStorage(settings.uploads_dir)


def get_asset_storage() -> AssetStorage:
    return local_asset_storage


AssetStorageDependency = Depends(get_asset_storage)
