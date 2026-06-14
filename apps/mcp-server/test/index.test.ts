import { describe, expect, it } from "vitest";

import { serviceInfo } from "../src/index";

describe("MCP server boundary", () => {
  it("exposes service metadata", () => {
    expect(serviceInfo.name).toBe("geekdesign-mcp-server");
  });
});
