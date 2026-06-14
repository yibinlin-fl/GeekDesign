import {
  createGroupNode,
  validateDesignDocument,
  type DesignDocument,
} from "@geekdesign/design-schema";
import { SceneGraph, type NodePatch } from "@geekdesign/scene-graph";

import { CommandExecutionError, CommandValidationError } from "./errors";
import { HistoryManager } from "./history";
import type {
  Command,
  CommandContext,
  CommandResult,
  HistoryEntry,
} from "./types";
import { validateCommand } from "./validation";

const clone = <T>(value: T): T => structuredClone(value);

const normalizeIndex = (index: number | undefined, length: number): number => {
  if (index === undefined) return length;
  if (!Number.isInteger(index))
    throw new CommandValidationError("Index must be an integer");
  return Math.max(0, Math.min(index, length));
};

export class CommandExecutor {
  private sceneGraph: SceneGraph;
  private readonly designId: string;
  private readonly confirm?: (command: Command) => boolean;
  private readonly history: HistoryManager;

  constructor(context: CommandContext, history = new HistoryManager()) {
    this.sceneGraph = SceneGraph.fromDocument(context.sceneGraph.toDocument());
    this.designId =
      context.designId ?? context.sceneGraph.toDocument().documentId;
    this.confirm = context.confirm;
    this.history = history;
  }

  execute(commandInput: Command): CommandResult {
    const command = validateCommand(commandInput);
    if (command.designId !== this.designId) {
      throw new CommandValidationError(
        `Command designId "${command.designId}" does not match "${this.designId}"`,
      );
    }
    if (command.requireConfirmation && !this.confirm?.(command)) {
      throw new CommandValidationError(
        `Command "${command.id}" requires confirmation`,
      );
    }

    const before = this.sceneGraph.toDocument();
    let candidate = SceneGraph.fromDocument(before);
    try {
      candidate = this.applyCommand(candidate, command);
    } catch (error) {
      throw new CommandExecutionError(`Failed to execute ${command.type}`, {
        cause: error,
      });
    }

    const after = candidate.toDocument();
    const result: CommandResult = {
      command: clone(command),
      before: { document: before },
      after: { document: after },
      executedAt: Date.now(),
    };
    this.sceneGraph = candidate;
    this.history.push(result);
    return clone(result);
  }

  undo(): HistoryEntry | undefined {
    const entry = this.history.undo();
    if (!entry) return undefined;
    this.sceneGraph = SceneGraph.fromDocument(entry.before.document);
    return entry;
  }

