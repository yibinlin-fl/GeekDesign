import base64

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import Asset
from app.modules.assets.router import MAX_UPLOAD_BYTES
from app.modules.assets.storage import LocalAssetStorage

PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def upload_png(client: TestClient) -> dict:
    response = client.post(
        "/api/assets/upload",
        files={"file": ("../../user-name.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    return response.json()["data"]


def test_upload_valid_image_generates_random_path_and_thumbnail(
    client: TestClient, database: Session, asset_storage: LocalAssetStorage
) -> None:
    asset = upload_png(client)
    stored = database.get(Asset, asset["id"])

    assert asset["filename"] == "user-name.png"
    assert asset["url"].endswith(".png")
    assert asset["thumbnail_url"].endswith("_thumb.webp")
    assert stored is not None
    assert "user-name.png" not in stored.storage_key
    assert (asset_storage.root / stored.storage_key).is_file()
    assert (asset_storage.root / stored.thumbnail_key).is_file()


def test_rejects_invalid_mime(client: TestClient) -> None:
    response = client.post(
        "/api/assets/upload",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Unsupported asset MIME type"


def test_rejects_spoofed_image_content(client: TestClient) -> None:
    response = client.post(
        "/api/assets/upload",
        files={"file": ("fake.png", b"not a png", "image/png")},
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Uploaded file is not a valid image"


def test_rejects_oversized_file(client: TestClient) -> None:
    response = client.post(
        "/api/assets/upload",
        files={"file": ("large.png", b"x" * (MAX_UPLOAD_BYTES + 1), "image/png")},
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Asset exceeds upload size limit"


def test_asset_list_detail_and_delete_owner_boundary(client: TestClient, database: Session) -> None:
    asset = upload_png(client)

    assert client.get("/api/assets").json()["data"][0]["id"] == asset["id"]
    assert client.get(f"/api/assets/{asset['id']}").status_code == 200

    stored = database.get(Asset, asset["id"])
    assert stored is not None
    stored.owner_id = "another-user"
    database.commit()

    response = client.delete(f"/api/assets/{asset['id']}")
    assert response.status_code == 404
    assert database.get(Asset, asset["id"]) is not None


def test_delete_owned_asset_removes_files(
    client: TestClient, database: Session, asset_storage: LocalAssetStorage
) -> None:
    asset = upload_png(client)
    stored = database.get(Asset, asset["id"])
    assert stored is not None
    original = asset_storage.root / stored.storage_key
    thumbnail = asset_storage.root / stored.thumbnail_key

    response = client.delete(f"/api/assets/{asset['id']}")

    assert response.status_code == 200
    assert database.get(Asset, asset["id"]) is None
    assert not original.exists()
    assert not thumbnail.exists()
