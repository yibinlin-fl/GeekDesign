import { z } from "zod";

import { designDocumentSchema } from "./schemas";
import type { DesignDocument, Node, Paint } from "./types";

function hasDuplicate(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function referencedAssetIds(node: Node): string[] {
  const result: string[] = [];
  const addPaint = (paint: Paint | undefined): void => {
    if (paint?.type === "image") result.push(paint.assetId);
  };

  addPaint(node.style.fill);
  addPaint(node.style.stroke?.paint);
  if (node.type === "image") result.push(node.image.assetId);
  if (node.type === "svg") result.push(node.svg.assetId);
  return result;
}

function paintAssetId(paint: Paint | undefined): string | undefined {
  return paint?.type === "image" ? paint.assetId : undefined;
}

export function validateDesignDocument(input: unknown): DesignDocument {
  const document = designDocumentSchema.parse(input) as DesignDocument;
  const pageIds = new Set(document.pages.map((page) => page.id));
  const issues: z.ZodIssue[] = [];
  const childOccurrences = new Map<string, number>();

  const issue = (path: (string | number)[], message: string): void => {
    issues.push({ code: z.ZodIssueCode.custom, path, message });
  };

  if (pageIds.size !== document.pages.length) {
    issue(["pages"], "Page ids must be unique");
  }

  for (const [nodeKey, node] of Object.entries(document.nodes)) {
    if (nodeKey !== node.id) {
      issue(["nodes", nodeKey, "id"], "Node id must match its Record key");
    }
    if (!pageIds.has(node.parentId) && !document.nodes[node.parentId]) {
      issue(
        ["nodes", nodeKey, "parentId"],
        "Node parentId must reference a page, group, or frame",
      );
    } else if (!pageIds.has(node.parentId)) {
      const parent = document.nodes[node.parentId];
      if (parent?.type !== "group" && parent?.type !== "frame") {
        issue(
          ["nodes", nodeKey, "parentId"],
          "Nested node parent must be a group or frame",
        );
      }
    }
    for (const assetId of referencedAssetIds(node)) {
      if (!document.assets[assetId]) {
        issue(["nodes", nodeKey], `Node references missing asset "${assetId}"`);
      }
    }
    if (
      node.type === "text" &&
      node.text.fontId &&
      !document.fonts[node.text.fontId]
    ) {
      issue(
        ["nodes", nodeKey, "text", "fontId"],
        "Text node references a missing font",
      );
    }
  }

  const inspectChildren = (
    parentId: string,
    children: string[],
    path: (string | number)[],
  ): void => {
    if (hasDuplicate(children))
      issue(path, "Children must not contain duplicate node ids");
    for (const childId of children) {
      const child = document.nodes[childId];
      childOccurrences.set(childId, (childOccurrences.get(childId) ?? 0) + 1);
      if (!child) {
        issue(path, `Child references missing node "${childId}"`);
      } else if (child.parentId !== parentId) {
        issue(path, `Child "${childId}" parentId must be "${parentId}"`);
      }
    }
  };

  document.pages.forEach((page, index) => {
    inspectChildren(page.id, page.children, ["pages", index, "children"]);
    const assetId = paintAssetId(page.background);
    if (assetId && !document.assets[assetId]) {
      issue(
        ["pages", index, "background"],
        `Page background references missing asset "${assetId}"`,
      );
    }
  });
  for (const [nodeId, node] of Object.entries(document.nodes)) {
    if (node.type === "group" || node.type === "frame") {
      inspectChildren(nodeId, node.children, ["nodes", nodeId, "children"]);
    }
  }

  for (const nodeId of Object.keys(document.nodes)) {
    if ((childOccurrences.get(nodeId) ?? 0) !== 1) {
      issue(
        ["nodes", nodeId],
        "Every node must appear exactly once in its parent children array",
      );
    }

    const visited = new Set<string>([nodeId]);
    let parentId = document.nodes[nodeId]?.parentId;
    while (parentId && !pageIds.has(parentId)) {
      if (visited.has(parentId)) {
        issue(
          ["nodes", nodeId, "parentId"],
          "Node hierarchy must not contain a cycle",
        );
        break;
      }
      visited.add(parentId);
      parentId = document.nodes[parentId]?.parentId;
    }
  }

  for (const [assetKey, asset] of Object.entries(document.assets)) {
    if (assetKey !== asset.id)
      issue(["assets", assetKey, "id"], "Asset id must match its Record key");
  }
  for (const [fontKey, font] of Object.entries(document.fonts)) {
    if (fontKey !== font.id)
      issue(["fonts", fontKey, "id"], "Font id must match its Record key");
    if (font.assetId && !document.assets[font.assetId]) {
      issue(["fonts", fontKey, "assetId"], "Font references a missing asset");
    }
  }
  for (const [variableKey, variable] of Object.entries(document.variables)) {
    if (variableKey !== variable.key) {
      issue(
        ["variables", variableKey, "key"],
        "Variable key must match its Record key",
      );
    }
    if (!document.nodes[variable.targetNodeId]) {
      issue(
        ["variables", variableKey, "targetNodeId"],
        "Variable references a missing node",
      );
    }
  }

  if (issues.length > 0) throw new z.ZodError(issues);
  return document;
}