  redo(): HistoryEntry | undefined {
    const entry = this.history.redo();
    if (!entry) return undefined;
    this.sceneGraph = SceneGraph.fromDocument(entry.after.document);
    return entry;
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  getHistory(): HistoryEntry[] {
    return this.history.getHistory();
  }

  clearHistory(): void {
    this.history.clearHistory();
  }

  getSceneGraph(): SceneGraph {
    return SceneGraph.fromDocument(this.sceneGraph.toDocument());
  }

  toDocument(): DesignDocument {
    return this.sceneGraph.toDocument();
  }

  private applyCommand(graph: SceneGraph, command: Command): SceneGraph {
    switch (command.type) {
      case "CREATE_NODE":
        graph.addNode(
          command.payload.parentId,
          command.payload.node,
          command.payload.index,
        );
        return graph;
      case "DELETE_NODE":
        graph.removeNode(command.payload.nodeId);
        return graph;
      case "UPDATE_NODE":
        graph.updateNode(command.payload.nodeId, command.payload.patch);
        return graph;
      case "MOVE_NODE":
        graph.moveNode(
          command.payload.nodeId,
          command.payload.newParentId,
          command.payload.index,
        );
        return graph;
      case "RESIZE_NODE":
        graph.updateNode(command.payload.nodeId, {
          transform: {
            width: command.payload.width,
            height: command.payload.height,
          },
        });
        return graph;
      case "ROTATE_NODE":
        graph.updateNode(command.payload.nodeId, {
          transform: { rotation: command.payload.rotation },
        });
        return graph;
      case "SET_STYLE":
        graph.updateNode(command.payload.nodeId, {
          style: command.payload.style,
        });
        return graph;
      case "UPDATE_TEXT": {
        const node = graph.getNode(command.payload.nodeId);
        if (node?.type !== "text")
          throw new CommandValidationError("UPDATE_TEXT requires a text node");
        graph.updateNode(command.payload.nodeId, {
          text: { content: command.payload.content },
        });
        return graph;
      }
      case "REORDER_NODE":
        graph.reorderNode(
          command.payload.parentId,
          command.payload.nodeId,
          command.payload.newIndex,
        );
        return graph;
      case "GROUP_NODES":
        this.groupNodes(graph, command);
        return graph;
      case "UNGROUP_NODES":
        this.ungroupNodes(graph, command.payload.groupId);
        return graph;
      case "ADD_PAGE":
        return this.replaceDocument(graph, (document) => {
          if (
            document.pages.some((page) => page.id === command.payload.page.id)
          ) {
            throw new CommandValidationError(
              `Page "${command.payload.page.id}" already exists`,
            );
          }
          if (command.payload.page.children.length > 0) {
            throw new CommandValidationError(
              "A newly added page must start without children",
            );
          }
          document.pages.splice(
            normalizeIndex(command.payload.index, document.pages.length),
            0,
            clone(command.payload.page),
          );
        });
      case "DELETE_PAGE":
        return this.deletePage(graph, command.payload.pageId);
      case "SET_BACKGROUND":
        return this.replaceDocument(graph, (document) => {
          const page = document.pages.find(
            (candidate) => candidate.id === command.payload.pageId,
          );
          if (!page)
            throw new CommandValidationError(
              `Page "${command.payload.pageId}" does not exist`,
            );
          page.background = clone(command.payload.background);
        });
      case "FILL_TEMPLATE_VARIABLES":
        this.fillTemplateVariables(graph, command.payload.values);
        return graph;
    }
  }

  private groupNodes(
    graph: SceneGraph,
    command: Extract<Command, { type: "GROUP_NODES" }>,
  ): void {
    const uniqueIds = [...new Set(command.payload.nodeIds)];
    if (uniqueIds.length !== command.payload.nodeIds.length) {
      throw new CommandValidationError("GROUP_NODES nodeIds must be unique");
    }
    const nodes = uniqueIds.map((nodeId) => {
      const node = graph.getNode(nodeId);
      if (!node)
        throw new CommandValidationError(`Node "${nodeId}" does not exist`);
      return node;
    });
    const parentId = nodes[0]?.parentId;
    if (!parentId || nodes.some((node) => node.parentId !== parentId)) {
      throw new CommandValidationError("GROUP_NODES requires sibling nodes");
    }
    const siblingIds = graph.getChildren(parentId).map((node) => node.id);
    const sortedIds = uniqueIds.sort(
      (left, right) => siblingIds.indexOf(left) - siblingIds.indexOf(right),
    );
    const groupIndex =
      command.payload.index ??
      Math.min(...sortedIds.map((nodeId) => siblingIds.indexOf(nodeId)));

    graph.addNode(
      parentId,
      createGroupNode({
        id: command.payload.groupId,
        parentId,
        ...(command.payload.name ? { name: command.payload.name } : {}),
      }),
      groupIndex,
    );
    sortedIds.forEach((nodeId) =>
      graph.moveNode(nodeId, command.payload.groupId),
    );
  }

  private ungroupNodes(graph: SceneGraph, groupId: string): void {
    const group = graph.getNode(groupId);
    if (group?.type !== "group")
      throw new CommandValidationError("UNGROUP_NODES requires a group node");
    const parentId = group.parentId;
    const groupIndex = graph
      .getChildren(parentId)
      .findIndex((node) => node.id === groupId);
    const childIds = group.children;
    childIds.forEach((nodeId, index) =>
      graph.moveNode(nodeId, parentId, groupIndex + index),
    );
    graph.removeNode(groupId);
  }

  private deletePage(graph: SceneGraph, pageId: string): SceneGraph {
    const page = graph.getPage(pageId);
    if (!page)
      throw new CommandValidationError(`Page "${pageId}" does not exist`);
    if (graph.toDocument().pages.length === 1) {
      throw new CommandValidationError("Cannot delete the last page");
    }
    [...page.children].forEach((nodeId) => graph.removeNode(nodeId));
    return this.replaceDocument(graph, (document) => {
      document.pages = document.pages.filter(
        (candidate) => candidate.id !== pageId,
      );
    });
  }

  private fillTemplateVariables(
    graph: SceneGraph,
    values: Record<string, unknown>,
  ): void {
    const document = graph.toDocument();
    for (const [key, value] of Object.entries(values)) {
      const variable = document.variables[key];
      if (!variable)
        throw new CommandValidationError(
          `Template variable "${key}" does not exist`,
        );
      const patch = this.variablePatch(variable.path, value);
      graph.updateNode(variable.targetNodeId, patch);
    }
  }

  private variablePatch(path: string, value: unknown): NodePatch {
    if (path === "text.content") {
      if (typeof value !== "string")
        throw new CommandValidationError("text.content requires a string");
      return { text: { content: value } };
    }
    if (path === "style.fill") {
      if (typeof value !== "object" || value === null) {
        throw new CommandValidationError("style.fill requires a Paint object");
      }
      return { style: { fill: value } };
    }
    if (path === "style.fill.color") {
      if (typeof value !== "string")
        throw new CommandValidationError("style.fill.color requires a string");
      return { style: { fill: { color: value } } };
    }
    if (path === "image.assetId") {
      if (typeof value !== "string")
        throw new CommandValidationError("image.assetId requires a string");
      return { image: { assetId: value } };
    }
    throw new CommandValidationError(
      `Unsupported template variable path "${path}"`,
    );
  }

  private replaceDocument(
    graph: SceneGraph,
    mutation: (document: DesignDocument) => void,
  ): SceneGraph {
    const document = graph.toDocument();
    mutation(document);
    return SceneGraph.fromDocument(validateDesignDocument(document));
  }
}
