from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import or_, select

from app.core.auth import CurrentUserId
from app.core.responses import success
from app.db.models import Project, Template, TemplateCategory
from app.db.session import DatabaseSession
from app.modules.projects.router import project_data
from app.modules.templates.schemas import CreateProjectFromTemplate
from app.modules.templates.service import fill_template_variables

router = APIRouter(prefix="/templates", tags=["templates"])
category_router = APIRouter(prefix="/template-categories", tags=["templates"])


def template_data(template: Template, include_document: bool = False) -> dict:
    data = {
        "id": template.id,
        "title": template.title,
        "category": template.category,
        "tags": template.tags,
        "style": template.style,
        "thumbnail_url": template.thumbnail_url,
        "variables": template.variables,
        "premium": template.premium,
        "created_at": template.created_at.isoformat(),
        "updated_at": template.updated_at.isoformat(),
    }
    if include_document:
        data["document_json"] = template.document_json
    return data


@category_router.get("")
def list_template_categories(database: DatabaseSession):
    categories = database.scalars(select(TemplateCategory).order_by(TemplateCategory.name)).all()
    return success(
        [
            {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
            }
            for category in categories
        ]
    )


@router.get("")
def list_templates(
    database: DatabaseSession,
    category: str | None = None,
    search: str | None = Query(default=None, min_length=1, max_length=100),
):
    statement = select(Template)
    if category:
        statement = statement.where(Template.category == category)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(or_(Template.title.ilike(term), Template.style.ilike(term)))
    templates = database.scalars(statement.order_by(Template.title)).all()
    return success([template_data(template) for template in templates])


@router.get("/{template_id}")
def get_template(template_id: str, database: DatabaseSession):
    template = database.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return success(template_data(template, include_document=True))


@router.post("/{template_id}/create-project", status_code=201)
def create_project_from_template(
    template_id: str,
    payload: CreateProjectFromTemplate,
    user_id: CurrentUserId,
    database: DatabaseSession,
):
    template = database.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    document = fill_template_variables(template.document_json, payload.variables)
    title = payload.title or template.title
    document["title"] = title
    project = Project(
        id=f"project_{uuid4().hex}",
        owner_id=user_id,
        title=title,
        document_json=document,
    )
    database.add(project)
    database.commit()
    database.refresh(project)
    return success(project_data(project), "project created from template", 201)
