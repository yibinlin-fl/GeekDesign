import { describe, expect, it } from "vitest";

import { SHARED_PACKAGE } from "../src/index";

describe("shared", () => {
  it("exposes its package boundary", () => {
    expect(SHARED_PACKAGE).toBe("@geekdesign/shared");
  });
});
