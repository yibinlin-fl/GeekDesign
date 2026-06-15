import base64
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_SHAPE_TYPE
from pptx.util import Inches, Pt

from app.core.config import settings

PX_PER_INCH = 96


def export_pptx(document: dict) -> bytes:
    presentation = Presentation()
    presentation.slide_width = Inches(document["canvas"]["width"] / PX_PER_INCH)
    presentation.slide_height = Inches(document["canvas"]["height"] / PX_PER_INCH)
    presentation.slides._sldIdLst.clear()
    blank = presentation.slide_layouts[6]

    for page in document["pages"]:
        slide = presentation.slides.add_slide(blank)
        for node_id in page["children"]:
            node = document["nodes"].get(node_id)
            if node:
                _export_node(slide, node, document)

    output = BytesIO()
    presentation.save(output)
    return output.getvalue()


def import_pptx(contents: bytes, title: str = "Imported presentation") -> dict:
    presentation = Presentation(BytesIO(contents))
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    document = {
        "schemaVersion": "0.1.0",
        "documentId": f"design_{uuid4().hex}",
        "title": title,
        "createdAt": now,
        "updatedAt": now,
        "canvas": {
            "width": presentation.slide_width / Inches(1) * PX_PER_INCH,
            "height": presentation.slide_height / Inches(1) * PX_PER_INCH,
            "unit": "px",
            "dpi": 96,
        },
        "pages": [],
        "nodes": {},
        "assets": {},
        "fonts": {},
        "variables": {},
        "metadata": {"custom": {"pptxImport": {"unsupportedShapes": 0}}},
    }
    for slide_index, slide in enumerate(presentation.slides, start=1):
        page_id = f"page_{uuid4().hex}"
        page = {
            "id": page_id,
            "name": f"Slide {slide_index}",
            "background": {"type": "solid", "color": "#ffffff"},
            "children": [],
        }
        document["pages"].append(page)
        for shape in slide.shapes:
            node = _import_shape(shape, page_id, document)
            if node:
                document["nodes"][node["id"]] = node
                page["children"].append(node["id"])
            else:
                document["metadata"]["custom"]["pptxImport"]["unsupportedShapes"] += 1
    if not document["pages"]:
        document["pages"].append(
            {
                "id": "page_1",
                "name": "Slide 1",
                "background": {"type": "solid", "color": "#ffffff"},
                "children": [],
            }
        )
    return document


def _export_node(slide, node: dict, document: dict) -> None:
    transform = node["transform"]
    left = Inches(transform["x"] / PX_PER_INCH)
    top = Inches(transform["y"] / PX_PER_INCH)
    width = Inches(transform["width"] / PX_PER_INCH)
    height = Inches(transform["height"] / PX_PER_INCH)

    if node["type"] == "text":
        shape = slide.shapes.add_textbox(left, top, width, height)
        _write_text(shape.text_frame, node)
    elif node["type"] in {"rect", "ellipse"}:
        shape_type = MSO_SHAPE.RECTANGLE if node["type"] == "rect" else MSO_SHAPE.OVAL
        shape = slide.shapes.add_shape(shape_type, left, top, width, height)
        _apply_shape_style(shape, node)
    elif node["type"] == "line":
        slide.shapes.add_connector(
            1,
            left,
            top,
            Inches((transform["x"] + transform["width"]) / PX_PER_INCH),
            Inches((transform["y"] + transform["height"]) / PX_PER_INCH),
        )
    elif node["type"] == "image":
        asset = document["assets"].get(node["image"]["assetId"])
        image = _asset_bytes(asset.get("uri", "")) if asset else None
        if image:
            slide.shapes.add_picture(BytesIO(image), left, top, width, height)


def _write_text(text_frame, node: dict) -> None:
    text_frame.clear()
    content = node["text"]["content"]
    paragraph = text_frame.paragraphs[0]
    runs = node["text"].get("runs") or []
    boundaries = sorted(
        {
            0,
            len(content),
            *(item["start"] for item in runs),
            *(item["end"] for item in runs),
        }
    )
    for start, end in zip(boundaries, boundaries[1:], strict=False):
        run_data = next(
            (item for item in runs if item["start"] <= start and item["end"] >= end),
            {},
        )
        run = paragraph.add_run()
        run.text = content[start:end]
        font = run.font
        font.name = run_data.get("fontFamily", node["text"]["fontFamily"])
        font.size = Pt(run_data.get("fontSize", node["text"]["fontSize"]) * 0.75)
        font.bold = run_data.get("fontWeight", node["text"]["fontWeight"]) >= 700
        font.italic = run_data.get("italic", False)
        font.underline = run_data.get("underline", False)
        color = run_data.get("color") or _solid_color(node.get("style", {}).get("fill"))
        if color:
            font.color.rgb = RGBColor.from_string(color[1:])


