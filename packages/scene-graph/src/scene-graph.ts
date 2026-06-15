import {
  validateDesignDocument,
  type DesignDocument,
  type Node,
  type NodeId,
  type NodeRole,
  type Page,
  type PageId,
} from "@geekdesign/design-schema";

import type { BoundingBox, NodePatch, Point } from "./types";
import { SceneGraphError } from "./types";

const clone = <T>(value: T): T => structuredClone(value);
type Matrix = [number, number, number, number, number, number];

const multiply = (left: Matrix, right: Matrix): Matrix => [
  left[0] * right[0] + left[2] * right[1],
  left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3],
  left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4],
  left[1] * right[4] + left[3] * right[5] + left[5],
];

const transformPoint = (matrix: Matrix, point: Point): Point => ({
  x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
  y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
});

const invert = (matrix: Matrix): Matrix => {
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  if (Math.abs(determinant) < Number.EPSILON) {
    throw new SceneGraphError("Node transform is not invertible");
  }
  return [
    matrix[3] / determinant,
    -matrix[1] / determinant,
    -matrix[2] / determinant,
    matrix[0] / determinant,
    (matrix[2] * matrix[5] - matrix[3] * matrix[4]) / determinant,
    (matrix[1] * matrix[4] - matrix[0] * matrix[5]) / determinant,
  ];
};

const isContainer = (
  node: Node,
): node is Extract<Node, { type: "group" | "frame" }> =>
  node.type === "group" || node.type === "frame";

const deepMerge = <T>(target: T, patch: unknown): T => {
  if (
    patch === null ||
    typeof patch !== "object" ||
    Array.isArray(patch) ||
    target === null ||
    typeof target !== "object" ||
    Array.isArray(target)
  ) {
    return clone(patch as T);
  }

  const result = clone(target) as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      result[key] = deepMerge(result[key], value);
    }
  }
  return result as T;
};

export class SceneGraph {
  private document: DesignDocument;

  private constructor(document: DesignDocument) {
    this.document = document;
  }

  static fromDocument(document: DesignDocument): SceneGraph {
    return new SceneGraph(clone(validateDesignDocument(document)));
  }

  static deserialize(serialized: string): SceneGraph {
    return SceneGraph.fromDocument(JSON.parse(serialized) as DesignDocument);
  }

  toDocument(): DesignDocument {
    return clone(this.document);
  }

  serialize(): string {
    return JSON.stringify(this.document);
  }

  getNode(nodeId: NodeId): Node | undefined {
    const node = this.document.nodes[nodeId];
    return node ? clone(node) : undefined;
  }

  hasNode(nodeId: NodeId): boolean {
    return Boolean(this.document.nodes[nodeId]);
  }

  getPage(pageId: PageId): Page | undefined {
    const page = this.document.pages.find(
      (candidate) => candidate.id === pageId,
    );
    return page ? clone(page) : undefined;
  }

  getChildren(parentId: PageId | NodeId): Node[] {
    return this.getChildIds(parentId).map((nodeId) =>
      clone(this.requireNode(nodeId)),
    );
  }

  getParent(nodeId: NodeId): Page | Node {
    const node = this.requireNode(nodeId);
    const page = this.document.pages.find(
      (candidate) => candidate.id === node.parentId,
    );
    if (page) return clone(page);
    return clone(this.requireNode(node.parentId));
  }

  getAncestors(nodeId: NodeId): Array<Page | Node> {
    const ancestors: Array<Page | Node> = [];
    let parent = this.getParent(nodeId);
    ancestors.push(parent);

    while ("type" in parent) {
      parent = this.getParent(parent.id);
      ancestors.push(parent);
    }
    return ancestors;
  }

  getDescendants(nodeId: NodeId): Node[] {
    const node = this.requireNode(nodeId);
    if (!isContainer(node)) return [];

    const descendants: Node[] = [];
    const visit = (parentId: NodeId): void => {
      for (const child of this.getChildren(parentId)) {
        descendants.push(child);
        if (isContainer(child)) visit(child.id);
      }
    };
    visit(nodeId);
    return descendants;
  }

  addNode(parentId: PageId | NodeId, node: Node, index?: number): void {
    this.commit((document) => {
      if (document.nodes[node.id]) {
        throw new SceneGraphError(`Node "${node.id}" already exists`);
      }
      if (isContainer(node) && node.children.length > 0) {
        throw new SceneGraphError(
          "A newly added group or frame must start without children",
        );
      }

      const children = this.mutableChildIds(document, parentId);
      document.nodes[node.id] = { ...clone(node), parentId };
      children.splice(
        this.normalizeInsertIndex(index, children.length),
        0,
        node.id,
      );
    });
  }

