from typing import Any

import pytest

from agent_service.agent_loop import AgentLoop
from agent_service.deepseek_client import AssistantMessage, ToolCall
from agent_service.design_tools import create_design_tool_registry
from agent_service.tool_registry import ToolContext, ToolValidationError


class FakeApi:
    def __init__(self) -> None:
        self.commands: list[dict[str, Any]] = []
        self.export_calls = 0

    def execute_command(
        self, project_id: str, command_type: str, payload: dict[str, Any], *, dry_run: bool = False
    ) -> dict[str, Any]:
        self.commands.append(
            {
                "project_id": project_id,
                "type": command_type,
                "payload": payload,
                "dry_run": dry_run,
            }
        )
        return {"status": "dry_run" if dry_run else "applied"}

    def get_summary(self, project_id: str) -> dict[str, Any]:
        return {"documentId": project_id, "pages": [{"id": "page_1", "name": "Page 1"}]}

    def list_elements(self, project_id: str) -> list[dict[str, Any]]:
        return [{"id": "text_1", "type": "text", "content": "Before"}]

    def search_templates(self, **_kwargs: Any) -> list[dict[str, Any]]:
        return []

    def create_design_from_template(
        self, template_id: str, variables: dict[str, Any], *, title: str | None = None
    ) -> dict[str, Any]:
        return {"id": template_id, "variables": variables, "title": title}

    def export_pdf(self, project_id: str) -> dict[str, Any]:
        self.export_calls += 1
        return {"projectId": project_id, "status": "queued"}


class MockDeepSeek:
    def __init__(self, messages: list[AssistantMessage]) -> None:
        self.messages = messages
        self.calls = 0

    def chat(
        self, _messages: list[dict[str, Any]], _tools: list[dict[str, Any]]
    ) -> AssistantMessage:
        index = min(self.calls, len(self.messages) - 1)
        self.calls += 1
        return self.messages[index]


def update_text_call() -> AssistantMessage:
    return AssistantMessage(
        tool_calls=[
            ToolCall(
                id="call_1",
                name="update_text",
                arguments={"node_id": "text_1", "content": "After"},
            )
        ]
    )


def test_mock_deepseek_update_text_calls_command_api() -> None:
    api = FakeApi()
    client = MockDeepSeek([update_text_call(), AssistantMessage(content="Updated.")])
    result = AgentLoop(client, create_design_tool_registry(api)).run(
        "Update the title", "project_1"
    )

    assert result.status == "completed"
    assert api.commands[0]["type"] == "UPDATE_TEXT"
    assert api.commands[0]["payload"]["content"] == "After"
    assert result.operations[0].tool == "update_text"


def test_invalid_tool_arguments_are_rejected() -> None:
    api = FakeApi()
    registry = create_design_tool_registry(api)

    with pytest.raises(ToolValidationError):
        registry.execute(
            "update_text",
            {"node_id": "text_1", "content": "After", "document_json": {}},
            ToolContext("project_1"),
        )

    assert api.commands == []


def test_max_tool_steps_stops_loop() -> None:
    api = FakeApi()
    client = MockDeepSeek([update_text_call()])
    result = AgentLoop(client, create_design_tool_registry(api), max_tool_steps=2).run(
        "Keep changing it", "project_1"
    )

    assert result.status == "max_tool_steps_reached"
    assert result.tool_steps == 2
    assert len(api.commands) == 2


def test_dry_run_reaches_command_api_without_real_mutation() -> None:
    api = FakeApi()
    client = MockDeepSeek([update_text_call(), AssistantMessage(content="Previewed.")])
    result = AgentLoop(client, create_design_tool_registry(api)).run(
        "Preview a title update", "project_1", dry_run=True
    )

    assert result.status == "completed"
    assert api.commands[0]["dry_run"] is True
    assert result.operations[0].status == "dry_run"


def test_export_pdf_requires_confirmation() -> None:
    api = FakeApi()
    registry = create_design_tool_registry(api)
    result = registry.execute("export_pdf", {}, ToolContext("project_1"))

    assert result["status"] == "confirmation_required"
    assert api.export_calls == 0
