from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CommandRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(min_length=1, max_length=64)
    type: Literal[
        "CREATE_NODE",
        "DELETE_NODE",
        "UPDATE_NODE",
        "UPDATE_NODES",
        "MOVE_NODE",
        "RESIZE_NODE",
        "ROTATE_NODE",
        "SET_STYLE",
        "UPDATE_TEXT",
        "REORDER_NODE",
        "GROUP_NODES",
        "UNGROUP_NODES",
        "ADD_PAGE",
        "UPDATE_PAGE",
        "DELETE_PAGE",
        "SET_BACKGROUND",
        "APPLY_THEME",
        "APPLY_LAYOUT",
        "REGISTER_ASSET",
        "FILL_TEMPLATE_VARIABLES",
    ]
    source: Literal["user", "ai", "system"] = "ai"
    payload: dict[str, Any]
    schema_version: Literal["0.1.0"] = Field(default="0.1.0", alias="schemaVersion")
    client_sequence: int | None = Field(default=None, alias="clientSequence", ge=0)
    require_confirmation: bool = Field(default=False, alias="requireConfirmation")
    dry_run: bool = False
