import json
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

from agent_service.deepseek_client import ChatClient, ToolCall
from agent_service.prompt_builder import build_initial_messages
from agent_service.tool_registry import ToolContext, ToolRegistry, ToolValidationError


class AgentOperationLog(BaseModel):
    timestamp: str
    tool: str
    arguments: dict[str, Any]
    status: str
    dry_run: bool


class AgentResult(BaseModel):
    status: str
    message: str | None = None
    tool_steps: int = 0
    operations: list[AgentOperationLog] = Field(default_factory=list)


class AgentLoop:
    def __init__(
        self, client: ChatClient, registry: ToolRegistry, *, max_tool_steps: int = 8
    ) -> None:
        if max_tool_steps < 1:
            raise ValueError("max_tool_steps must be at least 1")
        self.client = client
        self.registry = registry
        self.max_tool_steps = max_tool_steps

    def run(
        self,
        user_prompt: str,
        project_id: str,
        *,
        dry_run: bool = False,
        confirmed_tools: set[str] | None = None,
    ) -> AgentResult:
        messages = build_initial_messages(user_prompt, project_id)
        operations: list[AgentOperationLog] = []
        steps = 0
        context = ToolContext(project_id, dry_run, frozenset(confirmed_tools or set()))

        while True:
            assistant = self.client.chat(messages, self.registry.definitions())
            if not assistant.tool_calls:
                return AgentResult(
                    status="completed",
                    message=assistant.content,
                    tool_steps=steps,
                    operations=operations,
                )
            messages.append(self._assistant_message(assistant.content, assistant.tool_calls))
            for call in assistant.tool_calls:
                if steps >= self.max_tool_steps:
                    return AgentResult(
                        status="max_tool_steps_reached",
                        message="Stopped before executing additional tools.",
                        tool_steps=steps,
                        operations=operations,
                    )
                steps += 1
                try:
                    result = self.registry.execute(call.name, call.arguments, context)
                    status = result.get("status", "ok") if isinstance(result, dict) else "ok"
                except ToolValidationError as exc:
                    result = {"status": "invalid_arguments", "error": str(exc)}
                    status = "invalid_arguments"
                operations.append(
                    AgentOperationLog(
                        timestamp=datetime.now(UTC).isoformat(),
                        tool=call.name,
                        arguments=call.arguments,
                        status=status,
                        dry_run=dry_run,
                    )
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": json.dumps(result, ensure_ascii=True),
                    }
                )
                if status not in {
                    "confirmation_required",
                    "invalid_arguments",
                } and self.registry.is_mutating(call.name):
                    summary = self.registry.execute("get_current_design_summary", {}, context)
                    messages.append(
                        {
                            "role": "system",
                            "content": f"Scene summary after operation: {json.dumps(summary)}",
                        }
                    )

    @staticmethod
    def _assistant_message(content: str | None, calls: list[ToolCall]) -> dict[str, Any]:
        return {
            "role": "assistant",
            "content": content,
            "tool_calls": [
                {
                    "id": call.id,
                    "type": "function",
                    "function": {"name": call.name, "arguments": json.dumps(call.arguments)},
                }
                for call in calls
            ],
        }
