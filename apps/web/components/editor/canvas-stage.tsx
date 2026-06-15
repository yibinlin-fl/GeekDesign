"use client";

import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { SceneGraph } from "@geekdesign/scene-graph";
import type {
  ImageCrop,
  ImageNode,
  Node,
  TextNode,
  Transform,
} from "@geekdesign/design-schema";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrowserImageCache } from "../../lib/browser-image-cache";
import { useEditorStore } from "../../lib/editor-store";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type Interaction =
  | {
      type: "marquee";
      startPoint: Point;
    }
  | {
      type: "multiResize";
      startPoint: Point;
      start: Transform;
    }
  | {
      type: "move";
      nodeId: string;
      startPoint: Point;
      start: Transform;
    }
  | {
      type: "resize";
      nodeId: string;
      handle: Handle;
      startPoint: Point;
      start: Transform;
    }
  | {
      type: "rotate";
      nodeId: string;
      center: Point;
      startAngle: number;
      start: Transform;
    }
  | {
      type: "crop";
      nodeId: string;
      startPoint: Point;
      start: ImageCrop;
    };

interface Point {
  x: number;
  y: number;
}

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  const interactionRef = useRef<Interaction>();
  const previewRef = useRef<Transform>();
  const [preview, setPreview] = useState<Transform>();
  const [cropPreview, setCropPreview] = useState<ImageCrop>();
  const [marquee, setMarquee] = useState<{ start: Point; end: Point }>();
  const [contextMenu, setContextMenu] = useState<Point>();
  const [editing, setEditing] = useState<{
    nodeId: string;
    initial: string;
    draft: string;
  }>();
  const [assetVersion, setAssetVersion] = useState(0);
  const imageCache = useMemo(
    () =>
      new BrowserImageCache(() => setAssetVersion((version) => version + 1)),
    [],
  );
  const renderer = useMemo(
    () => new Canvas2DRenderer({ imageCache }),
    [imageCache],
  );
  const document = useEditorStore((state) => state.document);
  const currentPageId = useEditorStore((state) => state.currentPageId);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const cropMode = useEditorStore((state) => state.cropMode);
  const animationPreviewProgress = useEditorStore(
    (state) => state.animationPreviewProgress,
  );
  const sceneGraph = useMemo(
    () => SceneGraph.fromDocument(document),
    [document],
  );
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds);
  const hoveredNodeId = useEditorStore((state) => state.hoveredNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectNodes = useEditorStore((state) => state.selectNodes);
  const hoverNode = useEditorStore((state) => state.hoverNode);
  const updateSelectedTransform = useEditorStore(
    (state) => state.updateSelectedTransform,
  );
  const moveSelectionBy = useEditorStore((state) => state.moveSelectionBy);
  const resizeSelection = useEditorStore((state) => state.resizeSelection);
  const updateTextNode = useEditorStore((state) => state.updateTextNode);
  const setTextSelection = useEditorStore((state) => state.setTextSelection);
  const updateImageCrop = useEditorStore((state) => state.updateImageCrop);
  const copySelected = useEditorStore((state) => state.copySelected);
  const cutSelected = useEditorStore((state) => state.cutSelected);
  const pasteClipboard = useEditorStore((state) => state.pasteClipboard);
  const groupSelected = useEditorStore((state) => state.groupSelected);
  const ungroupSelected = useEditorStore((state) => state.ungroupSelected);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);

  useEffect(() => {
    if (canvasRef.current && !interactionRef.current) {
      if (animationPreviewProgress !== undefined) {
        const previewDocument = animatedDocument(
          document,
          currentPageId,
          animationPreviewProgress,
        );
        renderPage(renderer, previewDocument, canvasRef.current, currentPageId);
      } else if (editing) {
        const previewDocument = structuredClone(document);
        const node = previewDocument.nodes[editing.nodeId];
        if (node?.type === "text") {
          node.text.content = "";
          node.text.runs = [];
          node.text.paragraphs = [];
        }
        renderPage(renderer, previewDocument, canvasRef.current, currentPageId);
      } else {
        renderPage(renderer, document, canvasRef.current, currentPageId);
      }
    }
  }, [
    animationPreviewProgress,
    assetVersion,
    currentPageId,
    document,
    editing,
    renderer,
  ]);

  useEffect(
    () => () => {
      if (frameRef.current !== undefined)
        cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const pointFromClient = (clientX: number, clientY: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * document.canvas.width,
      y: ((clientY - rect.top) / rect.height) * document.canvas.height,
    };
  };

  const hitNode = (point: Point) => sceneGraph.hitTest(currentPageId, point);

  const onCanvasPointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    setContextMenu(undefined);
    const point = pointFromClient(event.clientX, event.clientY);
    const node = hitNode(point);
    if (event.shiftKey) {
      selectNode(node?.id, true);
      return;
    }
    if (!node) {
      selectNode(undefined);
      interactionRef.current = { type: "marquee", startPoint: point };
      setMarquee({ start: point, end: point });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (!selectedNodeIds.includes(node.id)) selectNode(node.id);
    if (editing) return;
    interactionRef.current = {
      type: "move",
      nodeId: node.id,
      startPoint: point,
      start: structuredClone(node.transform),
    };
    previewRef.current = structuredClone(node.transform);
    setPreview(previewRef.current);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onCanvasDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = pointFromClient(event.clientX, event.clientY);
    const node = hitNode(point);
    if (node?.type !== "text" || node.style.locked) return;
    selectNode(node.id);
    setEditing({
      nodeId: node.id,
      initial: node.text.content,
      draft: node.text.content,
    });
    setTextSelection({ start: 0, end: node.text.content.length });
  };

  const finishTextEditing = (commit: boolean) => {
    if (!editing) return;
    const next = editing.draft;
    const initial = editing.initial;
    setEditing(undefined);
    if (commit && next !== initial) updateTextNode(editing.nodeId, next);
  };

  const startResize = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: Node,
    handle: Handle,
  ) => {
    event.stopPropagation();
    interactionRef.current = {
      type: "resize",
      nodeId: node.id,
      handle,
      startPoint: pointFromClient(event.clientX, event.clientY),
      start: structuredClone(node.transform),
    };
    previewRef.current = structuredClone(node.transform);
    setPreview(previewRef.current);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startRotate = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: Node,
  ) => {
    event.stopPropagation();
    const center = {
      x: node.transform.x + node.transform.width / 2,
      y: node.transform.y + node.transform.height / 2,
    };
    const point = pointFromClient(event.clientX, event.clientY);
    interactionRef.current = {
      type: "rotate",
      nodeId: node.id,
      center,
      startAngle: angle(center, point),
      start: structuredClone(node.transform),
    };
    previewRef.current = structuredClone(node.transform);
    setPreview(previewRef.current);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startMultiResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const bounds = boundsTransform(selectedNodes);
    interactionRef.current = {
      type: "multiResize",
      startPoint: pointFromClient(event.clientX, event.clientY),
      start: bounds,
    };
    previewRef.current = bounds;
    setPreview(bounds);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startCrop = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: ImageNode,
  ) => {
    event.stopPropagation();
    const crop = node.image.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    interactionRef.current = {
      type: "crop",
      nodeId: node.id,
      startPoint: pointFromClient(event.clientX, event.clientY),
      start: structuredClone(crop),
    };
    setCropPreview(crop);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) {
      const point = pointFromClient(event.clientX, event.clientY);
      hoverNode(hitNode(point)?.id);
      return;
    }

    const point = pointFromClient(event.clientX, event.clientY);
    if (interaction.type === "marquee") {
      setMarquee({ start: interaction.startPoint, end: point });
      return;
    }
    if (interaction.type === "crop") {
      const node = document.nodes[interaction.nodeId];
      if (node?.type !== "image") return;
      const deltaX =
        (point.x - interaction.startPoint.x) / node.transform.width;
      const deltaY =
        (point.y - interaction.startPoint.y) / node.transform.height;
      setCropPreview({
        ...interaction.start,
        x: Math.min(
          1 - interaction.start.width,
          Math.max(0, interaction.start.x + deltaX),
        ),
        y: Math.min(
          1 - interaction.start.height,
          Math.max(0, interaction.start.y + deltaY),
        ),
      });
      return;
    }
    let next = interaction.start;
    if (interaction.type === "move") {
      next = {
        ...interaction.start,
        x: snapValue(
          interaction.start.x + point.x - interaction.startPoint.x,
          snapToGrid,
        ),
        y: snapValue(
          interaction.start.y + point.y - interaction.startPoint.y,
          snapToGrid,
        ),
      };
    } else if (interaction.type === "resize") {
      next = resizeTransform(
        interaction.start,
        interaction.handle,
        point.x - interaction.startPoint.x,
        point.y - interaction.startPoint.y,
        event.shiftKey,
      );
    } else if (interaction.type === "rotate") {
      const rotation =
        interaction.start.rotation +
        angle(interaction.center, point) -
        interaction.startAngle;
      next = {
        ...interaction.start,
        rotation:
          Math.round(event.shiftKey ? rotation / 15 : rotation) *
          (event.shiftKey ? 15 : 1),
      };
    } else {
      next = {
        ...interaction.start,
        width: Math.max(
          24,
          interaction.start.width + point.x - interaction.startPoint.x,
        ),
        height: Math.max(
          24,
          interaction.start.height + point.y - interaction.startPoint.y,
        ),
      };
    }

    previewRef.current = next;
    if (frameRef.current !== undefined) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const active = interactionRef.current;
      const canvas = canvasRef.current;
      const nextPreview = previewRef.current;
      if (!active || active.type === "marquee" || !canvas || !nextPreview)
        return;
      const overrides = new Map<string, Transform>();
      if (active.type === "multiResize") {
        applyScaledPreview(
          document,
          selectedNodeIds,
          active.start,
          nextPreview,
        ).forEach((transform, nodeId) => overrides.set(nodeId, transform));
      } else if (active.type === "move" && selectedNodeIds.length > 1) {
        const deltaX = nextPreview.x - active.start.x;
        const deltaY = nextPreview.y - active.start.y;
        selectedNodeIds.forEach((nodeId) => {
          const node = document.nodes[nodeId];
          if (!node) return;
          overrides.set(nodeId, {
            ...node.transform,
            x: node.transform.x + deltaX,
            y: node.transform.y + deltaY,
          });
        });
      } else {
        overrides.set(active.nodeId, nextPreview);
      }
      renderer.renderPreview(document, canvas, currentPageId, overrides);
      setPreview(nextPreview);
    });
  };

  const finishInteraction = () => {
    const interaction = interactionRef.current;
    if (interaction?.type === "marquee") {
      const box = marquee
        ? boxFromPoints(marquee.start, marquee.end)
        : undefined;
      interactionRef.current = undefined;
      setMarquee(undefined);
      if (box) {
        const page = document.pages.find((item) => item.id === currentPageId);
        selectNodes(
          (page?.children ?? []).filter((nodeId) => {
            const node = document.nodes[nodeId];
            return node ? intersects(box, node.transform) : false;
          }),
        );
      }
      return;
    }
    if (interaction?.type === "crop") {
      interactionRef.current = undefined;
      if (cropPreview && !sameCrop(interaction.start, cropPreview))
        updateImageCrop(cropPreview);
      setCropPreview(undefined);
      return;
    }
    const next = previewRef.current;
    if (!interaction || !next) return;
    interactionRef.current = undefined;
    previewRef.current = undefined;
    setPreview(undefined);
    setCropPreview(undefined);
    setMarquee(undefined);
    if (!sameTransform(interaction.start, next)) {
      if (interaction.type === "multiResize") {
        resizeSelection(interaction.start, next);
      } else if (interaction.type === "move" && selectedNodeIds.length > 1) {
        moveSelectionBy(
          next.x - interaction.start.x,
          next.y - interaction.start.y,
        );
      } else {
        updateSelectedTransform(next);
      }
    } else if (canvasRef.current) {
      renderPage(renderer, document, canvasRef.current, currentPageId);
    }
  };

  const cancelInteraction = () => {
    interactionRef.current = undefined;
    previewRef.current = undefined;
    setPreview(undefined);
    if (canvasRef.current)
      renderPage(renderer, document, canvasRef.current, currentPageId);
  };

  const selected = selectedNodeId ? document.nodes[selectedNodeId] : undefined;
  const selectedNodes = selectedNodeIds
    .map((nodeId) => document.nodes[nodeId])
    .filter((node): node is Node => Boolean(node));
  const displayedSelected =
    selected && preview
      ? { ...selected, transform: { ...selected.transform, ...preview } }
      : selected;
  const hovered =
    hoveredNodeId && hoveredNodeId !== selectedNodeId
      ? document.nodes[hoveredNodeId]
      : undefined;

  return (
    <div
      ref={stageRef}
      className="relative shrink-0 touch-none bg-white shadow-[0_20px_60px_rgba(39,39,42,0.24)] ring-1 ring-zinc-950/10"
      style={{ width: document.canvas.width, height: document.canvas.height }}
      data-testid="canvas-stage"
      onPointerMove={onPointerMove}
      onPointerUp={finishInteraction}
      onPointerCancel={cancelInteraction}
      onContextMenu={(event) => {
        event.preventDefault();
        const point = pointFromClient(event.clientX, event.clientY);
        const node = hitNode(point);
        if (node && !selectedNodeIds.includes(node.id)) selectNode(node.id);
        setContextMenu(point);
      }}
    >
      <canvas
        ref={canvasRef}
        className="block cursor-default"
        aria-label="Design canvas"
        onPointerDown={onCanvasPointerDown}
        onDoubleClick={onCanvasDoubleClick}
        onPointerLeave={() => {
          if (!interactionRef.current) hoverNode(undefined);
        }}
      />
      {hovered ? <NodeOutline node={hovered} color="#a78bfa" /> : null}
      {selectedNodes.length > 1 && !editing
        ? selectedNodes.map((node) => (
            <NodeOutline key={node.id} node={node} color="#a78bfa" />
          ))
        : null}
      {selectedNodes.length > 1 && !editing ? (
        <SelectionBounds nodes={selectedNodes} onResize={startMultiResize} />
      ) : null}
      {marquee ? (
        <MarqueeSelection start={marquee.start} end={marquee.end} />
      ) : null}
      {displayedSelected && selectedNodes.length === 1 && !editing ? (
        cropMode && displayedSelected.type === "image" ? (
          <CropOverlay
            node={displayedSelected}
            crop={cropPreview ?? displayedSelected.image.crop}
            onPointerDown={startCrop}
          />
        ) : (
          <NodeOutline
            node={displayedSelected}
            color="#7c3aed"
            selected={
              !displayedSelected.style.locked && displayedSelected.style.visible
            }
            onResize={startResize}
            onRotate={startRotate}
          />
        )
      ) : null}
      {editing ? (
        <InlineTextEditor
          node={document.nodes[editing.nodeId] as TextNode}
          value={editing.draft}
          onChange={(draft) =>
            setEditing((current) => (current ? { ...current, draft } : current))
          }
          onCommit={() => finishTextEditing(true)}
          onCancel={() => finishTextEditing(false)}
          onSelectionChange={setTextSelection}
        />
      ) : null}
      {contextMenu ? (
        <ContextMenu
          point={contextMenu}
          multiple={selectedNodeIds.length > 1}
          groupSelected={groupSelected}
          ungroupSelected={ungroupSelected}
          copySelected={copySelected}
          cutSelected={cutSelected}
          pasteClipboard={pasteClipboard}
          deleteSelected={deleteSelected}
          close={() => setContextMenu(undefined)}
        />
      ) : null}
    </div>
  );
}

