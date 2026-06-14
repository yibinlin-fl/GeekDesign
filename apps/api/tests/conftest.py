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
def client(database: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield database

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
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
