import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { ApiClient } from "./api-client";
import {
  colorSchema,
  confirmationSchema,
  idSchema,
  nodeSchema,
  projectSchema,
  styleSchema,
} from "./schemas";
import type { AuditLogger, McpContext, ToolDefinition } from "./types";

const roleSchema = z.enum([
  "background",
  "title",
  "subtitle",
  "body",
  "logo",
  "qr_code",
  "avatar",
  "date",
  "location",
  "button",
  "decoration",
  "section_title",
  "experience",
  "education",
  "skill",
]);
const optionalProject = z.object({ project_id: idSchema.optional() }).strict();
const positionSchema = nodeSchema
  .extend({ x: z.number().finite(), y: z.number().finite() })
  .strict();
const sizeSchema = nodeSchema
  .extend({ width: z.number().positive(), height: z.number().positive() })
  .strict();

const uid = (prefix: string) => `${prefix}_${randomUUID().replaceAll("-", "")}`;
const baseStyle = { opacity: 1, visible: true, locked: false };
const transform = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

function currentProject(context: McpContext, explicit?: string): string {
  const id = explicit ?? context.currentProjectId;
  if (!id)
    throw new Error(
      "No current design. Call open_design or create_design first.",
    );
  return id;
}

async function defaultParent(
  api: ApiClient,
  projectId: string,
): Promise<string> {
  const summary = await api.getSummary(projectId);
  const pages = z
    .array(z.object({ id: z.string() }).passthrough())
    .parse(summary.pages);
  return pages[0]!.id;
}

function emptyDocument(title: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    schemaVersion: "0.1.0",
    documentId: uid("design"),
    title,
    createdAt: now,
    updatedAt: now,
    canvas: { width: 1080, height: 1080, unit: "px", dpi: 96 },
    pages: [
      {
        id: "page_1",
        name: "Page 1",
        background: { type: "solid", color: "#ffffff" },
        children: [],
      },
    ],
    nodes: {},
    assets: {},
    fonts: {},
    variables: {},
    metadata: {},
  };
}

function rawDefinitions(api: ApiClient, context: McpContext): ToolDefinition[] {
  return [
    {
      name: "create_design",
      description: "Create and open an empty GeekDesign project.",
      schema: z.object({ title: z.string().min(1).max(255) }).strict(),
      handler: async (raw) => {
        const { title } = z.object({ title: z.string() }).parse(raw);
        const result = await api.createProject(title, emptyDocument(title));
        context.currentProjectId = z.string().parse(result.id);
        return result;
      },
    },
    {
      name: "open_design",
      description: "Open an owned project as the current design.",
      schema: projectSchema,
      handler: async (raw) => {
        const { project_id } = projectSchema.parse(raw);
        const result = await api.getProject(project_id);
        context.currentProjectId = project_id;
        return { id: result.id, title: result.title };
      },
    },
    {
      name: "search_templates",
      description: "Search templates by text or category.",
      schema: z
        .object({
          search: z.string().min(1).max(100).optional(),
          category: z.string().min(1).max(100).optional(),
        })
        .strict(),
      handler: (raw) => {
        const args = z
          .object({
            search: z.string().optional(),
            category: z.string().optional(),
          })
          .parse(raw);
        return api.searchTemplates(args.search, args.category);
      },
    },
    {
      name: "create_design_from_template",
      description: "Create and open a project from a template.",
      schema: z
        .object({
          template_id: idSchema,
          variables: z.record(z.unknown()).default({}),
          title: z.string().min(1).max(255).optional(),
        })
        .strict(),
      handler: async (raw) => {
        const args = z
          .object({
            template_id: z.string(),
            variables: z.record(z.unknown()),
            title: z.string().optional(),
          })
          .parse(raw);
        const result = await api.createFromTemplate(
          args.template_id,
          args.variables,
          args.title,
        );
        context.currentProjectId = z.string().parse(result.id);
        return result;
      },
    },
    {
      name: "get_current_design_summary",
      description: "Read the compact current scene summary.",
      schema: optionalProject,
      handler: (raw) => {
        const args = optionalProject.parse(raw);
        return api.getSummary(currentProject(context, args.project_id));
      },
    },
    {
      name: "list_elements",
      description: "List compact current design elements.",
      schema: optionalProject,
      handler: (raw) => {
        const args = optionalProject.parse(raw);
        return api.listElements(currentProject(context, args.project_id));
      },
    },
    {
      name: "update_text",
      description: "Update text through the backend Command API.",
      schema: nodeSchema.extend({ content: z.string() }).strict(),
      handler: (raw) => {
        const args = nodeSchema.extend({ content: z.string() }).parse(raw);
        return api.executeCommand(
          currentProject(context, args.project_id),
          "UPDATE_TEXT",
          {
            nodeId: args.node_id,
            content: args.content,
          },
        );
      },
    },
    {
      name: "add_text",
      description: "Add a text element through the backend Command API.",
      schema: z
        .object({
          project_id: idSchema.optional(),
          parent_id: idSchema.optional(),
          content: z.string(),
          x: z.number().finite().default(100),
          y: z.number().finite().default(100),
          width: z.number().positive().default(400),
          height: z.number().positive().default(80),
          font_size: z.number().positive().default(32),
          role: roleSchema.optional(),
        })
        .strict(),
      handler: async (raw) => {
        const args = z
          .object({
            project_id: z.string().optional(),
            parent_id: z.string().optional(),
            content: z.string(),
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
            font_size: z.number(),
            role: z.string().optional(),
          })
          .parse(raw);
        const projectId = currentProject(context, args.project_id);
        const parentId =
          args.parent_id ?? (await defaultParent(api, projectId));
        const id = uid("text");
        return api.executeCommand(projectId, "CREATE_NODE", {
          parentId,
          node: {
            id,
            type: "text",
            parentId,
            ...(args.role ? { role: args.role } : {}),
            transform: transform(args.x, args.y, args.width, args.height),
            style: baseStyle,
            text: {
              content: args.content,
              fontFamily: "Arial",
              fontSize: args.font_size,
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: 0,
              textAlign: "left",
            },
          },
        });
      },
    },
    ...imageAndTransformTools(api, context),
    ...styleAndOutputTools(api, context),
  ];
}

