"use client";

import {
  CommandExecutor,
  createCommand,
  setStyleCommand,
  updateTextCommand,
} from "@geekdesign/command-system";
import {
  createEmptyDocument,
  createEllipseNode,
  createFrameNode,
  createImageNode,
  createLineNode,
  createRectNode,
  createTextNode,
  validateDesignDocument,
  type DesignDocument,
  type Node,
  type Page,
  type Paint,
  type TextNode,
} from "@geekdesign/design-schema";
import { SceneGraph } from "@geekdesign/scene-graph";
import { create } from "zustand";

import { toAssetRef, type AssetItem } from "./assets";

export const STORAGE_KEY = "geekdesign.editor.document";
const USER_ID = "local-user";

const id = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const createBlankDocument = (): DesignDocument =>
  createEmptyDocument({
    documentId: id("design"),
    pageId: id("page"),
    title: "Untitled design",
    width: 800,
    height: 600,
  });

let executor = new CommandExecutor({
  sceneGraph: SceneGraph.fromDocument(createBlankDocument()),
});
let activePageId = executor.toDocument().pages[0]!.id;

interface EditorState {
  document: DesignDocument;
  currentPageId: string;
  selectedNodeId?: string;
  hoveredNodeId?: string;
  canUndo: boolean;
  canRedo: boolean;
  saved: boolean;
  zoom: number;
  newDesign: () => void;
  selectPage: (pageId: string) => void;
  addPage: () => void;
  duplicatePage: (pageId?: string) => void;
  deletePage: (pageId?: string) => void;
  updatePageBackground: (paint: Paint) => void;
  addText: () => void;
  addRect: () => void;
  addEllipse: () => void;
  addLine: () => void;
  addFrame: () => void;
  addImagePlaceholder: () => void;
  insertAsset: (asset: AssetItem, replaceSelected?: boolean) => void;
  selectNode: (nodeId?: string) => void;
  hoverNode: (nodeId?: string) => void;
  updateText: (content: string) => void;
  updateTextNode: (nodeId: string, content: string) => void;
  updateTextStyle: (text: Partial<TextNode["text"]>) => void;
  updateFontSize: (fontSize: number) => void;
  updateFillColor: (color: string) => void;
  updateStroke: (color: string, width: number) => void;
  updateOpacity: (opacity: number) => void;
  updateCornerRadius: (cornerRadius: number) => void;
  updateImageFit: (fit: "cover" | "contain" | "stretch") => void;
  updateShadow: (enabled: boolean) => void;
  updateLocked: (locked: boolean) => void;
  updateVisible: (visible: boolean) => void;
  moveSelected: (x: number, y: number) => void;
  updateSelectedTransform: (transform: Partial<Node["transform"]>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  setZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  load: () => void;
  loadDocument: (document: DesignDocument) => void;
  markSaved: () => void;
}

const commandContext = () => ({
  designId: executor.toDocument().documentId,
  userId: USER_ID,
});

const snapshot = () => {
  const document = executor.toDocument();
  if (!document.pages.some((page) => page.id === activePageId)) {
    activePageId = document.pages[0]!.id;
  }
  return {
    document,
    currentPageId: activePageId,
    canUndo: executor.canUndo(),
    canRedo: executor.canRedo(),
    saved: false,
  };
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...snapshot(),
  zoom: 1,
  newDesign: () => {
    executor = new CommandExecutor({
      sceneGraph: SceneGraph.fromDocument(createBlankDocument()),
    });
    activePageId = executor.toDocument().pages[0]!.id;
    set({ ...snapshot(), selectedNodeId: undefined, hoveredNodeId: undefined });
  },
  selectPage: (pageId) => {
    if (!executor.toDocument().pages.some((page) => page.id === pageId)) return;
    activePageId = pageId;
    set({
      currentPageId: pageId,
      selectedNodeId: undefined,
      hoveredNodeId: undefined,
    });
  },
  addPage: () => {
    const document = executor.toDocument();
    const page: Page = {
      id: id("page"),
      name: `Page ${document.pages.length + 1}`,
      background: { type: "solid", color: "#ffffff" },
      children: [],
    };
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "ADD_PAGE",
        payload: { page },
      }),
    );
    activePageId = page.id;
    set({ ...snapshot(), selectedNodeId: undefined, hoveredNodeId: undefined });
  },
  duplicatePage: (pageId = activePageId) => {
    const document = executor.toDocument();
    const source = document.pages.find((page) => page.id === pageId);
    if (!source) return;
    const sourceIndex = document.pages.findIndex((page) => page.id === pageId);
    const page: Page = {
      id: id("page"),
      name: `${source.name} copy`,
      background: structuredClone(source.background),
      children: [],
    };
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "ADD_PAGE",
        payload: { page, index: sourceIndex + 1 },
      }),
    );
    source.children.forEach((nodeId) =>
      duplicateNodeTree(document, nodeId, page.id),
    );
    activePageId = page.id;
    set({ ...snapshot(), selectedNodeId: undefined, hoveredNodeId: undefined });
  },
  deletePage: (pageId = activePageId) => {
    const document = executor.toDocument();
    if (document.pages.length <= 1) return;
    const pageIndex = document.pages.findIndex((page) => page.id === pageId);
    if (pageIndex < 0) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "DELETE_PAGE",
        payload: { pageId },
      }),
    );
    const pages = executor.toDocument().pages;
    activePageId = pages[Math.min(pageIndex, pages.length - 1)]!.id;
    set({ ...snapshot(), selectedNodeId: undefined, hoveredNodeId: undefined });
  },
  updatePageBackground: (background) => {
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "SET_BACKGROUND",
        payload: { pageId: activePageId, background },
      }),
    );
    set(snapshot());
  },
  addText: () => {
    const document = executor.toDocument();
    const pageId = currentPage(document).id;
    const node = createTextNode({
      id: id("text"),
      parentId: pageId,
      content: "New text",
      role: "body",
      transform: { x: 120, y: 100, width: 320, height: 80 },
      style: { fill: { type: "solid", color: "#18181b" } },
    });
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "CREATE_NODE",
        payload: { parentId: pageId, node },
      }),
    );
    set({ ...snapshot(), selectedNodeId: node.id });
  },
  addRect: () => {
    const document = executor.toDocument();
    const pageId = currentPage(document).id;
    const node = createRectNode({
      id: id("rect"),
      parentId: pageId,
      name: "Rectangle",
      cornerRadius: 14,
      transform: { x: 180, y: 180, width: 220, height: 140 },
      style: { fill: { type: "solid", color: "#7c3aed" } },
    });
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "CREATE_NODE",
        payload: { parentId: pageId, node },
      }),
    );
    set({ ...snapshot(), selectedNodeId: node.id });
  },
  addEllipse: () => {
    const document = executor.toDocument();
    const pageId = currentPage(document).id;
    const node = createEllipseNode({
      id: id("ellipse"),
      parentId: pageId,
      name: "Ellipse",
      transform: { x: 210, y: 170, width: 180, height: 180 },
      style: { fill: { type: "solid", color: "#f43f5e" } },
    });
    executeCreateNode(pageId, node);
    set({ ...snapshot(), selectedNodeId: node.id });
  },
  addLine: () => {
    const document = executor.toDocument();
    const pageId = currentPage(document).id;
    const node = createLineNode({
      id: id("line"),
      parentId: pageId,
      name: "Line",
      transform: { x: 180, y: 260, width: 260, height: 12 },
      style: {
        stroke: {
          paint: { type: "solid", color: "#27272a" },
          width: 4,
          lineCap: "round",
        },
      },
    });
    node.line.x2 = 260;
    executeCreateNode(pageId, node);
    set({ ...snapshot(), selectedNodeId: node.id });
  },
  addFrame: () => {
    const document = executor.toDocument();
    const pageId = currentPage(document).id;
    const node = createFrameNode({
      id: id("frame"),
      parentId: pageId,
      name: "Frame",
      transform: { x: 160, y: 120, width: 360, height: 280 },
      style: {
        stroke: { paint: { type: "solid", color: "#a1a1aa" }, width: 2 },
      },
    });
    executeCreateNode(pageId, node, 0);
    set({ ...snapshot(), selectedNodeId: node.id });
  },
  addImagePlaceholder: () => {
    const document = executor.toDocument();
    const pageId = currentPage(document).id;
    const node = createRectNode({
      id: id("image"),
      parentId: pageId,
      name: "Image placeholder",
      cornerRadius: 10,
      transform: { x: 260, y: 220, width: 260, height: 180 },
      style: {
        fill: {
          type: "linear-gradient",
          angle: 135,
          stops: [
            { offset: 0, color: "#d4d4d8" },
            { offset: 1, color: "#71717a" },
          ],
        },
      },
    });
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "CREATE_NODE",
        payload: { parentId: pageId, node },
      }),
    );
    set({ ...snapshot(), selectedNodeId: node.id });
  },
  insertAsset: (assetItem, replaceSelected = false) => {
    const asset = toAssetRef(assetItem);
    const document = executor.toDocument();
    if (!document.assets[asset.id]) {
      executor.execute(
        createCommand({
          ...commandContext(),
          source: "user",
          type: "REGISTER_ASSET",
          payload: { asset },
        }),
      );
    }
    const selectedNodeId = get().selectedNodeId;
    const selected = selectedNodeId
      ? executor.toDocument().nodes[selectedNodeId]
      : undefined;
    if (replaceSelected && selected?.type === "image") {
      executor.execute(
        createCommand({
          ...commandContext(),
          source: "user",
          type: "UPDATE_NODE",
          payload: {
            nodeId: selected.id,
            patch: { image: { assetId: asset.id } },
          },
        }),
      );
      set(snapshot());
      return;
    }

    const pageId = currentPage(document).id;
    const node = createImageNode({
      id: id("image"),
      parentId: pageId,
      assetId: asset.id,
      name: assetItem.filename,
      alt: assetItem.filename,
      transform: { x: 240, y: 180, width: 320, height: 240 },
    });
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "CREATE_NODE",
        payload: { parentId: pageId, node },
      }),
    );
    set({ ...snapshot(), selectedNodeId: node.id });
  },
  selectNode: (selectedNodeId) =>
    set((state) =>
      state.selectedNodeId === selectedNodeId ? state : { selectedNodeId },
    ),
  hoverNode: (hoveredNodeId) =>
    set((state) =>
      state.hoveredNodeId === hoveredNodeId ? state : { hoveredNodeId },
    ),
  updateText: (content) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    get().updateTextNode(nodeId, content);
  },
  updateTextNode: (nodeId, content) => {
    executor.execute(updateTextCommand(commandContext(), { nodeId, content }));
    set(snapshot());
  },
  updateTextStyle: (text) => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || node?.type !== "text") return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { text } },
      }),
    );
    set(snapshot());
  },
  updateFontSize: (fontSize) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId || !Number.isFinite(fontSize) || fontSize <= 0) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { text: { fontSize } } },
      }),
    );
    set(snapshot());
  },
  updateFillColor: (color) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    executor.execute(
      setStyleCommand(commandContext(), {
        nodeId,
        style: { fill: { type: "solid", color } },
      }),
    );
    set(snapshot());
  },
  updateStroke: (color, width) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId || !Number.isFinite(width) || width < 0) return;
    executor.execute(
      setStyleCommand(commandContext(), {
        nodeId,
        style: {
          stroke: {
            paint: { type: "solid", color },
            width,
            lineCap: "round",
            lineJoin: "round",
          },
        },
      }),
    );
    set(snapshot());
  },
  updateOpacity: (opacity) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId || !Number.isFinite(opacity)) return;
    executor.execute(
      setStyleCommand(commandContext(), {
        nodeId,
        style: { opacity: Math.min(1, Math.max(0.05, opacity)) },
      }),
    );
    set(snapshot());
  },
  updateCornerRadius: (cornerRadius) => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || node?.type !== "rect" || !Number.isFinite(cornerRadius))
      return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { cornerRadius: Math.max(0, cornerRadius) } },
      }),
    );
    set(snapshot());
  },
  updateImageFit: (fit) => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || node?.type !== "image") return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { image: { fit } } },
      }),
    );
    set(snapshot());
  },
  updateShadow: (enabled) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    executor.execute(
      setStyleCommand(commandContext(), {
        nodeId,
        style: {
          shadow: enabled
            ? {
                color: "#18181b40",
                offsetX: 0,
                offsetY: 10,
                blur: 24,
                spread: 0,
              }
            : {
                color: "#00000000",
                offsetX: 0,
                offsetY: 0,
                blur: 0,
                spread: 0,
              },
        },
      }),
    );
    set(snapshot());
  },
  updateLocked: (locked) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    executor.execute(
      setStyleCommand(commandContext(), { nodeId, style: { locked } }),
    );
    set(snapshot());
  },
  updateVisible: (visible) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    executor.execute(
      setStyleCommand(commandContext(), { nodeId, style: { visible } }),
    );
    set(snapshot());
  },
  moveSelected: (x, y) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { transform: { x, y } } },
      }),
    );
    set(snapshot());
  },
  updateSelectedTransform: (transform) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { transform } },
      }),
    );
    set(snapshot());
  },
  deleteSelected: () => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "DELETE_NODE",
        payload: { nodeId },
      }),
    );
    set({
      ...snapshot(),
      selectedNodeId: undefined,
      hoveredNodeId: undefined,
    });
  },
  duplicateSelected: () => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    const document = executor.toDocument();
    const node = document.nodes[nodeId];
    if (!node) return;
    const duplicate = structuredClone(node);
    duplicate.id = id(node.type);
    duplicate.name = `${node.name ?? node.type} copy`;
    duplicate.transform.x += 20;
    duplicate.transform.y += 20;
    if (duplicate.type === "group" || duplicate.type === "frame") return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "CREATE_NODE",
        payload: { parentId: duplicate.parentId, node: duplicate },
      }),
    );
    set({ ...snapshot(), selectedNodeId: duplicate.id });
  },
  setZoom: (zoom) =>
    set({ zoom: Math.min(2, Math.max(0.25, Math.round(zoom * 100) / 100)) }),
  undo: () => {
    executor.undo();
    const next = snapshot();
    const selectedNodeId = get().selectedNodeId;
    set({
      ...next,
      selectedNodeId:
        selectedNodeId && next.document.nodes[selectedNodeId]
          ? selectedNodeId
          : undefined,
      hoveredNodeId: undefined,
    });
  },
  redo: () => {
    executor.redo();
    const next = snapshot();
    const selectedNodeId = get().selectedNodeId;
    set({
      ...next,
      selectedNodeId:
        selectedNodeId && next.document.nodes[selectedNodeId]
          ? selectedNodeId
          : undefined,
      hoveredNodeId: undefined,
    });
  },
  save: () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(executor.toDocument()),
    );
    set({ saved: true });
  },
  load: () => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const document = validateDesignDocument(JSON.parse(stored) as unknown);
    executor = new CommandExecutor({
      sceneGraph: SceneGraph.fromDocument(document),
    });
    activePageId = document.pages[0]!.id;
    set({
      ...snapshot(),
      saved: true,
      selectedNodeId: undefined,
      hoveredNodeId: undefined,
    });
  },
  loadDocument: (document) => {
    const validated = validateDesignDocument(document);
    executor = new CommandExecutor({
      sceneGraph: SceneGraph.fromDocument(validated),
    });
    activePageId = validated.pages[0]!.id;
    set({
      ...snapshot(),
      saved: true,
      selectedNodeId: undefined,
      hoveredNodeId: undefined,
    });
  },
  markSaved: () => set({ saved: true }),
}));

