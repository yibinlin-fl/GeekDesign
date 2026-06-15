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


def _require_page(document: dict[str, Any], page_id: Any) -> dict[str, Any]:
    if isinstance(page_id, str):
        for page in document["pages"]:
            if page["id"] == page_id:
                return page
    raise HTTPException(status_code=400, detail="Command references an unknown page")


def _normalize_index(index: Any, length: int) -> int:
    if index is None:
        return length
    if not isinstance(index, int):
        raise HTTPException(status_code=400, detail="Command index must be an integer")
    return max(0, min(index, length))


def _require_patch(patch: Any) -> dict[str, Any]:
    if not isinstance(patch, dict) or not patch:
        raise HTTPException(status_code=400, detail="Command requires a non-empty patch")
    if {"id", "type", "parentId", "children"}.intersection(patch):
        raise HTTPException(status_code=400, detail="Patch cannot alter node identity or hierarchy")
    return patch


def _update_node(document: dict[str, Any], node_id: Any, patch: Any) -> None:
    node = _require_node(document, node_id)
    validated_patch = _require_patch(patch)
    if "image" in validated_patch and node["type"] != "image":
        raise HTTPException(status_code=400, detail="Image data can only update an image node")
    if "text" in validated_patch and node["type"] != "text":
        raise HTTPException(status_code=400, detail="Text data can only update a text node")
    _merge(node, validated_patch)


def _descendant_ids(document: dict[str, Any], node_id: str) -> list[str]:
    node = _require_node(document, node_id)
    result: list[str] = []
    if node["type"] in {"group", "frame"}:
        for child_id in node["children"]:
            result.append(child_id)
            result.extend(_descendant_ids(document, child_id))
    return result


def _remove_node(document: dict[str, Any], node_id: Any) -> None:
    node = _require_node(document, node_id)
    _parent_children(document, node["parentId"]).remove(node["id"])
    removed_ids = [node["id"], *_descendant_ids(document, node["id"])]
    for removed_id in removed_ids:
        document["nodes"].pop(removed_id)
    document["variables"] = {
        key: variable
        for key, variable in document["variables"].items()
        if variable.get("targetNodeId") not in removed_ids
    }


def _move_node(
    document: dict[str, Any], node_id: Any, new_parent_id: Any, index: Any = None
) -> None:
    node = _require_node(document, node_id)
    if not isinstance(new_parent_id, str):
        raise HTTPException(status_code=400, detail="MOVE_NODE requires newParentId")
    if new_parent_id == node["id"] or new_parent_id in _descendant_ids(document, node["id"]):
        raise HTTPException(status_code=400, detail="MOVE_NODE cannot create a parent-child cycle")
    old_children = _parent_children(document, node["parentId"])
    new_children = _parent_children(document, new_parent_id)
    old_children.remove(node["id"])
    new_children.insert(_normalize_index(index, len(new_children)), node["id"])
    node["parentId"] = new_parent_id


def _group_nodes(document: dict[str, Any], payload: dict[str, Any]) -> None:
    node_ids = payload.get("nodeIds")
    group_id = payload.get("groupId")
    if (
        not isinstance(node_ids, list)
        or not node_ids
        or not all(isinstance(node_id, str) for node_id in node_ids)
        or len(set(node_ids)) != len(node_ids)
        or not isinstance(group_id, str)
        or group_id in document["nodes"]
    ):
        raise HTTPException(status_code=400, detail="GROUP_NODES requires unique nodes and groupId")
    nodes = [_require_node(document, node_id) for node_id in node_ids]
    parent_id = nodes[0]["parentId"]
    if any(node["parentId"] != parent_id for node in nodes):
        raise HTTPException(status_code=400, detail="GROUP_NODES requires sibling nodes")
    siblings = _parent_children(document, parent_id)
    sorted_ids = sorted(node_ids, key=siblings.index)
    group_index = payload.get("index", min(siblings.index(node_id) for node_id in sorted_ids))
    bounds = {
        "left": min(node["transform"]["x"] for node in nodes),
        "top": min(node["transform"]["y"] for node in nodes),
        "right": max(node["transform"]["x"] + node["transform"]["width"] for node in nodes),
        "bottom": max(node["transform"]["y"] + node["transform"]["height"] for node in nodes),
    }
    group = {
        "id": group_id,
        "type": "group",
        "parentId": parent_id,
        "transform": {
            "x": bounds["left"],
            "y": bounds["top"],
            "width": bounds["right"] - bounds["left"],
            "height": bounds["bottom"] - bounds["top"],
            "rotation": 0,
            "scaleX": 1,
            "scaleY": 1,
        },
        "style": {"opacity": 1, "visible": True, "locked": False},
        "children": [],
    }
    if isinstance(payload.get("name"), str):
        group["name"] = payload["name"]
    for node_id in sorted_ids:
        siblings.remove(node_id)
    siblings.insert(_normalize_index(group_index, len(siblings)), group_id)
    document["nodes"][group_id] = group
    for node_id in sorted_ids:
        node = document["nodes"][node_id]
        node["parentId"] = group_id
        node["transform"]["x"] -= bounds["left"]
        node["transform"]["y"] -= bounds["top"]
        group["children"].append(node_id)