  removeNode(nodeId: NodeId): void {
    this.requireNode(nodeId);
    this.commit((document) => {
      const idsToRemove = new Set([
        nodeId,
        ...this.collectDescendantIds(document, nodeId),
      ]);
      const node = document.nodes[nodeId];
      if (!node) throw new SceneGraphError(`Node "${nodeId}" does not exist`);

      const siblings = this.mutableChildIds(document, node.parentId);
      const index = siblings.indexOf(nodeId);
      if (index >= 0) siblings.splice(index, 1);

      for (const id of idsToRemove) delete document.nodes[id];
      for (const [key, variable] of Object.entries(document.variables)) {
        if (idsToRemove.has(variable.targetNodeId))
          delete document.variables[key];
      }
    });
  }

  updateNode(nodeId: NodeId, patch: NodePatch): void {
    this.requireNode(nodeId);
    if (
      "id" in patch ||
      "type" in patch ||
      "parentId" in patch ||
      "children" in patch
    ) {
      throw new SceneGraphError(
        "updateNode cannot change id, type, parentId, or children",
      );
    }

    this.commit((document) => {
      const node = document.nodes[nodeId];
      if (!node) throw new SceneGraphError(`Node "${nodeId}" does not exist`);
      document.nodes[nodeId] = deepMerge(node, patch);
    });
  }

  moveNode(nodeId: NodeId, newParentId: PageId | NodeId, index?: number): void {
    this.requireNode(nodeId);
    if (
      newParentId === nodeId ||
      this.collectDescendantIds(this.document, nodeId).includes(newParentId)
    ) {
      throw new SceneGraphError(
        "Moving a node into itself or its descendant would create a cycle",
      );
    }

    this.commit((document) => {
      const movingNode = document.nodes[nodeId];
      if (!movingNode)
        throw new SceneGraphError(`Node "${nodeId}" does not exist`);
      const oldChildren = this.mutableChildIds(document, movingNode.parentId);
      const oldIndex = oldChildren.indexOf(nodeId);
      if (oldIndex >= 0) oldChildren.splice(oldIndex, 1);

      const newChildren = this.mutableChildIds(document, newParentId);
      newChildren.splice(
        this.normalizeInsertIndex(index, newChildren.length),
        0,
        nodeId,
      );
      movingNode.parentId = newParentId;
    });
  }

  reorderNode(
    parentId: PageId | NodeId,
    nodeId: NodeId,
    newIndex: number,
  ): void {
    this.commit((document) => {
      const children = this.mutableChildIds(document, parentId);
      const currentIndex = children.indexOf(nodeId);
      if (currentIndex < 0) {
        throw new SceneGraphError(
          `Node "${nodeId}" is not a child of "${parentId}"`,
        );
      }
      children.splice(currentIndex, 1);
      children.splice(
        this.normalizeInsertIndex(newIndex, children.length),
        0,
        nodeId,
      );
    });
  }

  getBoundingBox(nodeId: NodeId): BoundingBox {
    const node = this.requireNode(nodeId);
    const matrix = this.getWorldMatrix(node);
    const corners = [
      transformPoint(matrix, { x: 0, y: 0 }),
      transformPoint(matrix, { x: node.transform.width, y: 0 }),
      transformPoint(matrix, {
        x: node.transform.width,
        y: node.transform.height,
      }),
      transformPoint(matrix, { x: 0, y: node.transform.height }),
    ];
    const left = Math.min(...corners.map((point) => point.x));
    const top = Math.min(...corners.map((point) => point.y));
    const right = Math.max(...corners.map((point) => point.x));
    const bottom = Math.max(...corners.map((point) => point.y));
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }

  getPageBoundingBox(pageId: PageId): BoundingBox {
    this.requirePage(pageId);
    return {
      x: 0,
      y: 0,
      width: this.document.canvas.width,
      height: this.document.canvas.height,
    };
  }

  hitTest(pageId: PageId, point: Point): Node | undefined {
    this.requirePage(pageId);

    const visit = (
      parentId: PageId | NodeId,
      ancestorsVisible: boolean,
      ancestorsUnlocked: boolean,
    ): Node | undefined => {
      const children = this.getChildIds(parentId);
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const node = this.requireNode(children[index] as NodeId);
        const visible =
          ancestorsVisible && node.style.visible && node.style.opacity > 0;
        if (!visible) continue;
        const unlocked = ancestorsUnlocked && !node.style.locked;

        if (isContainer(node)) {
          const insideClip =
            node.type !== "frame" ||
            !node.clipContent ||
            this.containsNodePoint(node, point);
          const childHit = insideClip ? visit(node.id, visible, unlocked) : undefined;
          if (childHit) return childHit;
        }
        if (unlocked && this.containsNodePoint(node, point)) {
          return clone(node);
        }
      }
      return undefined;
    };

