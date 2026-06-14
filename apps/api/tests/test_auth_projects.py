from copy import deepcopy

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import Project, User


def register_user(client: TestClient, email: str, password: str = "secure-password") -> str:
    response = client.post(
        "/api/users/register",
        json={"email": email, "password": password, "display_name": email.split("@")[0]},
        headers={"Authorization": ""},
    )
    assert response.status_code == 201
    return response.json()["data"]["access_token"]


def create_project(client: TestClient, document: dict) -> dict:
    response = client.post(
        "/api/projects",
        json={"title": "Private project", "document_json": document},
    )
    assert response.status_code == 201
    return response.json()["data"]


def test_register_login_and_password_is_hashed(client: TestClient, database: Session) -> None:
    token = register_user(client, "new@example.com")
    login = client.post(
        "/api/users/login",
        json={"email": "new@example.com", "password": "secure-password"},
        headers={"Authorization": ""},
    )

    assert login.status_code == 200
    assert login.json()["data"]["access_token"] != token
    user = database.query(User).filter(User.email == "new@example.com").one()
    assert user.password_hash != "secure-password"
    assert user.password_hash.startswith("scrypt$")


def test_projects_require_authentication(client: TestClient) -> None:
    assert client.get("/api/projects", headers={"Authorization": ""}).status_code == 401


def test_project_belongs_to_current_user_and_other_user_cannot_read(
    client: TestClient, valid_document: dict
) -> None:
    project = create_project(client, valid_document)
    second_token = register_user(client, "second@example.com")

    response = client.get(
        f"/api/projects/{project['id']}",
        headers={"Authorization": f"Bearer {second_token}"},
    )

    assert response.status_code == 404


def test_autosave_creates_version(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)
    updated = deepcopy(valid_document)
    updated["title"] = "Autosaved document"

    response = client.post(
        f"/api/projects/{project['id']}/autosave",
        json={"document_json": updated},
    )
    versions = client.get(f"/api/projects/{project['id']}/versions").json()["data"]

    assert response.status_code == 200
    assert len(versions) == 1
    previous = client.get(f"/api/projects/{project['id']}/versions/{versions[0]['id']}").json()[
        "data"
    ]
    assert previous["document_json"]["title"] == "Test design"


def test_invalid_autosave_does_not_create_version(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)

    response = client.post(
        f"/api/projects/{project['id']}/autosave",
        json={"document_json": {"schemaVersion": "broken"}},
    )

    assert response.status_code == 400
    assert client.get(f"/api/projects/{project['id']}/versions").json()["data"] == []


def test_restore_history_version(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)
    updated = deepcopy(valid_document)
    updated["title"] = "New title"
    client.post(f"/api/projects/{project['id']}/autosave", json={"document_json": updated})
    version = client.get(f"/api/projects/{project['id']}/versions").json()["data"][0]

    response = client.post(f"/api/projects/{project['id']}/versions/{version['id']}/restore")

    assert response.status_code == 200
    assert response.json()["data"]["document_json"]["title"] == "Test design"
    assert len(client.get(f"/api/projects/{project['id']}/versions").json()["data"]) == 2


def test_share_link_is_read_only_and_soft_delete_revokes_it(
    client: TestClient, valid_document: dict, database: Session
) -> None:
    project = create_project(client, valid_document)
    share = client.post(f"/api/projects/{project['id']}/share", json={"enabled": True}).json()[
        "data"
    ]

    shared = client.get(f"/api/shares/{share['token']}", headers={"Authorization": ""})

    assert shared.status_code == 200
    assert shared.json()["data"]["readonly"] is True
    assert (
        client.put(
            f"/api/shares/{share['token']}",
            json={"title": "Cannot edit"},
            headers={"Authorization": ""},
        ).status_code
        == 405
    )

    assert client.delete(f"/api/projects/{project['id']}").status_code == 200
    stored = database.get(Project, project["id"])
    assert stored is not None and stored.deleted_at is not None
    assert (
        client.get(f"/api/shares/{share['token']}", headers={"Authorization": ""}).status_code
        == 404
    )


def test_rename_duplicate_and_soft_delete_project(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)
    renamed = client.patch(
        f"/api/projects/{project['id']}/rename", json={"title": "Renamed project"}
    )
    duplicate = client.post(f"/api/projects/{project['id']}/duplicate")

    assert renamed.json()["data"]["title"] == "Renamed project"
    assert duplicate.status_code == 201
    assert duplicate.json()["data"]["title"] == "Renamed project Copy"
    assert duplicate.json()["data"]["document_json"]["documentId"] != valid_document["documentId"]

    assert client.delete(f"/api/projects/{project['id']}").status_code == 200
    assert client.get(f"/api/projects/{project['id']}").status_code == 404
    assert {item["id"] for item in client.get("/api/projects").json()["data"]} == {
        duplicate.json()["data"]["id"]
    }
