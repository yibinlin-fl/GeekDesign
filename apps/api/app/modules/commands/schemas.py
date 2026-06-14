from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CommandRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=64)
    type: Literal[
        "CREATE_NODE", "UPDATE_NODE", "UPDATE_TEXT", "SET_STYLE", "FILL_TEMPLATE_VARIABLES"
    ]
    source: Literal["user", "ai", "system"] = "ai"
    payload: dict[str, Any]
    dry_run: bool = False
