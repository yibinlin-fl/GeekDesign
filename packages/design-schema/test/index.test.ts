import { describe, expect, it } from "vitest";

import { DESIGN_SCHEMA_VERSION } from "../src/index";

describe("design-schema", () => {
  it("declares the initial schema version", () => {
    expect(DESIGN_SCHEMA_VERSION).toBe("0.1.0");
  });
});
