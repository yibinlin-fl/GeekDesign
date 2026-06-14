import { describe, expect, it } from "vitest";
import { z } from "zod";

import invitation from "../examples/invitation.design.json";
import resume from "../examples/resume.design.json";
import {
  DESIGN_SCHEMA_VERSION,
  createEmptyDocument,
  createEllipseNode,
  createFrameNode,
  createGroupNode,
  createImageNode,
  createLineNode,
  createRectNode,
  createSvgNode,
  createTextNode,
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
    ];

    expect(nodes.map((node) => node.type)).toEqual([
      "image",
      "rect",
      "ellipse",
      "line",
      "svg",
      "group",
      "frame",
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
});
