from copy import deepcopy

from fastapi.testclient import TestClient


def create_project(client: TestClient, document: dict) -> dict:
    response = client.post(
        "/api/projects",
        json={"title": "Launch poster", "document_json": document},
    )
    assert response.status_code == 201
    return response.json()["data"]


def test_create_project_saves_document(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)

    assert project["title"] == "Launch poster"
    assert project["document_json"]["schemaVersion"] == "0.1.0"


def test_get_project(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)

    response = client.get(f"/api/projects/{project['id']}")

    assert response.status_code == 200
    assert response.json()["data"]["id"] == project["id"]


def test_update_project_document(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)
    updated_document = deepcopy(valid_document)
    updated_document["title"] = "Updated document"

    response = client.put(
        f"/api/projects/{project['id']}",
        json={"document_json": updated_document},
    )

    assert response.status_code == 200
    assert response.json()["data"]["document_json"]["title"] == "Updated document"


def test_invalid_document_returns_400(client: TestClient) -> None:
    response = client.post(
        "/api/projects",
        json={"title": "Broken", "document_json": {"schemaVersion": "9.9.9"}},
    )

    assert response.status_code == 400
    assert response.json()["success"] is False


def test_create_project_version(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)

    response = client.post(
        f"/api/projects/{project['id']}/versions",
        json={"document_json": valid_document},
    )

    assert response.status_code == 201
    assert response.json()["data"]["project_id"] == project["id"]