def _ungroup_nodes(document: dict[str, Any], group_id: Any) -> None:
    group = _require_node(document, group_id)
    if group["type"] != "group":
        raise HTTPException(status_code=400, detail="UNGROUP_NODES requires a group node")
    siblings = _parent_children(document, group["parentId"])
    group_index = siblings.index(group["id"])
    siblings.remove(group["id"])
    for offset, child_id in enumerate(group["children"]):
        child = document["nodes"][child_id]
        child["parentId"] = group["parentId"]
        child["transform"]["x"] += group["transform"]["x"]
        child["transform"]["y"] += group["transform"]["y"]
        siblings.insert(group_index + offset, child_id)
    document["nodes"].pop(group["id"])


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
        candidate["nodes"][node_id] = deepcopy(node)
        children.insert(_normalize_index(payload.get("index"), len(children)), node_id)

    elif command.type == "DELETE_NODE":
        _remove_node(candidate, payload.get("nodeId"))

    elif command.type == "UPDATE_TEXT":
        node = _require_node(candidate, payload.get("nodeId"))
        content = payload.get("content")
        if node["type"] != "text" or not isinstance(content, str):
            raise HTTPException(
                status_code=400, detail="UPDATE_TEXT requires a text node and content"
            )
        node["text"]["content"] = content

    elif command.type == "UPDATE_NODE":
        _update_node(candidate, payload.get("nodeId"), payload.get("patch"))

    elif command.type == "UPDATE_NODES":
        updates = payload.get("updates")
        if not isinstance(updates, list) or not updates:
            raise HTTPException(status_code=400, detail="UPDATE_NODES requires updates")
        for update in updates:
            if not isinstance(update, dict):
                raise HTTPException(status_code=400, detail="UPDATE_NODES entries must be objects")
            _update_node(candidate, update.get("nodeId"), update.get("patch"))

    elif command.type == "MOVE_NODE":
        _move_node(
            candidate, payload.get("nodeId"), payload.get("newParentId"), payload.get("index")
        )

    elif command.type == "RESIZE_NODE":
        width, height = payload.get("width"), payload.get("height")
        if not isinstance(width, (int, float)) or not isinstance(height, (int, float)):
            raise HTTPException(status_code=400, detail="RESIZE_NODE requires width and height")
        if width < 0 or height < 0:
            raise HTTPException(status_code=400, detail="Resize dimensions must be non-negative")
        _update_node(
            candidate, payload.get("nodeId"), {"transform": {"width": width, "height": height}}
        )

    elif command.type == "ROTATE_NODE":
        rotation = payload.get("rotation")
        if not isinstance(rotation, (int, float)):
            raise HTTPException(status_code=400, detail="ROTATE_NODE requires rotation")
        _update_node(candidate, payload.get("nodeId"), {"transform": {"rotation": rotation}})

    elif command.type == "SET_STYLE":
        node = _require_node(candidate, payload.get("nodeId"))
        style = payload.get("style")
        if not isinstance(style, dict) or not style:
            raise HTTPException(status_code=400, detail="SET_STYLE requires a non-empty style")
        _merge(node["style"], style)

    elif command.type == "REORDER_NODE":
        children = _parent_children(candidate, payload.get("parentId"))
        node_id = payload.get("nodeId")
        if node_id not in children:
            raise HTTPException(status_code=400, detail="REORDER_NODE requires a child of parentId")
        children.remove(node_id)
        children.insert(_normalize_index(payload.get("newIndex"), len(children)), node_id)

    elif command.type == "GROUP_NODES":
        _group_nodes(candidate, payload)

    elif command.type == "UNGROUP_NODES":
        _ungroup_nodes(candidate, payload.get("groupId"))

    elif command.type == "ADD_PAGE":
        page = payload.get("page")
        if not isinstance(page, dict) or page.get("children") != []:
            raise HTTPException(status_code=400, detail="ADD_PAGE requires an empty page")
        if any(existing["id"] == page.get("id") for existing in candidate["pages"]):
            raise HTTPException(status_code=400, detail="ADD_PAGE requires a unique page id")
        candidate["pages"].insert(
            _normalize_index(payload.get("index"), len(candidate["pages"])), deepcopy(page)
        )

    elif command.type == "DELETE_PAGE":
        page = _require_page(candidate, payload.get("pageId"))
        if len(candidate["pages"]) == 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last page")
        for node_id in list(page["children"]):
            _remove_node(candidate, node_id)
        candidate["pages"].remove(page)

    elif command.type == "SET_BACKGROUND":
        background = payload.get("background")
        if not isinstance(background, dict):
            raise HTTPException(status_code=400, detail="SET_BACKGROUND requires background")
        _require_page(candidate, payload.get("pageId"))["background"] = deepcopy(background)

    elif command.type == "REGISTER_ASSET":
        asset = payload.get("asset")
        if not isinstance(asset, dict) or not isinstance(asset.get("id"), str):
            raise HTTPException(status_code=400, detail="REGISTER_ASSET requires an asset")
        if asset["id"] in candidate["assets"]:
            raise HTTPException(status_code=400, detail="REGISTER_ASSET requires a unique asset id")
        candidate["assets"][asset["id"]] = deepcopy(asset)

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
