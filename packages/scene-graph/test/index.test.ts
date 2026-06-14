import { describe, expect, it } from "vitest";

import { SCENE_GRAPH_PACKAGE } from "../src/index";

describe("scene-graph", () => {
  it("exposes its package boundary", () => {
    expect(SCENE_GRAPH_PACKAGE).toBe("@geekdesign/scene-graph");
  });
});
