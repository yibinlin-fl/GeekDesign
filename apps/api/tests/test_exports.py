from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import ExportTask
from app.modules.exports.service import complete_export_task
from app.modules.exports.storage import LocalExportStorage


def create_project(client: TestClient, document: dict) -> dict:
    response = client.post(
        "/api/projects",
        json={"title": "Export design", "document_json": document},
    )
    assert response.status_code == 201
    return response.json()["data"]


def test_create_and_get_png_export_task(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)

    response = client.post("/api/exports/png", json={"project_id": project["id"], "scale": 2})

    assert response.status_code == 202
    task = response.json()["data"]
    assert task["format"] == "png"
    assert task["status"] == "queued"
    assert task["options"]["scale"] == 2
    assert client.get(f"/api/exports/{task['id']}").json()["data"]["id"] == task["id"]


def test_create_pdf_export_task(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)

    response = client.post("/api/exports/pdf", json={"project_id": project["id"]})

    assert response.status_code == 202
    assert response.json()["data"]["format"] == "pdf"


def test_completed_export_has_download_link(
    client: TestClient,
    valid_document: dict,
    database: Session,
    export_storage: LocalExportStorage,
) -> None:
    project = create_project(client, valid_document)
    queued = client.post("/api/exports/pdf", json={"project_id": project["id"]}).json()["data"]
    task = database.get(ExportTask, queued["id"])
    assert task is not None

    complete_export_task(database, task, b"%PDF-smoke", export_storage)
    response = client.get(f"/api/exports/{task.id}")

    assert response.json()["data"]["status"] == "completed"
    assert response.json()["data"]["result_url"].endswith(".pdf")
    assert task.output_key is not None
    assert (export_storage.root / task.output_key).is_file()


def test_invalid_project_cannot_export(client: TestClient) -> None:
    response = client.post("/api/exports/pdf", json={"project_id": "missing"})

    assert response.status_code == 404
    assert response.json()["message"] == "Project not found"
