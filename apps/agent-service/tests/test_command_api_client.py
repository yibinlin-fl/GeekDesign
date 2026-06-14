import httpx

from agent_service.command_api_client import CommandApiClient


def test_command_api_client_posts_ai_command() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["body"] = __import__("json").loads(request.content)
        return httpx.Response(
            200,
            json={"success": True, "data": {"status": "applied"}, "message": "ok"},
        )

    client = CommandApiClient(
        "http://backend/api",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    result = client.execute_command(
        "project_1", "UPDATE_TEXT", {"nodeId": "text_1", "content": "Hi"}
    )

    assert result["status"] == "applied"
    assert captured["path"] == "/api/projects/project_1/commands"
    assert captured["body"]["source"] == "ai"
