from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.responses import success
from app.db.models import Template
from app.db.session import DatabaseSession

router = APIRouter(prefix="/templates", tags=["templates"])


def template_data(template: Template, include_document: bool = False) -> dict:
    data = {
        "id": template.id,
        "title": template.title,
        "category": template.category,
        "thumbnail_url": template.thumbnail_url,
    }
    if include_document:
        data["document_json"] = template.document_json
    return data


@router.get("")
def list_templates(database: DatabaseSession):
    templates = database.scalars(select(Template).order_by(Template.title)).all()
    return success([template_data(template) for template in templates])


@router.get("/{template_id}")
def get_template(template_id: str, database: DatabaseSession):
    template = database.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return success(template_data(template, include_document=True))
