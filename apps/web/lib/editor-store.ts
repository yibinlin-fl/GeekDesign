"use client";

import {
  CommandExecutor,
  createCommand,
  setStyleCommand,
  updateTextCommand,
} from "@geekdesign/command-system";
import {
  createEmptyDocument,
  createImageNode,
  createRectNode,
  createTextNode,
  validateDesignDocument,
  type DesignDocument,
  type Node,
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

interface EditorState {
  document: DesignDocument;
  selectedNodeId?: string;
  hoveredNodeId?: string;
  canUndo: boolean;
  canRedo: boolean;
  saved: boolean;
  newDesign: () => void;
  addText: () => void;
  addRect: () => void;
  addImagePlaceholder: () => void;
  insertAsset: (asset: AssetItem, replaceSelected?: boolean) => void;
  selectNode: (nodeId?: string) => void;
  hoverNode: (nodeId?: string) => void;
  updateText: (content: string) => void;
  updateFontSize: (fontSize: number) => void;
  updateFillColor: (color: string) => void;
  moveSelected: (x: number, y: number) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  load: () => void;
}

const commandContext = () => ({
  designId: executor.toDocument().documentId,
  userId: USER_ID,
});

const snapshot = () => ({
  document: executor.toDocument(),
  canUndo: executor.canUndo(),
  canRedo: executor.canRedo(),
  saved: false,
});

export const useEditorStore = create<EditorState>((set, get) => ({
  ...snapshot(),
  newDesign: () => {
    executor = new CommandExecutor({
      sceneGraph: SceneGraph.fromDocument(createBlankDocument()),
    });
    set({ ...snapshot(), selectedNodeId: undefined, hoveredNodeId: undefined });
  },
  addText: () => {
    const document = executor.toDocument();
    const pageId = document.pages[0]!.id;
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
    const pageId = document.pages[0]!.id;
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
  addImagePlaceholder: () => {
    const document = executor.toDocument();
    const pageId = document.pages[0]!.id;
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

    const pageId = document.pages[0]!.id;
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
    executor.execute(updateTextCommand(commandContext(), { nodeId, content }));
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
  undo: () => {
    executor.undo();
    set(snapshot());
  },
  redo: () => {
    executor.redo();
    set(snapshot());
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
    set({
      ...snapshot(),
      saved: true,
      selectedNodeId: undefined,
      hoveredNodeId: undefined,
    });
  },
}));

export const getSelectedNode = (
  document: DesignDocument,
  nodeId?: string,
): Node | undefined => (nodeId ? document.nodes[nodeId] : undefined);
