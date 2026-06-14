import { describe, expect, it } from "vitest";

import { EDITOR_CORE_PACKAGE } from "../src/index";

describe("editor-core", () => {
  it("exposes its package boundary", () => {
    expect(EDITOR_CORE_PACKAGE).toBe("@geekdesign/editor-core");
  });
});