function imageAndTransformTools(
  api: ApiClient,
  context: McpContext,
): ToolDefinition[] {
  const imageSchema = z
    .object({
      project_id: idSchema.optional(),
      parent_id: idSchema.optional(),
      asset_id: idSchema,
      x: z.number().finite().default(100),
      y: z.number().finite().default(100),
      width: z.number().positive().default(400),
      height: z.number().positive().default(300),
      fit: z.enum(["cover", "contain", "stretch"]).default("cover"),
    })
    .strict();
  return [
    {
      name: "add_image",
      description:
        "Add an uploaded image asset. Arbitrary URLs are not accepted.",
      schema: imageSchema,
      handler: async (raw) => {
        const args = imageSchema.parse(raw);
        const projectId = currentProject(context, args.project_id);
        const parentId =
          args.parent_id ?? (await defaultParent(api, projectId));
        const id = uid("image");
        return api.executeCommand(projectId, "CREATE_NODE", {
          parentId,
          node: {
            id,
            type: "image",
            parentId,
            transform: transform(args.x, args.y, args.width, args.height),
            style: baseStyle,
            image: { assetId: args.asset_id, fit: args.fit },
          },
        });
      },
    },
    {
      name: "replace_image",
      description: "Replace an image node using an uploaded asset id.",
      schema: nodeSchema
        .extend({
          asset_id: idSchema,
          fit: z.enum(["cover", "contain", "stretch"]).default("cover"),
        })
        .strict(),
      handler: (raw) => {
        const args = nodeSchema
          .extend({
            asset_id: z.string(),
            fit: z.enum(["cover", "contain", "stretch"]),
          })
          .parse(raw);
        return api.executeCommand(
          currentProject(context, args.project_id),
          "UPDATE_NODE",
          {
            nodeId: args.node_id,
            patch: { image: { assetId: args.asset_id, fit: args.fit } },
          },
        );
      },
    },
    {
      name: "move_element",
      description: "Move an element through the backend Command API.",
      schema: positionSchema,
      handler: (raw) => {
        const args = positionSchema.parse(raw);
        return api.executeCommand(
          currentProject(context, args.project_id),
          "UPDATE_NODE",
          {
            nodeId: args.node_id,
            patch: { transform: { x: args.x, y: args.y } },
          },
        );
      },
    },
    {
      name: "resize_element",
      description: "Resize an element through the backend Command API.",
      schema: sizeSchema,
      handler: (raw) => {
        const args = sizeSchema.parse(raw);
        return api.executeCommand(
          currentProject(context, args.project_id),
          "UPDATE_NODE",
          {
            nodeId: args.node_id,
            patch: { transform: { width: args.width, height: args.height } },
          },
        );
      },
    },
  ];
}

