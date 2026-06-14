from fastapi.testclient import TestClient


def test_template_list(client: TestClient) -> None:
    response = client.get("/api/templates")

    assert response.status_code == 200
    assert response.json()["data"][0]["id"] == "template_blank"


def test_asset_upload_mock(client: TestClient) -> None:
    response = client.post(
        "/api/assets/upload",
        files={"file": ("preview.png", b"mock-png-content", "image/png")},
    )

    assert response.status_code == 201
    asset = response.json()["data"]
    assert asset["filename"] == "preview.png"
    assert asset["storage_key"].startswith("mock://uploads/")
