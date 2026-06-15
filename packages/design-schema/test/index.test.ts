import { describe, expect, it } from "vitest";
import { z } from "zod";

import invitation from "../examples/invitation.design.json";
import resume from "../examples/resume.design.json";
import {
  DESIGN_SCHEMA_VERSION,
  createEmptyDocument,
  createChartNode,
  createEllipseNode,
  createFrameNode,
  createGroupNode,
  createImageNode,
  createLineNode,
  createRectNode,
  createSvgNode,
  createTextNode,
  createTableNode,
  designDocumentJsonSchema,
  migrate010To010,
  nodeRoleSchema,
  paintSchema,
  validateDesignDocument,
} from "../src";

describe("design-schema", () => {
  it("creates an empty valid document", () => {
    const document = createEmptyDocument({
      documentId: "design_empty",
      pageId: "page_1",
      now: "2026-06-14T00:00:00.000Z",
    });

    expect(document.schemaVersion).toBe(DESIGN_SCHEMA_VERSION);
    expect(document.pages).toHaveLength(1);
    expect(document.nodes).toEqual({});
    expect(validateDesignDocument(document)).toEqual(document);
  });

  it("creates a text node with safe defaults", () => {
    const node = createTextNode({
      id: "node_title",
      parentId: "page_1",
      content: "GeekDesign",
      role: "title",
    });

    expect(node.type).toBe("text");
    expect(node.text.content).toBe("GeekDesign");
    expect(node.role).toBe("title");
    expect(node.style.visible).toBe(true);
  });

  it("creates every initial node type through factories", () => {
    const parentId = "page_1";
    const nodes = [
      createImageNode({ parentId, assetId: "asset_1" }),
      createRectNode({ parentId }),
      createEllipseNode({ parentId }),
      createLineNode({ parentId }),
      createSvgNode({ parentId, assetId: "asset_1" }),
      createGroupNode({ parentId }),
      createFrameNode({ parentId }),
      createTableNode({ parentId }),
      createChartNode({ parentId }),
    ];

    expect(nodes.map((node) => node.type)).toEqual([
      "image",
      "rect",
      "ellipse",
      "line",
      "svg",
      "group",
      "frame",
      "table",
      "chart",
    ]);
  });

  it("validates a legal document", () => {
    const document = createEmptyDocument({
      documentId: "design_valid",
      pageId: "page_1",
      now: "2026-06-14T00:00:00.000Z",
    });
    const title = createTextNode({
      id: "node_title",
      parentId: "page_1",
      content: "Valid",
      role: "title",
    });
    document.nodes[title.id] = title;
    document.pages[0]?.children.push(title.id);

    expect(validateDesignDocument(document)).toEqual(document);
  });

  it("rejects an invalid document with useful issues", () => {
    const document = createEmptyDocument({
      documentId: "design_invalid",
      pageId: "page_1",
      now: "2026-06-14T00:00:00.000Z",
    });
    document.nodes.node_orphan = createTextNode({
      id: "different_id",
      parentId: "missing_parent",
    });

    expect(() => validateDesignDocument(document)).toThrow(z.ZodError);
  });

  it("validates all Paint variants and rejects malformed gradients", () => {
    const paints = [
      { type: "solid", color: "#ffffff" },
      {
        type: "linear-gradient",
        angle: 45,
        stops: [
          { offset: 0, color: "#000000" },
          { offset: 1, color: "#ffffff" },
        ],
      },
      {
        type: "radial-gradient",
        stops: [
          { offset: 0, color: "#000000" },
          { offset: 1, color: "#ffffff" },
        ],
      },
      { type: "image", assetId: "asset_1", fit: "cover" },
    ];

    paints.forEach((paint) =>
      expect(paintSchema.safeParse(paint).success).toBe(true),
    );
    expect(
      paintSchema.safeParse({
        type: "linear-gradient",
        angle: 0,
        stops: [{ offset: 2, color: "#fff" }],
      }).success,
    ).toBe(false);
  });

  it("accepts semantic NodeRole values", () => {
    ["title", "body", "logo", "qr_code", "date", "location"].forEach((role) => {
      expect(nodeRoleSchema.safeParse(role).success).toBe(true);
    });
    expect(nodeRoleSchema.safeParse("random-role").success).toBe(false);
  });

  it("validates checked-in example documents", () => {
    expect(validateDesignDocument(invitation).documentId).toBe(
      "invitation_001",
    );
    expect(validateDesignDocument(resume).documentId).toBe("resume_001");
  });

  it("performs the 0.1.0 no-op migration", () => {
    const migrated = migrate010To010(invitation);
    expect(migrated).toEqual(invitation);
  });

  it("exports a named JSON Schema", () => {
    expect(designDocumentJsonSchema).toHaveProperty(
      "definitions.DesignDocument",
    );
  });

  it("validates crop, rich text, notes, transitions, themes, and layouts", () => {
    const document = createEmptyDocument({
      documentId: "design_advanced",
      pageId: "page_1",
      now: "2026-06-14T00:00:00.000Z",
    });
    const text = createTextNode({
      id: "text_1",
      parentId: "page_1",
      content: "Hello",
    });
    text.text.runs = [{ start: 0, end: 5, fontWeight: 700 }];
    text.text.paragraphs = [
      { start: 0, end: 5, bullet: { type: "unordered", level: 0 } },
    ];
    const image = createImageNode({
      id: "image_1",
      parentId: "page_1",
      assetId: "asset_1",
      crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    });
    document.nodes = { text_1: text, image_1: image };
    document.assets.asset_1 = {
      id: "asset_1",
      type: "image",
      uri: "/asset.png",
      mimeType: "image/png",
    };
    document.pages[0]!.children = ["text_1", "image_1"];
    document.pages[0]!.notes = "Private presenter note";
    document.pages[0]!.transition = { type: "fade", durationMs: 500 };
    document.themes = {
      default: {
        id: "default",
        name: "Default",
        colors: { primary: "#7c3aed" },
        fonts: { heading: "Arial", body: "Arial" },
      },
    };
    document.layouts = {
      title: {
        id: "title",
        name: "Title slide",
        themeId: "default",
        placeholders: [
          {
            role: "title",
            transform: {
              x: 100,
              y: 100,
              width: 800,
              height: 100,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
          },
        ],
      },
    };
    document.activeThemeId = "default";

    expect(validateDesignDocument(document)).toEqual(document);
  });
});
