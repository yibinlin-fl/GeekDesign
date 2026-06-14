import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { HttpApiClient, type ApiClient } from "./api-client";
import { StderrAuditLogger } from "./audit";
import { promptMap, prompts } from "./prompts";
import { ResourceRegistry } from "./resources";
import { createToolRegistry } from "./tools";
import type { AuditLogger, McpContext } from "./types";

export const serviceInfo = {
  name: "geekdesign-mcp-server",
  version: "0.1.0",
} as const;

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const resourceResult = (uri: URL, value: unknown) => ({
  contents: [
    {
      uri: uri.toString(),
      mimeType: "application/json",
      text: JSON.stringify(value, null, 2),
    },
  ],
});

export interface GeekDesignMcp {
  server: McpServer;
  context: McpContext;
  tools: ReturnType<typeof createToolRegistry>;
  resources: ResourceRegistry;
  audit: AuditLogger;
}

export function createMcpServer(
  options: {
    api?: ApiClient;
    audit?: AuditLogger;
    context?: McpContext;
  } = {},
): GeekDesignMcp {
  const api = options.api ?? new HttpApiClient(process.env.GEEKDESIGN_API_URL);
  const audit = options.audit ?? new StderrAuditLogger();
  const context = options.context ?? {};
  const tools = createToolRegistry(api, context, audit);
  const resources = new ResourceRegistry(api, context);
  const server = new McpServer(serviceInfo);

  for (const tool of tools.values()) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.schema },
      async (args) => {
        try {
          return textResult(await tool.handler(args));
        } catch (error) {
          return {
            ...textResult({
              error: error instanceof Error ? error.message : String(error),
            }),
            isError: true,
          };
        }
      },
    );
  }

  for (const uri of resources.list()) {
    if (uri === "template://{template_id}") continue;
    server.registerResource(
      uri,
      uri,
      { mimeType: "application/json" },
      async (resourceUri) =>
        resourceResult(
          resourceUri,
          await resources.read(resourceUri.toString()),
        ),
    );
  }
  server.registerResource(
    "template",
    new ResourceTemplate("template://{template_id}", { list: undefined }),
    { mimeType: "application/json" },
    async (uri) => resourceResult(uri, await resources.read(uri.toString())),
  );

  for (const item of prompts) {
    server.registerPrompt(
      item.name,
      {
        description: item.description,
        argsSchema: { input: z.string().optional() },
      },
      ({ input }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptMap.get(item.name)!.render({ input: input ?? "" }),
            },
          },
        ],
      }),
    );
  }
  return { server, context, tools, resources, audit };
}

export async function startStdioServer(): Promise<void> {
  const { server } = createMcpServer();
  await server.connect(new StdioServerTransport());
}
