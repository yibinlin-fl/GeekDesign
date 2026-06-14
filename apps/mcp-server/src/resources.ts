import type { ApiClient } from "./api-client";
import type { McpContext } from "./types";

export const resourceUris = [
  "design://current/scene",
  "design://current/elements",
  "design://current/thumbnail",
  "template://categories",
  "template://{template_id}",
  "asset://user/uploads",
] as const;

const currentProject = (context: McpContext): string => {
  if (!context.currentProjectId) {
    throw new Error(
      "No current design. Call open_design or create_design first.",
    );
  }
  return context.currentProjectId;
};

export class ResourceRegistry {
  constructor(
    private readonly api: ApiClient,
    private readonly context: McpContext,
  ) {}

  list(): readonly string[] {
    return resourceUris;
  }

  async read(uri: string): Promise<unknown> {
    if (uri === "design://current/scene") {
      return this.api.getSummary(currentProject(this.context));
    }
    if (uri === "design://current/elements") {
      return this.api.listElements(currentProject(this.context));
    }
    if (uri === "design://current/thumbnail") {
      return { url: `/render/${currentProject(this.context)}` };
    }
    if (uri === "template://categories") {
      return this.api.listTemplateCategories();
    }
    if (uri === "asset://user/uploads") {
      return this.api.listAssets();
    }
    const templateMatch = /^template:\/\/([a-zA-Z0-9_-]+)$/.exec(uri);
    if (templateMatch?.[1]) {
      return this.api.getTemplate(templateMatch[1]);
    }
    throw new Error(`Unsupported resource URI: ${uri}`);
  }
}
