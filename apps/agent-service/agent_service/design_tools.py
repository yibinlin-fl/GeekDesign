from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from agent_service.command_api_client import CommandApiClient
from agent_service.tool_registry import ToolContext, ToolDefinition, ToolRegistry


class StrictArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class NoArguments(StrictArguments):
    pass


class UpdateTextArguments(StrictArguments):
    node_id: str = Field(min_length=1)
    content: str


class AddTextArguments(StrictArguments):
    content: str
    parent_id: str | None = None
    x: float = 100
    y: float = 100
    width: float = Field(default=400, gt=0)
    height: float = Field(default=80, gt=0)
    font_size: float = Field(default=32, gt=0)
    role: str | None = None


class MoveElementArguments(StrictArguments):
    node_id: str = Field(min_length=1)
    x: float
    y: float


class NodeArguments(StrictArguments):
    node_id: str = Field(min_length=1)


class RotateElementArguments(NodeArguments):
    rotation: float


class ReorderElementArguments(NodeArguments):
    parent_id: str = Field(min_length=1)
    new_index: int = Field(ge=0)


class GroupElementsArguments(StrictArguments):
    node_ids: list[str] = Field(min_length=1, max_length=100)


class AddPageArguments(StrictArguments):
    name: str = Field(default="New page", min_length=1, max_length=100)
    background_color: str = Field(default="#ffffff", pattern=r"^#[0-9a-fA-F]{6}$")


class PageArguments(StrictArguments):
    page_id: str = Field(min_length=1)


class SetPageBackgroundArguments(PageArguments):
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class SetStyleArguments(StrictArguments):
    node_id: str = Field(min_length=1)
    style: dict[str, Any]


class SearchTemplatesArguments(StrictArguments):
    search: str | None = None
    category: str | None = None


class CreateFromTemplateArguments(StrictArguments):
    template_id: str = Field(min_length=1)
    variables: dict[str, Any] = Field(default_factory=dict)
    title: str | None = None


class FillVariablesArguments(StrictArguments):
    values: dict[str, Any]


class ExportPdfArguments(StrictArguments):
    pass


class DesignToolService:
    def __init__(self, api: CommandApiClient) -> None:
        self.api = api

    def summary(self, _args: BaseModel, context: ToolContext) -> dict[str, Any]:
        return self.api.get_summary(context.project_id)

    def elements(self, _args: BaseModel, context: ToolContext) -> list[dict[str, Any]]:
        return self.api.list_elements(context.project_id)

    def update_text(self, args: UpdateTextArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "UPDATE_TEXT",
            {"nodeId": args.node_id, "content": args.content},
            dry_run=context.dry_run,
        )

    def add_text(self, args: AddTextArguments, context: ToolContext) -> dict[str, Any]:
        parent_id = args.parent_id
        if parent_id is None:
            parent_id = self.api.get_summary(context.project_id)["pages"][0]["id"]
        node_id = f"text_{uuid4().hex}"
        node = {
            "id": node_id,
            "type": "text",
            "parentId": parent_id,
            "role": args.role,
            "transform": {
                "x": args.x,
                "y": args.y,
                "width": args.width,
                "height": args.height,
                "rotation": 0,
                "scaleX": 1,
                "scaleY": 1,
            },
            "style": {"opacity": 1, "visible": True, "locked": False},
            "text": {
                "content": args.content,
                "fontFamily": "Arial",
                "fontSize": args.font_size,
                "fontWeight": 400,
                "lineHeight": 1.2,
                "letterSpacing": 0,
                "textAlign": "left",
            },
        }
        if args.role is None:
            node.pop("role")
        return self.api.execute_command(
            context.project_id,
            "CREATE_NODE",
            {"parentId": parent_id, "node": node},
            dry_run=context.dry_run,
        )

    def move_element(self, args: MoveElementArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "UPDATE_NODE",
            {"nodeId": args.node_id, "patch": {"transform": {"x": args.x, "y": args.y}}},
            dry_run=context.dry_run,
        )

    def delete_element(self, args: NodeArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id, "DELETE_NODE", {"nodeId": args.node_id}, dry_run=context.dry_run
        )

    def rotate_element(self, args: RotateElementArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "ROTATE_NODE",
            {"nodeId": args.node_id, "rotation": args.rotation},
            dry_run=context.dry_run,
        )

    def reorder_element(
        self, args: ReorderElementArguments, context: ToolContext
    ) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "REORDER_NODE",
            {"parentId": args.parent_id, "nodeId": args.node_id, "newIndex": args.new_index},
            dry_run=context.dry_run,
        )

    def group_elements(self, args: GroupElementsArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "GROUP_NODES",
            {"nodeIds": args.node_ids, "groupId": f"group_{uuid4().hex}"},
            dry_run=context.dry_run,
        )

    def ungroup_element(self, args: NodeArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "UNGROUP_NODES",
            {"groupId": args.node_id},
            dry_run=context.dry_run,
        )

    def add_page(self, args: AddPageArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "ADD_PAGE",
            {
                "page": {
                    "id": f"page_{uuid4().hex}",
                    "name": args.name,
                    "background": {"type": "solid", "color": args.background_color},
                    "children": [],
                }
            },
            dry_run=context.dry_run,
        )

    def delete_page(self, args: PageArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "DELETE_PAGE",
            {"pageId": args.page_id},
            dry_run=context.dry_run,
        )

    def set_page_background(
        self, args: SetPageBackgroundArguments, context: ToolContext
    ) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "SET_BACKGROUND",
            {"pageId": args.page_id, "background": {"type": "solid", "color": args.color}},
            dry_run=context.dry_run,
        )

    def set_style(self, args: SetStyleArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "SET_STYLE",
            {"nodeId": args.node_id, "style": args.style},
            dry_run=context.dry_run,
        )

    def search_templates(
        self, args: SearchTemplatesArguments, _context: ToolContext
    ) -> list[dict[str, Any]]:
        return self.api.search_templates(search=args.search, category=args.category)

    def create_from_template(
        self, args: CreateFromTemplateArguments, context: ToolContext
    ) -> dict[str, Any]:
        if context.dry_run:
            return {"status": "dry_run", "templateId": args.template_id}
        return self.api.create_design_from_template(
            args.template_id, args.variables, title=args.title
        )

    def fill_variables(self, args: FillVariablesArguments, context: ToolContext) -> dict[str, Any]:
        return self.api.execute_command(
            context.project_id,
            "FILL_TEMPLATE_VARIABLES",
            {"values": args.values},
            dry_run=context.dry_run,
        )

    def render_preview(self, _args: BaseModel, context: ToolContext) -> dict[str, Any]:
        return {"status": "ready", "url": f"/render/{context.project_id}"}

    def export_pdf(self, _args: ExportPdfArguments, context: ToolContext) -> dict[str, Any]:
        if context.dry_run:
            return {"status": "dry_run", "format": "pdf", "projectId": context.project_id}
        return self.api.export_pdf(context.project_id)


