from typing import Any
from uuid import uuid4

import httpx


class CommandApiError(RuntimeError):
    """Raised when the GeekDesign backend rejects an Agent operation."""


class CommandApiClient:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8000/api",
        *,
        access_token: str | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.client = client or httpx.Client(timeout=20)

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = kwargs.pop("headers", {})
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        response = self.client.request(method, f"{self.base_url}{path}", headers=headers, **kwargs)
        if response.is_error:
            try:
                message = response.json().get("message", response.text)
            except ValueError:
                message = response.text
            raise CommandApiError(f"Backend API rejected request: {message}")
        body = response.json()
        if not body.get("success"):
            raise CommandApiError(body.get("message", "Backend API request failed"))
        return body.get("data")

    def execute_command(
        self,
        project_id: str,
        command_type: str,
        payload: dict[str, Any],
        *,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/projects/{project_id}/commands",
            json={
                "id": f"ai_command_{uuid4().hex}",
                "type": command_type,
                "source": "ai",
                "payload": payload,
                "dry_run": dry_run,
            },
        )

    def get_summary(self, project_id: str) -> dict[str, Any]:
        return self._request("GET", f"/projects/{project_id}/summary")

    def list_elements(self, project_id: str) -> list[dict[str, Any]]:
        return self._request("GET", f"/projects/{project_id}/elements")

    def search_templates(
        self, *, search: str | None = None, category: str | None = None
    ) -> list[dict[str, Any]]:
        params = {
            key: value for key, value in {"search": search, "category": category}.items() if value
        }
        return self._request("GET", "/templates", params=params)

    def create_design_from_template(
        self,
        template_id: str,
        variables: dict[str, Any],
        *,
        title: str | None = None,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/templates/{template_id}/create-project",
            json={"variables": variables, "title": title},
        )

    def export_pdf(self, project_id: str) -> dict[str, Any]:
        return self._request("POST", "/exports/pdf", json={"project_id": project_id, "scale": 1})
