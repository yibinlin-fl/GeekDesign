from pathlib import Path
from typing import Protocol
from uuid import uuid4

from fastapi import Depends

from app.core.config import settings


class ExportStorage(Protocol):
    def save(self, format_name: str, contents: bytes) -> str: ...


class LocalExportStorage:
    """Local export adapter; a MinIO implementation can replace it later."""

    def __init__(self, root: str | Path):
        self.root = Path(root).resolve()

    def save(self, format_name: str, contents: bytes) -> str:
        key = f"{uuid4().hex}.{format_name}"
        path = (self.root / key).resolve()
        if self.root not in path.parents:
            raise ValueError("Invalid export storage key")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)
        return key


local_export_storage = LocalExportStorage(settings.exports_dir)


def get_export_storage() -> ExportStorage:
    return local_export_storage


ExportStorageDependency = Depends(get_export_storage)
