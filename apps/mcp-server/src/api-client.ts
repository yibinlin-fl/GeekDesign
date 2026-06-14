import { randomUUID } from "node:crypto";

export class ApiError extends Error {}

export interface ApiClient {
  createProject(
    title: string,
    document: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  getProject(projectId: string): Promise<Record<string, unknown>>;
  getSummary(projectId: string): Promise<Record<string, unknown>>;
  listElements(projectId: string): Promise<Record<string, unknown>[]>;
  executeCommand(
    projectId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  searchTemplates(
    search?: string,
    category?: string,
  ): Promise<Record<string, unknown>[]>;
  getTemplate(templateId: string): Promise<Record<string, unknown>>;
  listTemplateCategories(): Promise<Record<string, unknown>[]>;
  createFromTemplate(
    templateId: string,
    variables: Record<string, unknown>,
    title?: string,
  ): Promise<Record<string, unknown>>;
  listAssets(): Promise<Record<string, unknown>[]>;
  exportDesign(
    projectId: string,
    format: "png" | "pdf",
  ): Promise<Record<string, unknown>>;
}

export class HttpApiClient implements ApiClient {
  constructor(
    private readonly baseUrl = "http://127.0.0.1:8000/api",
    private readonly request: typeof fetch = fetch,
    private readonly accessToken = process.env.GEEKDESIGN_API_TOKEN,
  ) {}

  private async call(path: string, init?: RequestInit): Promise<unknown> {
    const response = await this.request(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.accessToken
          ? { authorization: `Bearer ${this.accessToken}` }
          : {}),
        ...init?.headers,
      },
    });
    const body = (await response.json()) as {
      success?: boolean;
      data?: unknown;
      message?: string;
    };
    if (!response.ok || !body.success) {
      throw new ApiError(
        body.message ?? `API request failed with ${response.status}`,
      );
    }
    return body.data;
  }

  createProject(title: string, document: Record<string, unknown>) {
    return this.call("/projects", {
      method: "POST",
      body: JSON.stringify({ title, document_json: document }),
    }) as Promise<Record<string, unknown>>;
  }

  getProject(projectId: string) {
    return this.call(`/projects/${encodeURIComponent(projectId)}`) as Promise<
      Record<string, unknown>
    >;
  }

  getSummary(projectId: string) {
    return this.call(
      `/projects/${encodeURIComponent(projectId)}/summary`,
    ) as Promise<Record<string, unknown>>;
  }

  listElements(projectId: string) {
    return this.call(
      `/projects/${encodeURIComponent(projectId)}/elements`,
    ) as Promise<Record<string, unknown>[]>;
  }

  executeCommand(
    projectId: string,
    type: string,
    payload: Record<string, unknown>,
  ) {
    return this.call(`/projects/${encodeURIComponent(projectId)}/commands`, {
      method: "POST",
      body: JSON.stringify({
        id: `mcp_command_${randomUUID().replaceAll("-", "")}`,
        type,
        source: "ai",
        payload,
      }),
    }) as Promise<Record<string, unknown>>;
  }

  searchTemplates(search?: string, category?: string) {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (category) query.set("category", category);
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return this.call(`/templates${suffix}`) as Promise<
      Record<string, unknown>[]
    >;
  }

  getTemplate(templateId: string) {
    return this.call(`/templates/${encodeURIComponent(templateId)}`) as Promise<
      Record<string, unknown>
    >;
  }

  listTemplateCategories() {
    return this.call("/template-categories") as Promise<
      Record<string, unknown>[]
    >;
  }

  createFromTemplate(
    templateId: string,
    variables: Record<string, unknown>,
    title?: string,
  ) {
    return this.call(
      `/templates/${encodeURIComponent(templateId)}/create-project`,
      {
        method: "POST",
        body: JSON.stringify({ variables, title }),
      },
    ) as Promise<Record<string, unknown>>;
  }

  listAssets() {
    return this.call("/assets") as Promise<Record<string, unknown>[]>;
  }

  exportDesign(projectId: string, format: "png" | "pdf") {
    return this.call(`/exports/${format}`, {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, scale: 1 }),
    }) as Promise<Record<string, unknown>>;
  }
}
