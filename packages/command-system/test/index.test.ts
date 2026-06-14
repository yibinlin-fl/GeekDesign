import { describe, expect, it } from "vitest";

import { COMMAND_SYSTEM_PACKAGE } from "../src/index";

describe("command-system", () => {
  it("exposes its package boundary", () => {
    expect(COMMAND_SYSTEM_PACKAGE).toBe("@geekdesign/command-system");
  });
});
