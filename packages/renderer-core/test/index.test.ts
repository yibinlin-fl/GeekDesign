import { describe, expect, it } from "vitest";

import { RENDERER_CORE_PACKAGE } from "../src/index";

describe("renderer-core", () => {
  it("exposes its package boundary", () => {
    expect(RENDERER_CORE_PACKAGE).toBe("@geekdesign/renderer-core");
  });
});