function CropOverlay({
  node,
  crop = { x: 0, y: 0, width: 1, height: 1 },
  onPointerDown,
}: {
  node: ImageNode;
  crop?: ImageCrop;
  onPointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: ImageNode,
  ) => void;
}) {
  return (
    <div
      className="pointer-events-none absolute border-2 border-dashed border-white bg-black/35 outline outline-2 outline-violet-600"
      style={{
        left: node.transform.x,
        top: node.transform.y,
        width: node.transform.width,
        height: node.transform.height,
        transform: `rotate(${node.transform.rotation}deg)`,
        transformOrigin: "top left",
      }}
      data-testid="crop-overlay"
    >
      <button
        className="pointer-events-auto absolute cursor-move border-2 border-violet-500 bg-white/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]"
        style={{
          left: crop.x * node.transform.width,
          top: crop.y * node.transform.height,
          width: crop.width * node.transform.width,
          height: crop.height * node.transform.height,
        }}
        onPointerDown={(event) => onPointerDown(event, node)}
        aria-label="Drag image crop region"
      />
      <span className="absolute -top-8 left-0 rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-black text-white">
        Drag crop region
      </span>
    </div>
  );
}

function ContextMenu({
  point,
  multiple,
  groupSelected,
  ungroupSelected,
  copySelected,
  cutSelected,
  pasteClipboard,
  deleteSelected,
  close,
}: {
  point: Point;
  multiple: boolean;
  groupSelected: () => void;
  ungroupSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: () => void;
  deleteSelected: () => void;
  close: () => void;
}) {
  const actions = [
    ["Copy", copySelected],
    ["Cut", cutSelected],
    ["Paste", pasteClipboard],
    ...(multiple ? ([["Group", groupSelected]] as const) : []),
    ["Ungroup", ungroupSelected],
    ["Delete", deleteSelected],
  ] as const;
  return (
    <div
      className="absolute z-40 min-w-32 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl"
      style={{ left: point.x, top: point.y }}
      data-testid="canvas-context-menu"
    >
      {actions.map(([label, action]) => (
        <button
          key={label}
          className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-zinc-600 hover:bg-violet-50 hover:text-violet-700"
          onClick={() => {
            action();
            close();
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MarqueeSelection({ start, end }: { start: Point; end: Point }) {
  const box = boxFromPoints(start, end);
  return (
    <div
      className="pointer-events-none absolute border border-violet-500 bg-violet-500/10"
      style={box}
      data-testid="marquee-selection"
    />
  );
}

function SelectionBounds({
  nodes,
  onResize,
}: {
  nodes: Node[];
  onResize: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const left = Math.min(...nodes.map((node) => node.transform.x));
  const top = Math.min(...nodes.map((node) => node.transform.y));
  const right = Math.max(
    ...nodes.map((node) => node.transform.x + node.transform.width),
  );
  const bottom = Math.max(
    ...nodes.map((node) => node.transform.y + node.transform.height),
  );
  return (
    <div
      className="pointer-events-none absolute border-2 border-dashed border-violet-600"
      style={{ left, top, width: right - left, height: bottom - top }}
      data-testid="multi-selection-box"
      data-count={nodes.length}
    >
      <span className="absolute -top-7 left-0 rounded-md bg-violet-600 px-2 py-1 text-[10px] font-black text-white">
        {nodes.length} selected
      </span>
      <button
        className="pointer-events-auto absolute -bottom-1.5 -right-1.5 size-3 cursor-nwse-resize rounded-sm border-2 border-violet-600 bg-white shadow-sm"
        aria-label="Resize multi-selection"
        onPointerDown={onResize}
      />
    </div>
  );
}

function InlineTextEditor({
  node,
  value,
  onChange,
  onCommit,
  onCancel,
  onSelectionChange,
}: {
  node: TextNode;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onSelectionChange: (selection: { start: number; end: number }) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const color =
    node.style.fill?.type === "solid" ? node.style.fill.color : "#18181b";
  return (
    <textarea
      ref={ref}
      className="absolute z-20 resize-none overflow-hidden border-2 border-violet-500 bg-white/90 p-0 outline-none"
      style={{
        left: node.transform.x,
        top: node.transform.y,
        width: node.transform.width,
        height: node.transform.height,
        transform: `rotate(${node.transform.rotation}deg)`,
        transformOrigin: "top left",
        color,
        fontFamily: node.text.fontFamily,
        fontSize: node.text.fontSize,
        fontWeight: node.text.fontWeight,
        lineHeight: node.text.lineHeight,
        letterSpacing: node.text.letterSpacing,
        textAlign:
          node.text.textAlign === "justify" ? "left" : node.text.textAlign,
      }}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onSelect={(event) =>
        onSelectionChange({
          start: event.currentTarget.selectionStart,
          end: event.currentTarget.selectionEnd,
        })
      }
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }
      }}
      aria-label="Inline text editor"
      data-testid="inline-text-editor"
    />
  );
}

function NodeOutline({
  node,
  color,
  selected = false,
  onResize,
  onRotate,
}: {
  node: Node;
  color: string;
  selected?: boolean;
  onResize?: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: Node,
    handle: Handle,
  ) => void;
  onRotate?: (event: React.PointerEvent<HTMLButtonElement>, node: Node) => void;
}) {
  return (
    <div
      className="pointer-events-none absolute border-2"
      data-testid={selected ? "selection-box" : undefined}
      data-x={selected ? Math.round(node.transform.x) : undefined}
      data-y={selected ? Math.round(node.transform.y) : undefined}
      data-width={selected ? Math.round(node.transform.width) : undefined}
      data-height={selected ? Math.round(node.transform.height) : undefined}
      data-rotation={selected ? Math.round(node.transform.rotation) : undefined}
      style={{
        left: node.transform.x,
        top: node.transform.y,
        width: node.transform.width,
        height: node.transform.height,
        borderColor: color,
        transform: `rotate(${node.transform.rotation}deg)`,
        transformOrigin: "top left",
      }}
    >
      {selected ? (
        <>
          <span className="absolute -top-7 left-1/2 h-6 w-px -translate-x-1/2 bg-violet-600" />
          <button
            className="pointer-events-auto absolute -top-10 left-1/2 size-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-violet-600 bg-white shadow-sm active:cursor-grabbing"
            aria-label="Rotate selection"
            onPointerDown={(event) => onRotate?.(event, node)}
          />
          {handles.map(({ handle, className, cursor }) => (
            <button
              key={handle}
              className={`pointer-events-auto absolute size-3 rounded-sm border-2 border-violet-600 bg-white shadow-sm ${className} ${cursor}`}
              aria-label={`Resize ${handle}`}
              onPointerDown={(event) => onResize?.(event, node, handle)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

const handles: Array<{ handle: Handle; className: string; cursor: string }> = [
  {
    handle: "nw",
    className: "-left-1.5 -top-1.5",
    cursor: "cursor-nwse-resize",
  },
  {
    handle: "n",
    className: "-top-1.5 left-1/2 -translate-x-1/2",
    cursor: "cursor-ns-resize",
  },
  {
    handle: "ne",
    className: "-right-1.5 -top-1.5",
    cursor: "cursor-nesw-resize",
  },
  {
    handle: "e",
    className: "-right-1.5 top-1/2 -translate-y-1/2",
    cursor: "cursor-ew-resize",
  },
  {
    handle: "se",
    className: "-bottom-1.5 -right-1.5",
    cursor: "cursor-nwse-resize",
  },
  {
    handle: "s",
    className: "-bottom-1.5 left-1/2 -translate-x-1/2",
    cursor: "cursor-ns-resize",
  },
  {
    handle: "sw",
    className: "-bottom-1.5 -left-1.5",
    cursor: "cursor-nesw-resize",
  },
  {
    handle: "w",
    className: "-left-1.5 top-1/2 -translate-y-1/2",
    cursor: "cursor-ew-resize",
  },
];

function resizeTransform(
  start: Transform,
  handle: Handle,
  deltaX: number,
  deltaY: number,
  lockRatio: boolean,
): Transform {
  let x = start.x;
  let y = start.y;
  let width = start.width;
  let height = start.height;
  if (handle.includes("e")) width += deltaX;
  if (handle.includes("s")) height += deltaY;
  if (handle.includes("w")) {
    width -= deltaX;
    x += deltaX;
  }
  if (handle.includes("n")) {
    height -= deltaY;
    y += deltaY;
  }

  if (lockRatio && handle.length === 2) {
    const ratio = start.width / start.height;
    if (Math.abs(width - start.width) > Math.abs(height - start.height)) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
    if (handle.includes("w")) x = start.x + start.width - width;
    if (handle.includes("n")) y = start.y + start.height - height;
  }

  const minSize = 12;
  if (width < minSize) {
    if (handle.includes("w")) x = start.x + start.width - minSize;
    width = minSize;
  }
  if (height < minSize) {
    if (handle.includes("n")) y = start.y + start.height - minSize;
    height = minSize;
  }
  return {
    ...start,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

const angle = (center: Point, point: Point) =>
  (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;

const sameTransform = (left: Transform, right: Transform) =>
  Object.keys(left).every(
    (key) => left[key as keyof Transform] === right[key as keyof Transform],
  );

const sameCrop = (left: ImageCrop, right: ImageCrop) =>
  left.x === right.x &&
  left.y === right.y &&
  left.width === right.width &&
  left.height === right.height;

const boxFromPoints = (start: Point, end: Point) => ({
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

const intersects = (
  box: ReturnType<typeof boxFromPoints>,
  transform: Transform,
) =>
  box.left <= transform.x + transform.width &&
  box.left + box.width >= transform.x &&
  box.top <= transform.y + transform.height &&
  box.top + box.height >= transform.y;

const snapValue = (value: number, enabled: boolean) =>
  enabled ? Math.round(value / 10) * 10 : Math.round(value);

function boundsTransform(nodes: Node[]): Transform {
  const left = Math.min(...nodes.map((node) => node.transform.x));
  const top = Math.min(...nodes.map((node) => node.transform.y));
  const right = Math.max(
    ...nodes.map((node) => node.transform.x + node.transform.width),
  );
  const bottom = Math.max(
    ...nodes.map((node) => node.transform.y + node.transform.height),
  );
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

function applyScaledPreview(
  document: ReturnType<typeof useEditorStore.getState>["document"],
  nodeIds: string[],
  before: Transform,
  after: Transform,
): Map<string, Transform> {
  const result = new Map<string, Transform>();
  const scaleX = after.width / before.width;
  const scaleY = after.height / before.height;
  nodeIds.forEach((nodeId) => {
    const node = document.nodes[nodeId];
    if (!node) return;
    result.set(nodeId, {
      ...node.transform,
      x: after.x + (node.transform.x - before.x) * scaleX,
      y: after.y + (node.transform.y - before.y) * scaleY,
      width: node.transform.width * scaleX,
      height: node.transform.height * scaleY,
    });
  });
  return result;
}

function renderPage(
  renderer: Canvas2DRenderer,
  document: ReturnType<typeof useEditorStore.getState>["document"],
  canvas: HTMLCanvasElement,
  pageId: string,
) {
  renderer.renderDocument(document, canvas);
  renderer.renderPage(pageId);
}

function animatedDocument(
  document: ReturnType<typeof useEditorStore.getState>["document"],
  pageId: string,
  progress: number,
) {
  const preview = structuredClone(document);
  const page = preview.pages.find((item) => item.id === pageId);
  const animations = page?.animations ?? [];
  const totalMs = Math.max(
    1,
    ...animations.map((animation) => animation.delayMs + animation.durationMs),
  );
  const currentMs = Math.min(1, Math.max(0, progress)) * totalMs;
  animations.forEach((animation) => {
    const node = preview.nodes[animation.nodeId];
    if (!node) return;
    const local = Math.min(
      1,
      Math.max(0, (currentMs - animation.delayMs) / animation.durationMs),
    );
    node.style.opacity *= local;
    if (animation.effect === "zoom-in") {
      node.transform.scaleX *= 0.7 + local * 0.3;
      node.transform.scaleY *= 0.7 + local * 0.3;
    }
    if (animation.effect === "fly-in") {
      const distance = (1 - local) * 80;
      if (animation.direction === "right") node.transform.x += distance;
      else if (animation.direction === "up") node.transform.y -= distance;
      else if (animation.direction === "down") node.transform.y += distance;
      else node.transform.x -= distance;
    }
  });
  return preview;
}
