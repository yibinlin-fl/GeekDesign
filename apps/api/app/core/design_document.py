from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator


class DesignDocumentValidationError(ValueError):
    """Raised when a persisted design document fails basic schema validation."""


class CanvasSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width: float = Field(gt=0)
    height: float = Field(gt=0)
    unit: Literal["px", "mm", "in"]
    dpi: float = Field(gt=0)


class PageSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    children: list[str]
    background: dict[str, Any]


class NodeSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    type: Literal[
        "text", "image", "rect", "ellipse", "line", "svg", "table", "chart", "group", "frame"
    ]
    parentId: str = Field(min_length=1)
    transform: dict[str, Any]
    style: dict[str, Any]


class DesignDocumentSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    schemaVersion: Literal["0.1.0"]
    documentId: str = Field(min_length=1)
    title: str = Field(min_length=1)
    createdAt: str
    updatedAt: str
    canvas: CanvasSchema
    pages: list[PageSchema] = Field(min_length=1)
    nodes: dict[str, NodeSchema]
    assets: dict[str, Any]
    fonts: dict[str, Any]
    variables: dict[str, Any]
    metadata: dict[str, Any]

    @model_validator(mode="after")
    def validate_node_structure(self) -> "DesignDocumentSchema":
        page_ids = {page.id for page in self.pages}
        occurrences: dict[str, int] = {}
        for node_id, node in self.nodes.items():
            if node_id != node.id:
                raise ValueError(f'node key "{node_id}" must match node.id')
            if node.parentId not in page_ids and node.parentId not in self.nodes:
                raise ValueError(f'node "{node_id}" references missing parent')

        for page in self.pages:
            for child_id in page.children:
                occurrences[child_id] = occurrences.get(child_id, 0) + 1
                if child_id not in self.nodes:
                    raise ValueError(f'page "{page.id}" references missing child')
                if self.nodes[child_id].parentId != page.id:
                    raise ValueError(f'child "{child_id}" has inconsistent parentId')

        for node_id, node in self.nodes.items():
            if node.type in {"group", "frame"}:
                children = node.model_extra.get("children", []) if node.model_extra else []
                if not isinstance(children, list):
                    raise ValueError(f'container "{node_id}" children must be an array')
                for child_id in children:
                    occurrences[child_id] = occurrences.get(child_id, 0) + 1
                    if child_id not in self.nodes:
                        raise ValueError(f'container "{node_id}" references missing child')
                    if self.nodes[child_id].parentId != node_id:
                        raise ValueError(f'child "{child_id}" has inconsistent parentId')

        for node_id in self.nodes:
            if occurrences.get(node_id) != 1:
                raise ValueError(f'node "{node_id}" must appear exactly once in parent children')
        return self


def validate_design_document(document: Any) -> dict[str, Any]:
    try:
        return DesignDocumentSchema.model_validate(document).model_dump(by_alias=True)
    except ValidationError as exc:
        raise DesignDocumentValidationError(str(exc)) from exc
