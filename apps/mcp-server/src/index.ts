export { HttpApiClient, type ApiClient } from "./api-client";
export { MemoryAuditLogger, StderrAuditLogger } from "./audit";
export { promptMap, prompts } from "./prompts";
export { ResourceRegistry, resourceUris } from "./resources";
export { createMcpServer, serviceInfo, startStdioServer } from "./server";
export { createToolRegistry } from "./tools";

import { startStdioServer } from "./server";

const isMain = process.argv[1]?.endsWith("src/index.ts") ?? false;
if (isMain) {
  startStdioServer().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
