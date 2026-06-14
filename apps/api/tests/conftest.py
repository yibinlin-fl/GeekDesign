from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.init_db import seed_templates
from app.db.session import get_db
from app.main import app
from app.modules.assets.storage import LocalAssetStorage, get_asset_storage
from app.modules.exports.storage import LocalExportStorage


@pytest.fixture
def database() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = testing_session()
    seed_templates(session)
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def asset_storage(tmp_path) -> LocalAssetStorage:
    return LocalAssetStorage(tmp_path / "uploads")


@pytest.fixture
def export_storage(tmp_path) -> LocalExportStorage:
    return LocalExportStorage(tmp_path / "exports")


@pytest.fixture
def client(
    database: Session, asset_storage: LocalAssetStorage
) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield database

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_asset_storage] = lambda: asset_storage
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/users/register",
            json={
                "email": "owner@example.com",
                "password": "correct-horse-battery",
                "display_name": "Project Owner",
            },
        )
        token = response.json()["data"]["access_token"]
        test_client.headers["Authorization"] = f"Bearer {token}"
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def valid_document() -> dict:
    return {
        "schemaVersion": "0.1.0",
        "documentId": "document_test",
        "title": "Test design",
        "createdAt": "2026-06-14T00:00:00.000Z",
        "updatedAt": "2026-06-14T00:00:00.000Z",
        "canvas": {"width": 1080, "height": 1080, "unit": "px", "dpi": 96},
        "pages": [
            {
                "id": "page_1",
                "name": "Page 1",
                "background": {"type": "solid", "color": "#ffffff"},
                "children": [],
            }
        ],
        "nodes": {},
        "assets": {},
        "fonts": {},
        "variables": {},
        "metadata": {},
    }
