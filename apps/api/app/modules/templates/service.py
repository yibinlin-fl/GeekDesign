from copy import deepcopy
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.core.design_document import DesignDocumentValidationError, validate_design_document

SUPPORTED_VARIABLE_PATHS = {
    "text.content",
    "style.fill.color",
    "image.assetId",
}


def fill_template_variables(
    document_json: dict[str, Any], values: dict[str, Any]
) -> dict[str, Any]:
    document = deepcopy(document_json)
    definitions = document.get("variables", {})
    unknown_keys = sorted(set(values) - set(definitions))
    if unknown_keys:
        raise DesignDocumentValidationError(
            f"Unknown template variables: {', '.join(unknown_keys)}"
        )

    for key, definition in definitions.items():
        value = values.get(key, definition.get("defaultValue"))
        if value is None:
            if definition.get("required"):
                raise DesignDocumentValidationError(f'Template variable "{key}" is required')
            continue
        _apply_variable(document, definition, value)

    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    document["documentId"] = f"design_{uuid4().hex}"
    document["createdAt"] = now
    document["updatedAt"] = now
    return validate_design_document(document)


def _apply_variable(document: dict[str, Any], definition: dict[str, Any], value: Any) -> None:
    path = definition.get("path")
    if path not in SUPPORTED_VARIABLE_PATHS:
        raise DesignDocumentValidationError(f'Unsupported template variable path "{path}"')

    variable_type = definition.get("type")
    if variable_type in {"text", "date", "color", "image"} and not isinstance(value, str):
        raise DesignDocumentValidationError(
            f'Template variable "{definition.get("key")}" requires a string'
        )
    if variable_type == "number" and not isinstance(value, int | float):
        raise DesignDocumentValidationError(
            f'Template variable "{definition.get("key")}" requires a number'
        )

    node_id = definition.get("targetNodeId")
    node = document.get("nodes", {}).get(node_id)
    if not node:
        raise DesignDocumentValidationError(f'Template variable target "{node_id}" is missing')

    if path == "text.content":
        if node.get("type") != "text":
            raise DesignDocumentValidationError("text.content requires a text node")
        node["text"]["content"] = str(value)
    elif path == "style.fill.color":
        fill = node.get("style", {}).get("fill")
        if not fill or fill.get("type") != "solid":
            raise DesignDocumentValidationError("style.fill.color requires a solid fill")
        fill["color"] = value
    elif path == "image.assetId":
        if node.get("type") != "image":
            raise DesignDocumentValidationError("image.assetId requires an image node")
        node["image"]["assetId"] = value
