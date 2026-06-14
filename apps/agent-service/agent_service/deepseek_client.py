import json
from typing import Any, Protocol

import httpx
from pydantic import BaseModel, ConfigDict, Field


class ToolCall(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    arguments: dict[str, Any]


class AssistantMessage(BaseModel):
    content: str | None = None
    tool_calls: list[ToolCall] = Field(default_factory=list)


class ChatClient(Protocol):
    def chat(
        self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]
    ) -> AssistantMessage: ...


class DeepSeekClient:
    def __init__(
        self,
        api_key: str,
        *,
        model: str = "deepseek-chat",
        base_url: str = "https://api.deepseek.com",
        client: httpx.Client | None = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.client = client or httpx.Client(timeout=60)

    def chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> AssistantMessage:
        response = self.client.post(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"model": self.model, "messages": messages, "tools": tools, "tool_choice": "auto"},
        )
        response.raise_for_status()
        message = response.json()["choices"][0]["message"]
        calls = []
        for call in message.get("tool_calls", []):
            arguments = json.loads(call["function"].get("arguments") or "{}")
            calls.append(
                ToolCall(id=call["id"], name=call["function"]["name"], arguments=arguments)
            )
        return AssistantMessage(content=message.get("content"), tool_calls=calls)
