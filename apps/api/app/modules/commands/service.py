from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from app.core.design_document import validate_design_document
from app.modules.commands.schemas import CommandRequest


def _merge(target: dict[str, Any], patch: dict[str, Any]) -> None:
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            _merge(target[key], value)
        else:
            target[key] = deepcopy(value)


def _require_node(document: dict[str, Any], node_id: Any) -> dict[str, Any]:
    if not isinstance(node_id, str) or node_id not in document["nodes"]:
        raise HTTPException(status_code=400, detail="Command references an unknown node")
    return document["nodes"][node_id]


def _parent_children(document: dict[str, Any], parent_id: str) -> list[str]:
    for page in document["pages"]:
        if page["id"] == parent_id:
            return page["children"]
    parent = _require_node(document, parent_id)
    if parent["type"] not in {"group", "frame"}:
        raise HTTPException(status_code=400, detail="Parent must be a page, group, or frame")
    return parent["children"]


def _set_path(document: dict[str, Any], node_id: str, path: str, value: Any) -> None:
    node = _require_node(document, node_id)
    allowed_paths = {
        "text.content",
        "style.fill.color",
        "image.assetId",
    }
    if path not in allowed_paths:
        raise HTTPException(status_code=400, detail=f'Unsupported template variable path "{path}"')
    cursor = node
    parts = path.split(".")
    for part in parts[:-1]:
        child = cursor.get(part)
        if not isinstance(child, dict):
            raise HTTPException(status_code=400, detail=f'Invalid template variable path "{path}"')
        cursor = child
    cursor[parts[-1]] = value


def execute_command(document: dict[str, Any], command: CommandRequest) -> dict[str, Any]:
    candidate = deepcopy(document)
    payload = command.payload

    if command.type == "CREATE_NODE":
        node = payload.get("node")
        parent_id = payload.get("parentId")
        if not isinstance(node, dict) or not isinstance(parent_id, str):
            raise HTTPException(status_code=400, detail="CREATE_NODE requires node and parentId")
        node_id = node.get("id")
        if not isinstance(node_id, str) or node_id in candidate["nodes"]:
            raise HTTPException(status_code=400, detail="CREATE_NODE requires a unique node id")
        if node.get("parentId") != parent_id:
            raise HTTPException(status_code=400, detail="Node parentId must match command parentId")
        children = _parent_children(candidate, parent_id)
        index = payload.get("index", len(children))
        if not isinstance(index, int) or index < 0 or index > len(children):
            raise HTTPException(status_code=400, detail="CREATE_NODE index is invalid")
        candidate["nodes"][node_id] = deepcopy(node)
        children.insert(index, node_id)

    elif command.type == "UPDATE_TEXT":
        node = _require_node(candidate, payload.get("nodeId"))
        content = payload.get("content")
        if node["type"] != "text" or not isinstance(content, str):
            raise HTTPException(
                status_code=400, detail="UPDATE_TEXT requires a text node and content"
            )
        node["text"]["content"] = content

    elif command.type == "UPDATE_NODE":
        node = _require_node(candidate, payload.get("nodeId"))
        patch = payload.get("patch")
        if not isinstance(patch, dict) or not patch:
            raise HTTPException(status_code=400, detail="UPDATE_NODE requires a non-empty patch")
        forbidden = {"id", "type", "parentId", "children"}
        if forbidden.intersection(patch):
            raise HTTPException(
                status_code=400, detail="UPDATE_NODE cannot alter node identity or hierarchy"
            )
        if not set(patch).issubset({"transform", "style", "name", "role"}):
            raise HTTPException(
                status_code=400, detail="UPDATE_NODE patch contains unsupported fields"
            )
        _merge(node, patch)

    elif command.type == "SET_STYLE":
        node = _require_node(candidate, payload.get("nodeId"))
        style = payload.get("style")
        if not isinstance(style, dict) or not style:
            raise HTTPException(status_code=400, detail="SET_STYLE requires a non-empty style")
        _merge(node["style"], style)

    elif command.type == "FILL_TEMPLATE_VARIABLES":
        values = payload.get("values")
        if not isinstance(values, dict):
            raise HTTPException(status_code=400, detail="FILL_TEMPLATE_VARIABLES requires values")
        for key, value in values.items():
            variable = candidate["variables"].get(key)
            if not isinstance(variable, dict):
                raise HTTPException(status_code=400, detail=f'Unknown template variable "{key}"')
            _set_path(candidate, variable["targetNodeId"], variable["path"], value)

    candidate["updatedAt"] = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    return validate_design_document(candidate)


def design_summary(document: dict[str, Any]) -> dict[str, Any]:
    roles: dict[str, int] = {}
    types: dict[str, int] = {}
    for node in document["nodes"].values():
        types[node["type"]] = types.get(node["type"], 0) + 1
        if role := node.get("role"):
            roles[role] = roles.get(role, 0) + 1
    return {
        "documentId": document["documentId"],
        "title": document["title"],
        "schemaVersion": document["schemaVersion"],
        "canvas": document["canvas"],
        "pages": [{"id": page["id"], "name": page["name"]} for page in document["pages"]],
        "nodeCount": len(document["nodes"]),
        "nodeTypes": types,
        "roles": roles,
    }


def element_list(document: dict[str, Any]) -> list[dict[str, Any]]:
    elements = []
    for node in document["nodes"].values():
        item = {
            "id": node["id"],
            "type": node["type"],
            "parentId": node["parentId"],
            "name": node.get("name"),
            "role": node.get("role"),
            "transform": node["transform"],
        }
        if node["type"] == "text":
            item["content"] = node["text"]["content"]
        elements.append(item)
    return elements
