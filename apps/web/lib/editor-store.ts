"use client";

import {
  CommandExecutor,
  createCommand,
  setStyleCommand,
  updateTextCommand,
} from "@geekdesign/command-system";
import {
  createEmptyDocument,
  createChartNode,
  createEllipseNode,
  createFrameNode,
  createImageNode,
  createLineNode,
  createRectNode,
  createTableNode,
  createTextNode,
  validateDesignDocument,
  type DesignDocument,
  type ChartNode,
  type ElementAnimation,
  type ImageCrop,
  type Node,
  type Page,
  type Paint,
  type PageTransition,
  type RichTextRun,
  type TableNode,
  type SlideLayout,
  type TextNode,
  type Theme,
} from "@geekdesign/design-schema";
import { SceneGraph, type NodePatch } from "@geekdesign/scene-graph";
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
let clipboard: { document: DesignDocument; nodeIds: string[] } | undefined;

interface EditorState {
  document: DesignDocument;
  currentPageId: string;
  selectedNodeId?: string;
  selectedNodeIds: string[];
  hoveredNodeId?: string;
  canUndo: boolean;
  canRedo: boolean;
  saved: boolean;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  cropMode: boolean;
  animationPreviewProgress?: number;
  textSelection?: { start: number; end: number };
  newDesign: () => void;
  selectPage: (pageId: string) => void;
  addPage: () => void;
  duplicatePage: (pageId?: string) => void;
  deletePage: (pageId?: string) => void;
  updatePageBackground: (paint: Paint) => void;
  updatePageNotes: (notes: string) => void;
  updatePageTransition: (transition: PageTransition) => void;
  updateSelectedAnimation: (
    animation?: Omit<ElementAnimation, "nodeId">,
  ) => void;
  setAnimationPreviewProgress: (progress?: number) => void;
  applyTheme: (theme: Theme) => void;
  applyLayout: (layout: SlideLayout) => void;
  addText: () => void;
  addRect: () => void;
  addEllipse: () => void;
  addLine: () => void;
  addFrame: () => void;
  addTable: () => void;
  addChart: () => void;
  updateTableData: (table: TableNode["table"]) => void;
  updateChartData: (chart: ChartNode["chart"]) => void;
  addImagePlaceholder: () => void;
  insertAsset: (asset: AssetItem, replaceSelected?: boolean) => void;
  selectNode: (nodeId?: string, additive?: boolean) => void;
  selectNodes: (nodeIds: string[]) => void;
  hoverNode: (nodeId?: string) => void;
  updateText: (content: string) => void;
  updateTextNode: (nodeId: string, content: string) => void;
  updateTextStyle: (text: Partial<TextNode["text"]>) => void;
  applyRichTextStyle: (style: Omit<RichTextRun, "start" | "end">) => void;
  setTextSelection: (selection?: { start: number; end: number }) => void;
  toggleBullets: () => void;
  updateFontSize: (fontSize: number) => void;
  updateFillColor: (color: string) => void;
  updateStroke: (color: string, width: number) => void;
  updateOpacity: (opacity: number) => void;
  updateCornerRadius: (cornerRadius: number) => void;
  updateImageFit: (fit: "cover" | "contain" | "stretch") => void;
  updateImageCrop: (crop?: ImageCrop) => void;
  updateShadow: (enabled: boolean) => void;
  updateLocked: (locked: boolean) => void;
  updateVisible: (visible: boolean) => void;
  moveSelected: (x: number, y: number) => void;
  moveSelectionBy: (deltaX: number, deltaY: number) => void;
  resizeSelection: (
    before: Pick<Node["transform"], "x" | "y" | "width" | "height">,
    after: Pick<Node["transform"], "x" | "y" | "width" | "height">,
  ) => void;
  updateSelectedTransform: (transform: Partial<Node["transform"]>) => void;
  alignSelected: (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  distributeSelected: (axis: "horizontal" | "vertical") => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  reorderSelected: (
    placement: "front" | "forward" | "backward" | "back",
  ) => void;
  reorderNode: (parentId: string, nodeId: string, newIndex: number) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: () => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleCropMode: () => void;
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
  selectedNodeIds: [],
  zoom: 1,
  showGrid: true,
  snapToGrid: false,
  cropMode: false,
  animationPreviewProgress: undefined,
  textSelection: undefined,
  newDesign: () => {
    executor = new CommandExecutor({
      sceneGraph: SceneGraph.fromDocument(createBlankDocument()),
    });
    activePageId = executor.toDocument().pages[0]!.id;
    set({
      ...snapshot(),
      selectedNodeId: undefined,
      selectedNodeIds: [],
      hoveredNodeId: undefined,
    });
  },
  selectPage: (pageId) => {
    if (!executor.toDocument().pages.some((page) => page.id === pageId)) return;
    activePageId = pageId;
    set({
      currentPageId: pageId,
      selectedNodeId: undefined,
      selectedNodeIds: [],
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
    set({
      ...snapshot(),
      selectedNodeId: undefined,
      selectedNodeIds: [],
      hoveredNodeId: undefined,
    });
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
    set({
      ...snapshot(),
      selectedNodeId: undefined,
      selectedNodeIds: [],
      hoveredNodeId: undefined,
    });
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
    set({
      ...snapshot(),
      selectedNodeId: undefined,
      selectedNodeIds: [],
      hoveredNodeId: undefined,
    });
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
  updatePageNotes: (notes) => {
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_PAGE",
        payload: { pageId: activePageId, patch: { notes } },
      }),
    );
    set(snapshot());
  },
  updatePageTransition: (transition) => {
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_PAGE",
        payload: { pageId: activePageId, patch: { transition } },
      }),
    );
    set(snapshot());
  },
  updateSelectedAnimation: (animation) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId) return;
    const page = currentPage(executor.toDocument());
    const animations = (page.animations ?? []).filter(
      (item) => item.nodeId !== nodeId,
    );
    if (animation) animations.push({ nodeId, ...animation });
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_PAGE",
        payload: { pageId: page.id, patch: { animations } },
      }),
    );
    set(snapshot());
  },
  setAnimationPreviewProgress: (animationPreviewProgress) =>
    set({ animationPreviewProgress }),
  applyTheme: (theme) => {
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "APPLY_THEME",
        payload: { theme },
      }),
    );
    set(snapshot());
  },
  applyLayout: (layout) => {
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "APPLY_LAYOUT",
        payload: { pageId: activePageId, layout },
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
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
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
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
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
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
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
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
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
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
  },
  addTable: () => {
    const pageId = currentPage(executor.toDocument()).id;
    const node = createTableNode({
      id: id("table"),
      parentId: pageId,
      name: "Table",
      transform: { x: 100, y: 140, width: 600, height: 300 },
    });
    executeCreateNode(pageId, node);
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
  },
  addChart: () => {
    const pageId = currentPage(executor.toDocument()).id;
    const node = createChartNode({
      id: id("chart"),
      parentId: pageId,
      name: "Chart",
      transform: { x: 140, y: 120, width: 520, height: 340 },
    });
    executeCreateNode(pageId, node);
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
  },
  updateTableData: (table) => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || node?.type !== "table" || table.rows.length === 0) return;
    const columnCount = Math.max(...table.rows.map((row) => row.length), 1);
    const rows = table.rows.map((row) =>
      Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
    );
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: {
          nodeId,
          patch: {
            table: {
              ...table,
              rows,
              headerRows: Math.min(rows.length, Math.max(0, table.headerRows)),
            },
          },
        },
      }),
    );
    set(snapshot());
  },
  updateChartData: (chart) => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || node?.type !== "chart" || chart.labels.length === 0) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: {
          nodeId,
          patch: {
            chart: {
              ...chart,
              series: chart.series.map((series) => ({
                ...series,
                values: chart.labels.map(
                  (_, index) => series.values[index] ?? 0,
                ),
              })),
            },
          },
        },
      }),
    );
    set(snapshot());
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
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
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
    set({ ...snapshot(), selectedNodeId: node.id, selectedNodeIds: [node.id] });
  },
  selectNode: (selectedNodeId, additive = false) =>
    set((state) => {
      if (!selectedNodeId)
        return {
          selectedNodeId: undefined,
          selectedNodeIds: [],
          cropMode: false,
          textSelection: undefined,
        };
      if (!additive)
        return {
          selectedNodeId,
          selectedNodeIds: [selectedNodeId],
          cropMode:
            state.cropMode &&
            state.document.nodes[selectedNodeId]?.type === "image",
          textSelection: undefined,
        };
      const selectedNodeIds = state.selectedNodeIds.includes(selectedNodeId)
        ? state.selectedNodeIds.filter((nodeId) => nodeId !== selectedNodeId)
        : [...state.selectedNodeIds, selectedNodeId];
      return {
        selectedNodeId: selectedNodeIds.at(-1),
        selectedNodeIds,
        cropMode: false,
        textSelection: undefined,
      };
    }),
  selectNodes: (selectedNodeIds) =>
    set({
      selectedNodeId: selectedNodeIds.at(-1),
      selectedNodeIds: [...new Set(selectedNodeIds)],
    }),
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
  applyRichTextStyle: (style) => {
    const nodeId = get().selectedNodeId;
    const selection = get().textSelection;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (
      !nodeId ||
      node?.type !== "text" ||
      !selection ||
      selection.start === selection.end
    )
      return;
    const start = Math.max(
      0,
      Math.min(node.text.content.length, selection.start, selection.end),
    );
    const end = Math.max(
      start,
      Math.min(
        node.text.content.length,
        Math.max(selection.start, selection.end),
      ),
    );
    if (start === end) return;
    const runs = mergeRichTextRuns(node.text.runs ?? [], {
      start,
      end,
      ...style,
    });
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { text: { runs } } },
      }),
    );
    set(snapshot());
  },
  setTextSelection: (textSelection) => set({ textSelection }),
  toggleBullets: () => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || node?.type !== "text") return;
    let start = 0;
    const paragraphs = node.text.paragraphs?.some((item) => item.bullet)
      ? []
      : node.text.content.split("\n").map((line) => {
          const paragraph = {
            start,
            end: start + line.length,
            bullet: { type: "unordered" as const, level: 0 },
          };
          start += line.length + 1;
          return paragraph;
        });
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: { nodeId, patch: { text: { paragraphs } } },
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
  updateImageCrop: (crop) => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || node?.type !== "image") return;
    const normalized = crop
      ? {
          x: Math.min(1 - crop.width, Math.max(0, crop.x)),
          y: Math.min(1 - crop.height, Math.max(0, crop.y)),
          width: Math.min(1 - crop.x, Math.max(0.05, crop.width)),
          height: Math.min(1 - crop.y, Math.max(0.05, crop.height)),
        }
      : { x: 0, y: 0, width: 1, height: 1 };
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UPDATE_NODE",
        payload: {
          nodeId,
          patch: { image: { crop: normalized } },
        },
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
    const document = executor.toDocument();
    const node = document.nodes[nodeId];
    if (!node) return;
    const deltaX = x - node.transform.x;
    const deltaY = y - node.transform.y;
    const selectedNodeIds = get().selectedNodeIds;
    executeNodeUpdates(
      selectedNodeIds.map((selectedId) => {
        const selected = document.nodes[selectedId]!;
        return {
          nodeId: selectedId,
          patch: {
            transform: {
              x: selected.transform.x + deltaX,
              y: selected.transform.y + deltaY,
            },
          },
        };
      }),
    );
    set(snapshot());
  },
  moveSelectionBy: (deltaX, deltaY) => {
    const document = executor.toDocument();
    executeNodeUpdates(
      get().selectedNodeIds.map((nodeId) => {
        const node = document.nodes[nodeId]!;
        return {
          nodeId,
          patch: {
            transform: {
              x: node.transform.x + deltaX,
              y: node.transform.y + deltaY,
            },
          },
        };
      }),
    );
    set(snapshot());
  },
  resizeSelection: (before, after) => {
    const document = executor.toDocument();
    const scaleX = after.width / before.width;
    const scaleY = after.height / before.height;
    executeNodeUpdates(
      get().selectedNodeIds.map((nodeId) => {
        const node = document.nodes[nodeId]!;
        return {
          nodeId,
          patch: {
            transform: {
              x: after.x + (node.transform.x - before.x) * scaleX,
              y: after.y + (node.transform.y - before.y) * scaleY,
              width: Math.max(12, node.transform.width * scaleX),
              height: Math.max(12, node.transform.height * scaleY),
            },
          },
        };
      }),
    );
    set(snapshot());
  },
  updateSelectedTransform: (transform) => {
    const nodeId = get().selectedNodeId;
    if (!nodeId || executor.toDocument().nodes[nodeId]?.style.locked) return;
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
  alignSelected: (alignment) => {
    const document = executor.toDocument();
    const nodes = get()
      .selectedNodeIds.map((nodeId) => document.nodes[nodeId])
      .filter((node): node is Node => Boolean(node));
    if (nodes.length < 2 || !sameParent(nodes)) return;
    const bounds = selectionBounds(nodes);
    executeNodeUpdates(
      nodes.map((node) => {
        const transform: Partial<Node["transform"]> = {};
        if (alignment === "left") transform.x = bounds.x;
        if (alignment === "center")
          transform.x = bounds.x + (bounds.width - node.transform.width) / 2;
        if (alignment === "right")
          transform.x = bounds.x + bounds.width - node.transform.width;
        if (alignment === "top") transform.y = bounds.y;
        if (alignment === "middle")
          transform.y = bounds.y + (bounds.height - node.transform.height) / 2;
        if (alignment === "bottom")
          transform.y = bounds.y + bounds.height - node.transform.height;
        return { nodeId: node.id, patch: { transform } };
      }),
    );
    set(snapshot());
  },
  distributeSelected: (axis) => {
    const document = executor.toDocument();
    const nodes = get()
      .selectedNodeIds.map((nodeId) => document.nodes[nodeId])
      .filter((node): node is Node => Boolean(node));
    if (nodes.length < 3 || !sameParent(nodes)) return;
    const horizontal = axis === "horizontal";
    const sorted = [...nodes].sort(
      (left, right) =>
        (horizontal ? left.transform.x : left.transform.y) -
        (horizontal ? right.transform.x : right.transform.y),
    );
    const first = sorted[0]!;
    const last = sorted.at(-1)!;
    const start = horizontal ? first.transform.x : first.transform.y;
    const end = horizontal
      ? last.transform.x + last.transform.width
      : last.transform.y + last.transform.height;
    const totalSize = sorted.reduce(
      (sum, node) =>
        sum + (horizontal ? node.transform.width : node.transform.height),
      0,
    );
    const gap = (end - start - totalSize) / (sorted.length - 1);
    let cursor = start;
    executeNodeUpdates(
      sorted.map((node) => {
        const transform = horizontal ? { x: cursor } : { y: cursor };
        cursor +=
          (horizontal ? node.transform.width : node.transform.height) + gap;
        return { nodeId: node.id, patch: { transform } };
      }),
    );
    set(snapshot());
  },
  groupSelected: () => {
    const nodeIds = get().selectedNodeIds;
    const document = executor.toDocument();
    const nodes = nodeIds
      .map((nodeId) => document.nodes[nodeId])
      .filter((node): node is Node => node !== undefined && !node.style.locked);
    if (nodes.length < 2 || !sameParent(nodes)) return;
    const groupId = id("group");
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "GROUP_NODES",
        payload: { nodeIds, groupId, name: "Group" },
      }),
    );
    set({
      ...snapshot(),
      selectedNodeId: groupId,
      selectedNodeIds: [groupId],
    });
  },
  ungroupSelected: () => {
    const groupId = get().selectedNodeId;
    const group = groupId ? executor.toDocument().nodes[groupId] : undefined;
    if (!groupId || group?.type !== "group") return;
    const childIds = [...group.children];
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "UNGROUP_NODES",
        payload: { groupId },
      }),
    );
    set({
      ...snapshot(),
      selectedNodeId: childIds.at(-1),
      selectedNodeIds: childIds,
    });
  },
  reorderSelected: (placement) => {
    const nodeId = get().selectedNodeId;
    const node = nodeId ? executor.toDocument().nodes[nodeId] : undefined;
    if (!nodeId || !node) return;
    const siblings = executor.getSceneGraph().getChildren(node.parentId);
    const index = siblings.findIndex((candidate) => candidate.id === nodeId);
    const newIndex =
      placement === "front"
        ? siblings.length - 1
        : placement === "back"
          ? 0
          : placement === "forward"
            ? Math.min(siblings.length - 1, index + 1)
            : Math.max(0, index - 1);
    if (newIndex === index) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "REORDER_NODE",
        payload: { parentId: node.parentId, nodeId, newIndex },
      }),
    );
    set(snapshot());
  },
  reorderNode: (parentId, nodeId, newIndex) => {
    const siblings = executor.getSceneGraph().getChildren(parentId);
    const currentIndex = siblings.findIndex((node) => node.id === nodeId);
    if (currentIndex < 0 || currentIndex === newIndex) return;
    executor.execute(
      createCommand({
        ...commandContext(),
        source: "user",
        type: "REORDER_NODE",
        payload: { parentId, nodeId, newIndex },
      }),
    );
    set(snapshot());
  },
  deleteSelected: () => {
    const nodeIds = topLevelSelection(
      executor.toDocument(),
      get().selectedNodeIds,
    ).filter((nodeId) => !executor.toDocument().nodes[nodeId]?.style.locked);
    if (nodeIds.length === 0) return;
    nodeIds.forEach((nodeId) =>
      executor.execute(
        createCommand({
          ...commandContext(),
          source: "user",
          type: "DELETE_NODE",
          payload: { nodeId },
        }),
      ),
    );
    set({
      ...snapshot(),
      selectedNodeId: undefined,
      selectedNodeIds: [],
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
    set({
      ...snapshot(),
      selectedNodeId: duplicate.id,
      selectedNodeIds: [duplicate.id],
    });
  },
  copySelected: () => {
    const document = executor.toDocument();
    const nodeIds = topLevelSelection(document, get().selectedNodeIds);
    if (nodeIds.length > 0) clipboard = { document, nodeIds };
  },
  cutSelected: () => {
    get().copySelected();
    get().deleteSelected();
  },
  pasteClipboard: () => {
    if (!clipboard) return;
    const parentId = currentPage(executor.toDocument()).id;
    const pastedIds = clipboard.nodeIds.map((nodeId) =>
      duplicateNodeTree(clipboard!.document, nodeId, parentId, 20),
    );
    set({
      ...snapshot(),
      selectedNodeId: pastedIds.at(-1),
      selectedNodeIds: pastedIds,
    });
  },
  setZoom: (zoom) =>
    set({ zoom: Math.min(2, Math.max(0.25, Math.round(zoom * 100) / 100)) }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  toggleCropMode: () =>
    set((state) => ({
      cropMode:
        state.document.nodes[state.selectedNodeId ?? ""]?.type === "image"
          ? !state.cropMode
          : false,
    })),
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
      selectedNodeIds: get().selectedNodeIds.filter(
        (nodeId) => next.document.nodes[nodeId],
      ),
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
      selectedNodeIds: get().selectedNodeIds.filter(
        (nodeId) => next.document.nodes[nodeId],
      ),
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
      selectedNodeIds: [],
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
      selectedNodeIds: [],
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

function executeNodeUpdates(
  updates: Array<{ nodeId: string; patch: NodePatch }>,
): void {
  const document = executor.toDocument();
  const editableUpdates = updates.filter(
    ({ nodeId }) => !document.nodes[nodeId]?.style.locked,
  );
  if (editableUpdates.length === 0) return;
  executor.execute(
    createCommand({
      ...commandContext(),
      source: "user",
      type: "UPDATE_NODES",
      payload: { updates: editableUpdates },
    }),
  );
}

function sameParent(nodes: Node[]): boolean {
  return nodes.every((node) => node.parentId === nodes[0]?.parentId);
}

function selectionBounds(nodes: Node[]) {
  const left = Math.min(...nodes.map((node) => node.transform.x));
  const top = Math.min(...nodes.map((node) => node.transform.y));
  const right = Math.max(
    ...nodes.map((node) => node.transform.x + node.transform.width),
  );
  const bottom = Math.max(
    ...nodes.map((node) => node.transform.y + node.transform.height),
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
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
  offset = 0,
): string {
  const source = sourceDocument.nodes[sourceNodeId];
  if (!source) return "";
  const duplicate = structuredClone(source);
  duplicate.id = id(source.type);
  duplicate.parentId = parentId;
  duplicate.transform.x += offset;
  duplicate.transform.y += offset;
  if (duplicate.type === "group" || duplicate.type === "frame") {
    const children = [...duplicate.children];
    duplicate.children = [];
    executeCreateNode(parentId, duplicate);
    children.forEach((childId) =>
      duplicateNodeTree(sourceDocument, childId, duplicate.id),
    );
    return duplicate.id;
  }
  executeCreateNode(parentId, duplicate);
  return duplicate.id;
}

function topLevelSelection(
  document: DesignDocument,
  selectedNodeIds: string[],
): string[] {
  const selected = new Set(selectedNodeIds);
  return selectedNodeIds.filter((nodeId) => {
    let parentId = document.nodes[nodeId]?.parentId;
    while (parentId && document.nodes[parentId]) {
      if (selected.has(parentId)) return false;
      parentId = document.nodes[parentId]?.parentId;
    }
    return Boolean(document.nodes[nodeId]);
  });
}

export const getSelectedNode = (
  document: DesignDocument,
  nodeId?: string,
): Node | undefined => (nodeId ? document.nodes[nodeId] : undefined);

function mergeRichTextRuns(
  current: RichTextRun[],
  applied: RichTextRun,
): RichTextRun[] {
  const result: RichTextRun[] = [];
  current.forEach((run) => {
    if (run.end <= applied.start || run.start >= applied.end) {
      result.push(run);
      return;
    }
    if (run.start < applied.start) result.push({ ...run, end: applied.start });
    if (run.end > applied.end) result.push({ ...run, start: applied.end });
  });
  result.push(applied);
  return result
    .filter((run) => run.start < run.end)
    .sort((left, right) => left.start - right.start);
}
