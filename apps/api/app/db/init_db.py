from copy import deepcopy

from sqlalchemy.orm import Session

from app.db.models import Template, TemplateCategory


def seed_templates(database: Session) -> None:
    if database.query(TemplateCategory).count() == 0:
        database.add_all(
            [
                TemplateCategory(
                    id="category_social",
                    name="Social",
                    slug="social",
                    description="Social posts and event announcements",
                ),
                TemplateCategory(
                    id="category_professional",
                    name="Professional",
                    slug="professional",
                    description="Resumes and business documents",
                ),
            ]
        )
    if database.query(Template).count() > 0:
        database.commit()
        return

    document = _template_document()
    database.add_all(
        [
            Template(
                id="template_event",
                title="Gradient Event Announcement",
                category="social",
                tags=["event", "announcement", "gradient"],
                style="bold",
                thumbnail_url="/template-previews/event-gradient.svg",
                document_json=document,
                variables=list(document["variables"].values()),
                premium=False,
            ),
            Template(
                id="template_resume",
                title="Minimal Product Resume",
                category="professional",
                tags=["resume", "minimal"],
                style="minimal",
                thumbnail_url="/template-previews/resume-minimal.svg",
                document_json=_resume_document(),
                variables=[],
                premium=True,
            ),
        ]
    )
    database.commit()


def _template_document() -> dict:
    return {
        "schemaVersion": "0.1.0",
        "documentId": "template_event_document",
        "title": "Gradient Event Announcement",
        "createdAt": "2026-06-14T00:00:00.000Z",
        "updatedAt": "2026-06-14T00:00:00.000Z",
        "canvas": {"width": 1080, "height": 1080, "unit": "px", "dpi": 96},
        "pages": [
            {
                "id": "page_1",
                "name": "Page 1",
                "background": {
                    "type": "linear-gradient",
                    "angle": 135,
                    "stops": [
                        {"offset": 0, "color": "#1e1b4b"},
                        {"offset": 1, "color": "#7c3aed"},
                    ],
                },
                "children": ["title_node", "date_node"],
            }
        ],
        "nodes": {
            "title_node": _text_node("title_node", "Design Futures", "title", 84, 220),
            "date_node": _text_node("date_node", "June 28, 2026", "date", 34, 500),
        },
        "assets": {},
        "fonts": {},
        "variables": {
            "title": {
                "key": "title",
                "label": "Event title",
                "targetNodeId": "title_node",
                "path": "text.content",
                "type": "text",
                "required": True,
                "defaultValue": "Design Futures",
            },
            "date": {
                "key": "date",
                "label": "Event date",
                "targetNodeId": "date_node",
                "path": "text.content",
                "type": "date",
                "defaultValue": "June 28, 2026",
            },
        },
        "metadata": {"tags": ["event", "social"]},
    }


def _resume_document() -> dict:
    document = deepcopy(_template_document())
    document["documentId"] = "template_resume_document"
    document["title"] = "Minimal Product Resume"
    document["variables"] = {}
    document["metadata"] = {"tags": ["resume", "professional"]}
    return document


def _text_node(node_id: str, content: str, role: str, font_size: int, y: int) -> dict:
    return {
        "id": node_id,
        "type": "text",
        "parentId": "page_1",
        "role": role,
        "transform": {
            "x": 120,
            "y": y,
            "width": 840,
            "height": 140,
            "rotation": 0,
            "scaleX": 1,
            "scaleY": 1,
        },
        "style": {
            "opacity": 1,
            "visible": True,
            "locked": False,
            "fill": {"type": "solid", "color": "#ffffff"},
        },
        "text": {
            "content": content,
            "fontFamily": "Inter",
            "fontSize": font_size,
            "fontWeight": 700,
            "lineHeight": 1.2,
            "letterSpacing": 0,
            "textAlign": "center",
        },
    }