def create_design_tool_registry(api: CommandApiClient) -> ToolRegistry:
    service = DesignToolService(api)
    registry = ToolRegistry()
    definitions = [
        ToolDefinition(
            "get_current_design_summary",
            "Read a compact scene summary.",
            NoArguments,
            service.summary,
        ),
        ToolDefinition(
            "list_elements",
            "List compact editable element metadata.",
            NoArguments,
            service.elements,
        ),
        ToolDefinition(
            "update_text",
            "Update one text element through a command.",
            UpdateTextArguments,
            service.update_text,
            True,
        ),
        ToolDefinition(
            "add_text",
            "Add a text element through a command.",
            AddTextArguments,
            service.add_text,
            True,
        ),
        ToolDefinition(
            "move_element",
            "Move an element through a command.",
            MoveElementArguments,
            service.move_element,
            True,
        ),
        ToolDefinition(
            "delete_element",
            "Delete one element and its descendants.",
            NodeArguments,
            service.delete_element,
            True,
            requires_confirmation=True,
        ),
        ToolDefinition(
            "rotate_element",
            "Rotate an element through a command.",
            RotateElementArguments,
            service.rotate_element,
            True,
        ),
        ToolDefinition(
            "reorder_element",
            "Reorder an element within its parent.",
            ReorderElementArguments,
            service.reorder_element,
            True,
        ),
        ToolDefinition(
            "group_elements",
            "Group sibling elements.",
            GroupElementsArguments,
            service.group_elements,
            True,
        ),
        ToolDefinition(
            "ungroup_element",
            "Ungroup a group element.",
            NodeArguments,
            service.ungroup_element,
            True,
        ),
        ToolDefinition(
            "add_page",
            "Add an empty design page.",
            AddPageArguments,
            service.add_page,
            True,
        ),
        ToolDefinition(
            "delete_page",
            "Delete a design page.",
            PageArguments,
            service.delete_page,
            True,
            requires_confirmation=True,
        ),
        ToolDefinition(
            "set_page_background",
            "Set a page solid background.",
            SetPageBackgroundArguments,
            service.set_page_background,
            True,
        ),
        ToolDefinition(
            "set_style",
            "Merge an element style through a command.",
            SetStyleArguments,
            service.set_style,
            True,
        ),
        ToolDefinition(
            "search_templates",
            "Search available design templates.",
            SearchTemplatesArguments,
            service.search_templates,
        ),
        ToolDefinition(
            "create_design_from_template",
            "Create a new project from a template.",
            CreateFromTemplateArguments,
            service.create_from_template,
            True,
        ),
        ToolDefinition(
            "fill_template_variables",
            "Fill declared variables through a command.",
            FillVariablesArguments,
            service.fill_variables,
            True,
        ),
        ToolDefinition(
            "render_preview",
            "Get the server-render preview URL.",
            NoArguments,
            service.render_preview,
        ),
        ToolDefinition(
            "export_pdf",
            "Queue a PDF export. Requires explicit confirmation.",
            ExportPdfArguments,
            service.export_pdf,
            requires_confirmation=True,
        ),
    ]
    for definition in definitions:
        registry.register(definition)
    return registry