    return visit(pageId, true, true);
  }

  findNodesByRole(role: NodeRole): Node[] {
    return Object.values(this.document.nodes)
      .filter((node) => node.role === role)
      .map(clone);
  }

  findTextNodesByContent(keyword: string): Extract<Node, { type: "text" }>[] {
    const normalizedKeyword = keyword.toLocaleLowerCase();
    return Object.values(this.document.nodes)
      .filter(
        (node): node is Extract<Node, { type: "text" }> =>
          node.type === "text" &&
          node.text.content.toLocaleLowerCase().includes(normalizedKeyword),
      )
      .map(clone);
  }

  private commit(mutation: (document: DesignDocument) => void): void {
    const candidate = clone(this.document);
    mutation(candidate);
    candidate.updatedAt = new Date().toISOString();
    this.document = clone(validateDesignDocument(candidate));
  }

  private requireNode(nodeId: NodeId): Node {
    const node = this.document.nodes[nodeId];
    if (!node) throw new SceneGraphError(`Node "${nodeId}" does not exist`);
    return node;
  }

  private requirePage(pageId: PageId): Page {
    const page = this.document.pages.find(
      (candidate) => candidate.id === pageId,
    );
    if (!page) throw new SceneGraphError(`Page "${pageId}" does not exist`);
    return page;
  }

  private getChildIds(parentId: PageId | NodeId): NodeId[] {
    const page = this.document.pages.find(
      (candidate) => candidate.id === parentId,
    );
    if (page) return [...page.children];

    const node = this.requireNode(parentId);
    if (!isContainer(node)) {
      throw new SceneGraphError(`Node "${parentId}" cannot contain children`);
    }
    return [...node.children];
  }

  private mutableChildIds(
    document: DesignDocument,
    parentId: PageId | NodeId,
  ): NodeId[] {
    const page = document.pages.find((candidate) => candidate.id === parentId);
    if (page) return page.children;

    const node = document.nodes[parentId];
    if (!node) throw new SceneGraphError(`Parent "${parentId}" does not exist`);
    if (!isContainer(node)) {
      throw new SceneGraphError(`Node "${parentId}" cannot contain children`);
    }
    return node.children;
  }

  private collectDescendantIds(
    document: DesignDocument,
    nodeId: NodeId,
  ): NodeId[] {
    const node = document.nodes[nodeId];
    if (!node || !isContainer(node)) return [];

    const ids: NodeId[] = [];
    for (const childId of node.children) {
      ids.push(childId, ...this.collectDescendantIds(document, childId));
    }
    return ids;
  }

  private getWorldMatrix(node: Node): Matrix {
    const matrices: Matrix[] = [];
    let current: Node | undefined = node;
    while (current) {
      const radians = (current.transform.rotation * Math.PI) / 180;
      const cosine = Math.cos(radians);
      const sine = Math.sin(radians);
      matrices.unshift([
        cosine * current.transform.scaleX,
        sine * current.transform.scaleX,
        -sine * current.transform.scaleY,
        cosine * current.transform.scaleY,
        current.transform.x,
        current.transform.y,
      ]);
      current = this.document.nodes[current.parentId];
    }
    return matrices.reduce<Matrix>(
      (result, matrix) => multiply(result, matrix),
      [1, 0, 0, 1, 0, 0],
    );
  }

  private containsNodePoint(node: Node, point: Point): boolean {
    const local = transformPoint(invert(this.getWorldMatrix(node)), point);
    if (
      local.x < 0 ||
      local.y < 0 ||
      local.x > node.transform.width ||
      local.y > node.transform.height
    ) {
      return false;
    }
    if (node.type === "ellipse") {
      const radiusX = node.transform.width / 2;
      const radiusY = node.transform.height / 2;
      return (
        ((local.x - radiusX) / radiusX) ** 2 +
          ((local.y - radiusY) / radiusY) ** 2 <=
        1
      );
    }
    return true;
  }

  private normalizeInsertIndex(
    index: number | undefined,
    length: number,
  ): number {
    if (index === undefined) return length;
    if (!Number.isInteger(index))
      throw new SceneGraphError("Index must be an integer");
    return Math.max(0, Math.min(index, length));
  }

}

export const fromDocument = (document: DesignDocument): SceneGraph =>
  SceneGraph.fromDocument(document);
export const deserialize = (serialized: string): SceneGraph =>
  SceneGraph.deserialize(serialized);