function executeCreateNode(parentId: string, node: Node, index?: number): void {
  executor.execute(
    createCommand({
      ...commandContext(),
      source: "user",
      type: "CREATE_NODE",
      payload: { parentId, node, ...(index === undefined ? {} : { index }) },
    }),
  );
}

function currentPage(document: DesignDocument): Page {
  return (
    document.pages.find((page) => page.id === activePageId) ??
    document.pages[0]!
  );
}

function duplicateNodeTree(
  sourceDocument: DesignDocument,
  sourceNodeId: string,
  parentId: string,
): void {
  const source = sourceDocument.nodes[sourceNodeId];
  if (!source) return;
  const duplicate = structuredClone(source);
  duplicate.id = id(source.type);
  duplicate.parentId = parentId;
  if (duplicate.type === "group" || duplicate.type === "frame") {
    const children = [...duplicate.children];
    duplicate.children = [];
    executeCreateNode(parentId, duplicate);
    children.forEach((childId) =>
      duplicateNodeTree(sourceDocument, childId, duplicate.id),
    );
    return;
  }
  executeCreateNode(parentId, duplicate);
}

export const getSelectedNode = (
  document: DesignDocument,
  nodeId?: string,
): Node | undefined => (nodeId ? document.nodes[nodeId] : undefined);
