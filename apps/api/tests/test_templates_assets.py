from fastapi.testclient import TestClient

from app.modules.templates.service import fill_template_variables


def test_template_list_and_filters(client: TestClient) -> None:
    response = client.get("/api/templates", params={"category": "social", "search": "event"})

    assert response.status_code == 200
    templates = response.json()["data"]
    assert [template["id"] for template in templates] == ["template_event"]
    assert templates[0]["variables"][0]["targetNodeId"] == "title_node"


def test_template_categories(client: TestClient) -> None:
    response = client.get("/api/template-categories")

    assert response.status_code == 200
    assert {category["slug"] for category in response.json()["data"]} == {
        "professional",
        "social",
    }


def test_template_variable_replacement(client: TestClient) -> None:
    template = client.get("/api/templates/template_event").json()["data"]

    filled = fill_template_variables(
        template["document_json"],
        {"title": "GeekDesign Launch", "date": "July 8, 2026"},
    )

    assert filled["nodes"]["title_node"]["text"]["content"] == "GeekDesign Launch"
    assert filled["nodes"]["date_node"]["text"]["content"] == "July 8, 2026"
    assert filled["documentId"] != template["document_json"]["documentId"]
    assert template["document_json"]["nodes"]["title_node"]["text"]["content"] == "Design Futures"


def test_create_project_from_template(client: TestClient) -> None:
    response = client.post(
        "/api/templates/template_event/create-project",
        json={
            "title": "Launch campaign",
            "variables": {"title": "GeekDesign Launch", "date": "July 8, 2026"},
        },
    )

    assert response.status_code == 201
    project = response.json()["data"]
    assert project["title"] == "Launch campaign"
    assert project["document_json"]["nodes"]["title_node"]["text"]["content"] == "GeekDesign Launch"


def test_asset_upload_mock(client: TestClient) -> None:
    response = client.post(
        "/api/assets/upload",
        files={"file": ("preview.png", b"mock-png-content", "image/png")},
    )

    assert response.status_code == 201
    asset = response.json()["data"]
    assert asset["filename"] == "preview.png"
    assert asset["storage_key"].startswith("mock://uploads/")
