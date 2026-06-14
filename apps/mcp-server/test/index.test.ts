import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../src/api-client";
import { MemoryAuditLogger } from "../src/audit";
import { promptMap, prompts } from "../src/prompts";
import { ResourceRegistry } from "../src/resources";
import { createToolRegistry } from "../src/tools";

const createApi = (): ApiClient => ({
  createProject: vi.fn(async () => ({ id: "project_new" })),
  getProject: vi.fn(async (id) => ({ id, title: "Owned design" })),
  getSummary: vi.fn(async (id) => ({
    documentId: id,
    canvas: { width: 1080, height: 1080 },
    pages: [{ id: "page_1" }],
  })),
  listElements: vi.fn(async () => [
    {
      id: "text_1",
      type: "text",
      transform: { x: 0, y: 0, width: 100, height: 40 },
    },
  ]),
  executeCommand: vi.fn(async (_projectId, type) => ({
    status: "applied",
    type,
  })),
  searchTemplates: vi.fn(async () => [{ id: "template_1" }]),
  getTemplate: vi.fn(async (id) => ({ id })),
  listTemplateCategories: vi.fn(async () => [{ id: "category_1" }]),
  createFromTemplate: vi.fn(async () => ({ id: "project_template" })),
  listAssets: vi.fn(async () => [{ id: "asset_1" }]),
  exportDesign: vi.fn(async (_projectId, format) => ({
    status: "queued",
    format,
  })),
});

describe("MCP tools", () => {
  it("lists every required tool", () => {
    const tools = createToolRegistry(createApi(), {}, new MemoryAuditLogger());

    expect([...tools.keys()]).toEqual([
      "create_design",
      "open_design",
      "search_templates",
      "create_design_from_template",
      "get_current_design_summary",
      "list_elements",
      "update_text",
      "add_text",
      "add_image",
      "replace_image",
      "move_element",
      "resize_element",
      "set_style",
      "align_element",
      "apply_palette",
      "render_preview",
      "export_png",
      "export_pdf",
    ]);
  });

  it("validates update_text and calls the Command API", async () => {
    const api = createApi();
    const audit = new MemoryAuditLogger();
    const tools = createToolRegistry(
      api,
      { currentProjectId: "project_1" },
      audit,
    );

    await expect(
      tools.get("update_text")!.handler({
        node_id: "text_1",
        content: "Updated by MCP",
      }),
    ).resolves.toMatchObject({ status: "applied" });
    expect(api.executeCommand).toHaveBeenCalledWith(
      "project_1",
      "UPDATE_TEXT",
      {
        nodeId: "text_1",
        content: "Updated by MCP",
      },
    );
    expect(audit.entries[0]).toMatchObject({
      tool: "update_text",
      status: "success",
    });
  });

  it("rejects arbitrary URL arguments and audits the failure", async () => {
    const audit = new MemoryAuditLogger();
    const tools = createToolRegistry(
      createApi(),
      { currentProjectId: "project_1" },
      audit,
    );

    await expect(
      tools.get("add_image")!.handler({
        asset_id: "asset_1",
        url: "https://untrusted.example/image.png",
      }),
    ).rejects.toThrow();
    expect(audit.entries[0]).toMatchObject({
      tool: "add_image",
      status: "error",
    });
  });

  it("requires confirmation before export", async () => {
    const api = createApi();
    const tools = createToolRegistry(
      api,
      { currentProjectId: "project_1" },
      new MemoryAuditLogger(),
    );

    await expect(tools.get("export_pdf")!.handler({})).resolves.toMatchObject({
      status: "confirmation_required",
    });
    expect(api.exportDesign).not.toHaveBeenCalled();
  });
});

describe("MCP resources", () => {
  it("reads current elements and template resources from the API", async () => {
    const api = createApi();
    const resources = new ResourceRegistry(api, {
      currentProjectId: "project_1",
    });

    await expect(
      resources.read("design://current/elements"),
    ).resolves.toMatchObject([{ id: "text_1" }]);
    await expect(resources.read("template://template_1")).resolves.toEqual({
      id: "template_1",
    });
  });

  it("rejects unsupported URI schemes", async () => {
    const resources = new ResourceRegistry(createApi(), {
      currentProjectId: "project_1",
    });

    await expect(resources.read("file:///etc/passwd")).rejects.toThrow(
      "Unsupported resource URI",
    );
  });
});

describe("MCP prompts", () => {
  it("returns all required prompts with command safety instructions", () => {
    expect(prompts).toHaveLength(5);
    const rendered = promptMap.get("revise_design_by_feedback")!.render({
      feedback: "Make the title clearer",
    });

    expect(rendered).toContain("Make the title clearer");
    expect(rendered).toContain("Never write a complete");
  });
});
