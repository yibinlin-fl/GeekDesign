import {
  createEmptyDocument,
  createGroupNode,
  createRectNode,
  createTextNode,
  validateDesignDocument,
  type DesignDocument,
} from "@geekdesign/design-schema";
import { beforeEach, describe, expect, it } from "vitest";

import { SceneGraph, SceneGraphError, deserialize, fromDocument } from "../src";

const buildDocument = (): DesignDocument => {
  const document = createEmptyDocument({
    documentId: "scene_test",
    pageId: "page_1",
    now: "2026-06-14T00:00:00.000Z",
  });
  const background = createRectNode({
    id: "background",
    parentId: "page_1",
    role: "background",
    transform: { x: 0, y: 0, width: 500, height: 500 },
  });
  const title = createTextNode({
    id: "title",
    parentId: "page_1",
    role: "title",
    content: "GeekDesign Scene Graph",
    transform: { x: 20, y: 20, width: 300, height: 80 },
  });
  document.nodes = { background, title };
  document.pages[0]!.children = ["background", "title"];
  return document;
};

describe("SceneGraph", () => {
  let graph: SceneGraph;

  beforeEach(() => {
    graph = fromDocument(buildDocument());
  });

  it("creates a controlled graph without modifying the input document", () => {
    const document = buildDocument();
    const controlled = SceneGraph.fromDocument(document);

    controlled.updateNode("title", { transform: { x: 100 } });

    expect(document.nodes.title?.transform.x).toBe(20);
    expect(controlled.getNode("title")?.transform.x).toBe(100);
    expect(controlled.hasNode("background")).toBe(true);
    expect(controlled.getPage("page_1")?.name).toBe("Page 1");
  });

  it("adds a node at a controlled stacking index", () => {
    const subtitle = createTextNode({
      id: "subtitle",
      parentId: "ignored_parent",
      role: "subtitle",
      content: "A subtitle",
    });

    graph.addNode("page_1", subtitle, 1);

    expect(graph.getChildren("page_1").map((node) => node.id)).toEqual([
      "background",
      "subtitle",
      "title",
    ]);
    expect(graph.getParent("subtitle").id).toBe("page_1");
  });

  it("recursively removes a container and its descendants", () => {
    const group = createGroupNode({ id: "group", parentId: "page_1" });
    const child = createRectNode({ id: "child", parentId: "group" });
    graph.addNode("page_1", group);
    graph.addNode("group", child);

    graph.removeNode("group");

    expect(graph.hasNode("group")).toBe(false);
    expect(graph.hasNode("child")).toBe(false);
    expect(graph.getChildren("page_1").map((node) => node.id)).not.toContain(
      "group",
    );
  });

  it("updates node data while protecting structural fields", () => {
    graph.updateNode("title", {
      transform: { x: 80, width: 420 },
      style: { opacity: 0.5 },
      text: { content: "Updated title" },
    });

    const title = graph.getNode("title");
    expect(title?.transform.x).toBe(80);
    expect(title?.transform.y).toBe(20);
    expect(title?.style.opacity).toBe(0.5);
    expect(title?.type === "text" && title.text.content).toBe("Updated title");
    expect(() => graph.updateNode("title", { parentId: "page_2" })).toThrow(
      SceneGraphError,
    );
  });

  it("moves a node into a group and reports ancestors and descendants", () => {
    graph.addNode(
      "page_1",
      createGroupNode({ id: "group", parentId: "page_1" }),
    );

    graph.moveNode("title", "group");

    expect(graph.getChildren("group").map((node) => node.id)).toEqual([
      "title",
    ]);
    expect(graph.getAncestors("title").map((parent) => parent.id)).toEqual([
      "group",
      "page_1",
    ]);
    expect(graph.getDescendants("group").map((node) => node.id)).toEqual([
      "title",
    ]);
  });

  it("prevents parent-child cycles", () => {
    graph.addNode(
      "page_1",
      createGroupNode({ id: "outer", parentId: "page_1" }),
    );
    graph.addNode("outer", createGroupNode({ id: "inner", parentId: "outer" }));

    expect(() => graph.moveNode("outer", "inner")).toThrow(SceneGraphError);
    expect(graph.getParent("outer").id).toBe("page_1");
  });

  it("preserves children order when reordering", () => {
    graph.reorderNode("page_1", "background", 1);

    expect(graph.getChildren("page_1").map((node) => node.id)).toEqual([
      "title",
      "background",
    ]);
  });

  it("hit tests from the top layer and ignores locked or hidden nodes", () => {
    expect(graph.hitTest("page_1", { x: 30, y: 30 })?.id).toBe("title");

    graph.updateNode("title", { style: { locked: true } });
    expect(graph.hitTest("page_1", { x: 30, y: 30 })?.id).toBe("background");

    graph.updateNode("background", { style: { visible: false } });
    expect(graph.hitTest("page_1", { x: 30, y: 30 })).toBeUndefined();
  });

  it("suppresses descendant hits when a container is not visible", () => {
    graph.addNode(
      "page_1",
      createGroupNode({ id: "group", parentId: "page_1" }),
    );
    graph.moveNode("title", "group");
    graph.updateNode("group", { style: { opacity: 0 } });

    expect(graph.hitTest("page_1", { x: 30, y: 30 })?.id).toBe("background");
  });

  it("finds nodes by role and text content", () => {
    expect(graph.findNodesByRole("title").map((node) => node.id)).toEqual([
      "title",
    ]);
    expect(
      graph.findTextNodesByContent("scene graph").map((node) => node.id),
    ).toEqual(["title"]);
  });

  it("calculates simplified world and page bounding boxes", () => {
    graph.addNode(
      "page_1",
      createGroupNode({
        id: "group",
        parentId: "page_1",
        transform: { x: 100, y: 150 },
      }),
    );
    graph.moveNode("title", "group");

    expect(graph.getBoundingBox("title")).toEqual({
      x: 120,
      y: 170,
      width: 300,
      height: 80,
    });
    expect(graph.getPageBoundingBox("page_1")).toEqual({
      x: 0,
      y: 0,
      width: 1080,
      height: 1080,
    });
  });

  it("serializes and deserializes a schema-valid document", () => {
    const serialized = graph.serialize();
    const restored = deserialize(serialized);

    expect(validateDesignDocument(restored.toDocument())).toEqual(
      graph.toDocument(),
    );
  });
});
