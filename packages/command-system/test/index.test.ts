import {
  createEmptyDocument,
  createGroupNode,
  createImageNode,
  createRectNode,
  createTextNode,
  validateDesignDocument,
  type DesignDocument,
} from "@geekdesign/design-schema";
import { SceneGraph } from "@geekdesign/scene-graph";
import { beforeEach, describe, expect, it } from "vitest";

import {
  CommandExecutionError,
  CommandExecutor,
  createCommand,
  moveNodeCommand,
  setStyleCommand,
  updateTextCommand,
  validateCommand,
} from "../src";

const context = {
  designId: "design_commands",
  userId: "user_1",
} as const;

const buildDocument = (): DesignDocument => {
  const document = createEmptyDocument({
    documentId: context.designId,
    pageId: "page_1",
    now: "2026-06-14T00:00:00.000Z",
  });
  const title = createTextNode({
    id: "title",
    parentId: "page_1",
    role: "title",
    content: "Original title",
  });
  const shape = createRectNode({
    id: "shape",
    parentId: "page_1",
    style: { fill: { type: "solid", color: "#000000" } },
  });
  document.nodes = { title, shape };
  document.pages[0]!.children = ["title", "shape"];
  document.variables = {
    title: {
      key: "title",
      label: "Title",
      targetNodeId: "title",
      path: "text.content",
      type: "text",
    },
  };
  return document;
};

const textContent = (executor: CommandExecutor): string => {
  const node = executor.toDocument().nodes.title;
  if (node?.type !== "text") throw new Error("Missing title node");
  return node.text.content;
};