function styleAndOutputTools(
  api: ApiClient,
  context: McpContext,
): ToolDefinition[] {
  const alignSchema = nodeSchema
    .extend({
      alignment: z.enum(["left", "center", "right", "top", "middle", "bottom"]),
    })
    .strict();
  return [
    {
      name: "set_style",
      description: "Set validated element style fields.",
      schema: nodeSchema.extend({ style: styleSchema }).strict(),
      handler: (raw) => {
        const args = nodeSchema.extend({ style: styleSchema }).parse(raw);
        return api.executeCommand(
          currentProject(context, args.project_id),
          "SET_STYLE",
          {
            nodeId: args.node_id,
            style: args.style,
          },
        );
      },
    },
    {
      name: "align_element",
      description: "Align an element to the design canvas.",
      schema: alignSchema,
      handler: async (raw) => {
        const args = alignSchema.parse(raw);
        const projectId = currentProject(context, args.project_id);
        const [summary, elements] = await Promise.all([
          api.getSummary(projectId),
          api.listElements(projectId),
        ]);
        const element = elements.find((item) => item.id === args.node_id);
        if (!element) throw new Error("Element not found");
        const canvas = summary.canvas as { width: number; height: number };
        const value = element.transform as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        const patch: Record<string, number> = {};
        if (args.alignment === "left") patch.x = 0;
        if (args.alignment === "center")
          patch.x = (canvas.width - value.width) / 2;
        if (args.alignment === "right") patch.x = canvas.width - value.width;
        if (args.alignment === "top") patch.y = 0;
        if (args.alignment === "middle")
          patch.y = (canvas.height - value.height) / 2;
        if (args.alignment === "bottom") patch.y = canvas.height - value.height;
        return api.executeCommand(projectId, "UPDATE_NODE", {
          nodeId: args.node_id,
          patch: { transform: patch },
        });
      },
    },
    {
      name: "apply_palette",
      description: "Apply solid colors to selected elements.",
      schema: z
        .object({
          project_id: idSchema.optional(),
          assignments: z
            .array(z.object({ node_id: idSchema, color: colorSchema }).strict())
            .min(1)
            .max(20),
        })
        .strict(),
      handler: async (raw) => {
        const args = z
          .object({
            project_id: z.string().optional(),
            assignments: z.array(
              z.object({ node_id: z.string(), color: z.string() }),
            ),
          })
          .parse(raw);
        const projectId = currentProject(context, args.project_id);
        return Promise.all(
          args.assignments.map(({ node_id, color }) =>
            api.executeCommand(projectId, "SET_STYLE", {
              nodeId: node_id,
              style: { fill: { type: "solid", color } },
            }),
          ),
        );
      },
    },
    {
      name: "render_preview",
      description: "Return the trusted server-render route for a project.",
      schema: optionalProject,
      handler: async (raw) => {
        const args = optionalProject.parse(raw);
        return { url: `/render/${currentProject(context, args.project_id)}` };
      },
    },
    ...(["png", "pdf"] as const).map(
      (format): ToolDefinition => ({
        name: `export_${format}`,
        description: `Queue a ${format.toUpperCase()} export after explicit confirmation.`,
        schema: z
          .object({
            project_id: idSchema.optional(),
            confirmed: confirmationSchema,
          })
          .strict(),
        confirmationRequired: true,
        handler: async (raw) => {
          const args = z
            .object({ project_id: z.string().optional() })
            .passthrough()
            .parse(raw);
          return api.exportDesign(
            currentProject(context, args.project_id),
            format,
          );
        },
      }),
    ),
  ];
}

export function createToolRegistry(
  api: ApiClient,
  context: McpContext,
  audit: AuditLogger,
): Map<string, ToolDefinition> {
  return new Map(
    rawDefinitions(api, context).map((definition) => [
      definition.name,
      {
        ...definition,
        handler: async (raw: unknown) => {
          let status: "success" | "error" | "confirmation_required" = "success";
          let args: unknown = raw;
          try {
            args = definition.schema.parse(raw);
            if (
              definition.confirmationRequired &&
              !(args as { confirmed?: boolean }).confirmed
            ) {
              status = "confirmation_required";
              return { status, tool: definition.name };
            }
            return await definition.handler(args);
          } catch (error) {
            status = "error";
            throw error;
          } finally {
            await audit.write({
              id: uid("audit"),
              tool: definition.name,
              arguments: args,
              status,
              timestamp: new Date().toISOString(),
              ...(context.currentProjectId
                ? { projectId: context.currentProjectId }
                : {}),
            });
          }
        },
      },
    ]),
  );
}