def _apply_shape_style(shape, node: dict) -> None:
    color = _solid_color(node.get("style", {}).get("fill"))
    if color:
        shape.fill.solid()
        shape.fill.fore_color.rgb = RGBColor.from_string(color[1:])
    else:
        shape.fill.background()


def _import_shape(shape, page_id: str, document: dict) -> dict | None:
    transform = {
        "x": shape.left / Inches(1) * PX_PER_INCH,
        "y": shape.top / Inches(1) * PX_PER_INCH,
        "width": shape.width / Inches(1) * PX_PER_INCH,
        "height": shape.height / Inches(1) * PX_PER_INCH,
        "rotation": float(shape.rotation or 0),
        "scaleX": 1,
        "scaleY": 1,
    }
    base = {
        "id": f"node_{uuid4().hex}",
        "parentId": page_id,
        "transform": transform,
        "style": {"opacity": 1, "visible": True, "locked": False},
        "name": shape.name,
    }
    if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
        asset_id = f"asset_{uuid4().hex}"
        mime = shape.image.content_type
        document["assets"][asset_id] = {
            "id": asset_id,
            "type": "image",
            "uri": f"data:{mime};base64,{base64.b64encode(shape.image.blob).decode()}",
            "mimeType": mime,
        }
        return {**base, "type": "image", "image": {"assetId": asset_id, "fit": "stretch"}}
    if getattr(shape, "has_text_frame", False) and shape.text.strip():
        content = shape.text
        runs = []
        offset = 0
        for paragraph_index, paragraph in enumerate(shape.text_frame.paragraphs):
            for run in paragraph.runs:
                end = offset + len(run.text)
                style = {"start": offset, "end": end}
                if run.font.bold is not None:
                    style["fontWeight"] = 700 if run.font.bold else 400
                if run.font.italic is not None:
                    style["italic"] = run.font.italic
                if run.font.underline is not None:
                    style["underline"] = bool(run.font.underline)
                if run.font.name:
                    style["fontFamily"] = run.font.name
                if run.font.size:
                    style["fontSize"] = run.font.size.pt / 0.75
                if end > offset:
                    runs.append(style)
                offset = end
            if paragraph_index < len(shape.text_frame.paragraphs) - 1:
                offset += 1
        return {
            **base,
            "type": "text",
            "style": {**base["style"], "fill": {"type": "solid", "color": "#18181b"}},
            "text": {
                "content": content,
                "fontFamily": "Arial",
                "fontSize": 32,
                "fontWeight": 400,
                "lineHeight": 1.2,
                "letterSpacing": 0,
                "textAlign": "left",
                "runs": runs,
            },
        }
    if shape.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE:
        node_type = "ellipse" if shape.auto_shape_type == MSO_SHAPE.OVAL else "rect"
        return {
            **base,
            "type": node_type,
            "style": {
                **base["style"],
                "fill": {"type": "solid", "color": "#7c3aed"},
            },
            **({"cornerRadius": 0} if node_type == "rect" else {}),
        }
    return None


def _solid_color(paint: dict | None) -> str | None:
    return paint.get("color") if paint and paint.get("type") == "solid" else None


def _decode_data_uri(uri: str) -> bytes | None:
    if not uri.startswith("data:") or ";base64," not in uri:
        return None
    return base64.b64decode(uri.split(";base64,", 1)[1])


def _asset_bytes(uri: str) -> bytes | None:
    embedded = _decode_data_uri(uri)
    if embedded:
        return embedded
    if not uri.startswith("/uploads/"):
        return None
    root = Path(settings.uploads_dir).resolve()
    path = (root / uri.removeprefix("/uploads/")).resolve()
    if root not in path.parents or not path.is_file():
        return None
    return path.read_bytes()
