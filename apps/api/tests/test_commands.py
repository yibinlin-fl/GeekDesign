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


def document_with_two_rects(valid_document: dict) -> dict:
    document = deepcopy(valid_document)
    document["pages"][0]["children"] = ["rect_1", "rect_2"]
    for index, node_id in enumerate(document["pages"][0]["children"]):
        document["nodes"][node_id] = {
            "id": node_id,
            "type": "rect",
            "parentId": "page_1",
            "transform": {
                "x": index * 120,
                "y": 20,
                "width": 100,
                "height": 80,
                "rotation": 0,
                "scaleX": 1,
                "scaleY": 1,
            },
            "style": {"opacity": 1, "visible": True, "locked": False},
            "cornerRadius": 0,
        }
    return document


def run_command(client: TestClient, project_id: str, command_type: str, payload: dict) -> dict:
    response = client.post(
        f"/api/projects/{project_id}/commands",
        json={
            "schemaVersion": "0.1.0",
            "id": f"command_{command_type.lower()}",
            "type": command_type,
            "source": "user",
            "payload": payload,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


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


def test_update_node_can_replace_image_data(client: TestClient, valid_document: dict) -> None:
    document = deepcopy(valid_document)
    document["pages"][0]["children"] = ["image_1"]
    document["nodes"]["image_1"] = {
        "id": "image_1",
        "type": "image",
        "parentId": "page_1",
        "transform": {
            "x": 0,
            "y": 0,
            "width": 100,
            "height": 100,
            "rotation": 0,
            "scaleX": 1,
            "scaleY": 1,
        },
        "style": {"opacity": 1, "visible": True, "locked": False},
        "image": {"assetId": "asset_before", "fit": "cover"},
    }
    project = create_project(client, document)

    response = client.post(
        f"/api/projects/{project['id']}/commands",
        json={
            "id": "command_replace_image",
            "type": "UPDATE_NODE",
            "source": "ai",
            "payload": {
                "nodeId": "image_1",
                "patch": {"image": {"assetId": "asset_after", "fit": "contain"}},
            },
        },
    )

    assert response.status_code == 200


def test_transform_reorder_group_and_ungroup_commands(
    client: TestClient, valid_document: dict
) -> None:
    project = create_project(client, document_with_two_rects(valid_document))
    project_id = project["id"]

    run_command(client, project_id, "RESIZE_NODE", {"nodeId": "rect_1", "width": 240, "height": 90})
    run_command(client, project_id, "ROTATE_NODE", {"nodeId": "rect_1", "rotation": 30})
    run_command(
        client,
        project_id,
        "REORDER_NODE",
        {"parentId": "page_1", "nodeId": "rect_1", "newIndex": 1},
    )
    run_command(
        client,
        project_id,
        "GROUP_NODES",
        {"nodeIds": ["rect_1", "rect_2"], "groupId": "group_1"},
    )
    grouped = client.get(f"/api/projects/{project_id}").json()["data"]["document_json"]
    assert grouped["nodes"]["group_1"]["children"] == ["rect_2", "rect_1"]
    assert grouped["nodes"]["rect_1"]["transform"]["rotation"] == 30

    run_command(client, project_id, "UNGROUP_NODES", {"groupId": "group_1"})
    saved = client.get(f"/api/projects/{project_id}").json()["data"]["document_json"]
    assert saved["pages"][0]["children"] == ["rect_2", "rect_1"]
    assert "group_1" not in saved["nodes"]


def test_page_asset_and_delete_commands(client: TestClient, valid_document: dict) -> None:
    project = create_project(client, document_with_text(valid_document))
    project_id = project["id"]
    run_command(
        client,
        project_id,
        "ADD_PAGE",
        {
            "page": {
                "id": "page_2",
                "name": "Page 2",
                "background": {"type": "solid", "color": "#ffffff"},
                "children": [],
            }
        },
    )
    run_command(
        client,
        project_id,
        "SET_BACKGROUND",
        {"pageId": "page_2", "background": {"type": "solid", "color": "#ff0000"}},
    )
    run_command(
        client,
        project_id,
        "REGISTER_ASSET",
        {
            "asset": {
                "id": "asset_1",
                "type": "image",
                "uri": "/uploads/asset.png",
                "mimeType": "image/png",
            }
        },
    )
    run_command(client, project_id, "DELETE_NODE", {"nodeId": "text_1"})
    run_command(client, project_id, "DELETE_PAGE", {"pageId": "page_2"})

    saved = client.get(f"/api/projects/{project_id}").json()["data"]["document_json"]
    assert saved["pages"][0]["children"] == []
    assert saved["assets"]["asset_1"]["mimeType"] == "image/png"


def test_atomic_batch_failure_does_not_modify_project(
    client: TestClient, valid_document: dict
) -> None:
    project = create_project(client, document_with_two_rects(valid_document))
    response = client.post(
        f"/api/projects/{project['id']}/commands",
        json={
            "id": "command_atomic_failure",
            "type": "UPDATE_NODES",
            "source": "user",
            "payload": {
                "updates": [
                    {"nodeId": "rect_1", "patch": {"transform": {"x": 999}}},
                    {"nodeId": "missing", "patch": {"transform": {"x": 999}}},
                ]
            },
        },
    )

    assert response.status_code == 400
    saved = client.get(f"/api/projects/{project['id']}").json()["data"]["document_json"]
    assert saved["nodes"]["rect_1"]["transform"]["x"] == 0
