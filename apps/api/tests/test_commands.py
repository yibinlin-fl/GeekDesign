from copy import deepcopy

from fastapi.testclient import TestClient


def create_project(client: TestClient, document: dict) -> dict:
    response = client.post(
        "/api/projects",
        json={"title": "Command project", "document_json": document},
    )
    assert response.status_code == 201
    return response.json()["data"]


def document_with_text(valid_document: dict) -> dict:
    document = deepcopy(valid_document)
    document["pages"][0]["children"] = ["text_1"]
    document["nodes"]["text_1"] = {
        "id": "text_1",
        "type": "text",
        "parentId": "page_1",
        "role": "title",
        "transform": {
            "x": 10,
            "y": 20,
            "width": 300,
            "height": 80,
            "rotation": 0,
            "scaleX": 1,
            "scaleY": 1,
        },
        "style": {"opacity": 1, "visible": True, "locked": False},
        "text": {
            "content": "Before",
            "fontFamily": "Arial",
            "fontSize": 32,
            "fontWeight": 400,
            "lineHeight": 1.2,
            "letterSpacing": 0,
            "textAlign": "left",
        },
    }
    return document


def test_ai_command_updates_text(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, document_with_text(valid_document))
    response = client.post(
        f"/api/projects/{project['id']}/commands",
        json={
            "id": "command_1",
            "type": "UPDATE_TEXT",
            "source": "ai",
            "payload": {"nodeId": "text_1", "content": "After"},
        },
    )

    assert response.status_code == 200
    saved = client.get(f"/api/projects/{project['id']}").json()["data"]["document_json"]
    assert saved["nodes"]["text_1"]["text"]["content"] == "After"


def test_dry_run_does_not_modify_project(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, document_with_text(valid_document))
    response = client.post(
        f"/api/projects/{project['id']}/commands",
        json={
            "id": "command_dry",
            "type": "UPDATE_TEXT",
            "source": "ai",
            "payload": {"nodeId": "text_1", "content": "Preview"},
            "dry_run": True,
        },
    )

    assert response.json()["data"]["status"] == "dry_run"
    saved = client.get(f"/api/projects/{project['id']}").json()["data"]["document_json"]
    assert saved["nodes"]["text_1"]["text"]["content"] == "Before"


def test_unknown_node_command_is_rejected(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, valid_document)
    response = client.post(
        f"/api/projects/{project['id']}/commands",
        json={
            "id": "command_bad",
            "type": "UPDATE_TEXT",
            "source": "ai",
            "payload": {"nodeId": "missing", "content": "No"},
        },
    )

    assert response.status_code == 400
