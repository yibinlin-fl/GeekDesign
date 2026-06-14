from sqlalchemy.orm import Session

from app.db.models import Template


def seed_templates(database: Session) -> None:
    if database.query(Template).count() > 0:
        return
    document = {
        "schemaVersion": "0.1.0",
        "documentId": "template_blank_document",
        "title": "Blank template",
        "createdAt": "2026-06-14T00:00:00.000Z",
        "updatedAt": "2026-06-14T00:00:00.000Z",
        "canvas": {"width": 1080, "height": 1080, "unit": "px", "dpi": 96},
        "pages": [
            {
                "id": "page_1",
                "name": "Page 1",
                "background": {"type": "solid", "color": "#ffffff"},
                "children": [],
            }
        ],
        "nodes": {},
        "assets": {},
        "fonts": {},
        "variables": {},
        "metadata": {},
    }
    database.add(
        Template(
            id="template_blank",
            title="Blank canvas",
            category="blank",
            thumbnail_url=None,
            document_json=document,
        )
    )
    database.commit()
