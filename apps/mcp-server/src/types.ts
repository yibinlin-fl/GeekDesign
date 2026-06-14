import type { z } from "zod";

export interface McpContext {
  currentProjectId?: string;
}

export interface AuditEntry {
  id: string;
  tool: string;
  arguments: unknown;
  status: "success" | "error" | "confirmation_required";
  timestamp: string;
  projectId?: string;
}

export interface AuditLogger {
  write(entry: AuditEntry): void | Promise<void>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  confirmationRequired?: boolean;
  handler: (args: unknown) => Promise<unknown>;
}

export interface PromptDefinition {
  name: string;
  description: string;
  render: (args: Record<string, string>) => string;
}