describe("CommandExecutor", () => {
  let executor: CommandExecutor;

  beforeEach(() => {
    executor = new CommandExecutor({
      sceneGraph: SceneGraph.fromDocument(buildDocument()),
      designId: context.designId,
    });
  });

  it("executes UPDATE_TEXT and records before/after patches", () => {
    const result = executor.execute(
      updateTextCommand(context, { nodeId: "title", content: "Updated title" }),
    );

    expect(textContent(executor)).toBe("Updated title");
    expect(
      result.before.document.nodes.title?.type === "text" &&
        result.before.document.nodes.title.text.content,
    ).toBe("Original title");
    expect(
      result.after.document.nodes.title?.type === "text" &&
        result.after.document.nodes.title.text.content,
    ).toBe("Updated title");
  });

  it("undoes UPDATE_TEXT", () => {
    executor.execute(
      updateTextCommand(context, { nodeId: "title", content: "Updated title" }),
    );

    executor.undo();

    expect(textContent(executor)).toBe("Original title");
    expect(executor.canRedo()).toBe(true);
  });

  it("redoes UPDATE_TEXT", () => {
    executor.execute(
      updateTextCommand(context, { nodeId: "title", content: "Updated title" }),
    );
    executor.undo();

    executor.redo();

    expect(textContent(executor)).toBe("Updated title");
    expect(executor.canUndo()).toBe(true);
  });

  it("executes MOVE_NODE into a group", () => {
    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "CREATE_NODE",
        payload: {
          parentId: "page_1",
          node: createGroupNode({ id: "group", parentId: "page_1" }),
        },
      }),
    );

    executor.execute(
      moveNodeCommand(context, { nodeId: "shape", newParentId: "group" }),
    );

    expect(executor.getSceneGraph().getParent("shape").id).toBe("group");
  });

  it("executes SET_STYLE", () => {
    executor.execute(
      setStyleCommand(context, {
        nodeId: "shape",
        style: { opacity: 0.4, locked: true },
      }),
    );

    expect(executor.toDocument().nodes.shape?.style.opacity).toBe(0.4);
    expect(executor.toDocument().nodes.shape?.style.locked).toBe(true);
  });

  it("rejects an illegal nodeId without modifying the document", () => {
    const before = executor.toDocument();
    const command = updateTextCommand(context, {
      nodeId: "missing",
      content: "Nope",
    });

    expect(() => executor.execute(command)).toThrow(CommandExecutionError);
    expect(executor.toDocument()).toEqual(before);
    expect(executor.getHistory()).toEqual([]);
  });

  it("records AI source commands in history", () => {
    executor.execute(
      updateTextCommand(
        { ...context, source: "ai" },
        { nodeId: "title", content: "AI generated title" },
      ),
    );

    expect(executor.getHistory()[0]?.command.source).toBe("ai");
  });

  it("preserves multi-step undo and redo order", () => {
    executor.execute(
      updateTextCommand(context, { nodeId: "title", content: "Step 1" }),
    );
    executor.execute(
      updateTextCommand(context, { nodeId: "title", content: "Step 2" }),
    );

    executor.undo();
    expect(textContent(executor)).toBe("Step 1");
    executor.undo();
    expect(textContent(executor)).toBe("Original title");
    executor.redo();
    expect(textContent(executor)).toBe("Step 1");
    executor.redo();
    expect(textContent(executor)).toBe("Step 2");
  });

  it("clears undo and redo history", () => {
    executor.execute(
      updateTextCommand(context, { nodeId: "title", content: "Updated" }),
    );
    executor.undo();

    executor.clearHistory();

    expect(executor.canUndo()).toBe(false);
    expect(executor.canRedo()).toBe(false);
    expect(executor.getHistory()).toEqual([]);
  });

  it("fills template variables in one command", () => {
    executor.execute(
      createCommand({
        ...context,
        source: "ai",
        type: "FILL_TEMPLATE_VARIABLES",
        payload: { values: { title: "Filled from template" } },
      }),
    );

    expect(textContent(executor)).toBe("Filled from template");
    expect(executor.getHistory()).toHaveLength(1);
  });

  it("registers an asset before inserting an image node", () => {
    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "REGISTER_ASSET",
        payload: {
          asset: {
            id: "asset_upload",
            type: "image",
            uri: "/uploads/user/asset.png",
            mimeType: "image/png",
          },
        },
      }),
    );
    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "CREATE_NODE",
        payload: {
          parentId: "page_1",
          node: createImageNode({
            id: "image_upload",
            parentId: "page_1",
            assetId: "asset_upload",
          }),
        },
      }),
    );

    expect(executor.toDocument().assets.asset_upload?.mimeType).toBe(
      "image/png",
    );
    expect(executor.toDocument().nodes.image_upload?.type).toBe("image");
  });

  it("groups and ungroups sibling nodes", () => {
    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "GROUP_NODES",
        payload: { nodeIds: ["title", "shape"], groupId: "group" },
      }),
    );
    expect(
      executor
        .getSceneGraph()
        .getChildren("group")
        .map((node) => node.id),
    ).toEqual(["title", "shape"]);

    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "UNGROUP_NODES",
        payload: { groupId: "group" },
      }),
    );
    expect(executor.getSceneGraph().hasNode("group")).toBe(false);
    expect(
      executor
        .getSceneGraph()
        .getChildren("page_1")
        .map((node) => node.id),
    ).toEqual(["title", "shape"]);
  });

  it("supports page commands and keeps resulting documents valid", () => {
    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "ADD_PAGE",
        payload: {
          page: {
            id: "page_2",
            name: "Page 2",
            background: { type: "solid", color: "#ffffff" },
            children: [],
          },
        },
      }),
    );
    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "SET_BACKGROUND",
        payload: {
          pageId: "page_2",
          background: { type: "solid", color: "#ff0000" },
        },
      }),
    );
    executor.execute(
      createCommand({
        ...context,
        source: "user",
        type: "DELETE_PAGE",
        payload: { pageId: "page_2" },
      }),
    );

    expect(validateDesignDocument(executor.toDocument()).pages).toHaveLength(1);
  });

  it("validates command envelope fields", () => {
    expect(() => validateCommand({ type: "UPDATE_TEXT" })).toThrow();
  });

  it("enforces requireConfirmation before high-risk execution", () => {
    const confirmedExecutor = new CommandExecutor({
      sceneGraph: SceneGraph.fromDocument(buildDocument()),
      confirm: () => true,
    });
    const command = createCommand({
      ...context,
      source: "user",
      type: "DELETE_NODE",
      requireConfirmation: true,
      payload: { nodeId: "shape" },
    });

    confirmedExecutor.execute(command);

    expect(confirmedExecutor.getSceneGraph().hasNode("shape")).toBe(false);
  });
});
