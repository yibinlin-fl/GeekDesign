from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, ValidationError


class ToolValidationError(ValueError):
    """Raised before an invalid tool call can reach a backend API."""


@dataclass(frozen=True)
class ToolContext:
    project_id: str
    dry_run: bool = False
    confirmed_tools: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    arguments_model: type[BaseModel]
    handler: Callable[[BaseModel, ToolContext], dict[str, Any] | list[dict[str, Any]]]
    mutates_design: bool = False
    requires_confirmation: bool = False

    def schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.arguments_model.model_json_schema(),
            },
        }


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}

    def register(self, definition: ToolDefinition) -> None:
        if definition.name in self._tools:
            raise ValueError(f'Tool "{definition.name}" is already registered')
        self._tools[definition.name] = definition

    def definitions(self) -> list[dict[str, Any]]:
        return [definition.schema() for definition in self._tools.values()]

    def is_mutating(self, name: str) -> bool:
        return self._require(name).mutates_design

    def execute(self, name: str, arguments: dict[str, Any], context: ToolContext) -> Any:
        definition = self._require(name)
        try:
            parsed = definition.arguments_model.model_validate(arguments)
        except ValidationError as exc:
            raise ToolValidationError(str(exc)) from exc
        if definition.requires_confirmation and name not in context.confirmed_tools:
            return {
                "status": "confirmation_required",
                "tool": name,
                "arguments": parsed.model_dump(),
            }
        return definition.handler(parsed, context)

    def _require(self, name: str) -> ToolDefinition:
        try:
            return self._tools[name]
        except KeyError as exc:
            raise ToolValidationError(f'Unknown tool "{name}"') from exc
