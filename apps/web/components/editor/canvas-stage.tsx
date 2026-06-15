"use client";

import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { SceneGraph } from "@geekdesign/scene-graph";
import type { Node, TextNode, Transform } from "@geekdesign/design-schema";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrowserImageCache } from "../../lib/browser-image-cache";
import { useEditorStore } from "../../lib/editor-store";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type Interaction =
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
  const sceneGraph = useMemo(
    () => SceneGraph.fromDocument(document),
    [document],
  );
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const hoveredNodeId = useEditorStore((state) => state.hoveredNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const hoverNode = useEditorStore((state) => state.hoverNode);
  const updateSelectedTransform = useEditorStore(
    (state) => state.updateSelectedTransform,
  );
  const updateTextNode = useEditorStore((state) => state.updateTextNode);

  useEffect(() => {
    if (canvasRef.current && !interactionRef.current) {
      if (editing) {
        const previewDocument = structuredClone(document);
        const node = previewDocument.nodes[editing.nodeId];
        if (node?.type === "text") node.text.content = "";
        renderer.renderDocument(previewDocument, canvasRef.current);
      } else {
        renderer.renderDocument(document, canvasRef.current);
      }
    }
  }, [assetVersion, document, editing, renderer]);

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

  const hitNode = (point: Point) =>
    sceneGraph.hitTest(document.pages[0]!.id, point);

  const onCanvasPointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const point = pointFromClient(event.clientX, event.clientY);
    const node = hitNode(point);
    selectNode(node?.id);
    if (editing) return;
    if (!node) return;
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

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) {
      const point = pointFromClient(event.clientX, event.clientY);
      hoverNode(hitNode(point)?.id);
      return;
    }

    const point = pointFromClient(event.clientX, event.clientY);
    let next = interaction.start;
    if (interaction.type === "move") {
      next = {
        ...interaction.start,
        x: Math.round(interaction.start.x + point.x - interaction.startPoint.x),
        y: Math.round(interaction.start.y + point.y - interaction.startPoint.y),
      };
    } else if (interaction.type === "resize") {
      next = resizeTransform(
        interaction.start,
        interaction.handle,
        point.x - interaction.startPoint.x,
        point.y - interaction.startPoint.y,
        event.shiftKey,
      );
    } else {
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
    }

    previewRef.current = next;
    if (frameRef.current !== undefined) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const active = interactionRef.current;
      const canvas = canvasRef.current;
      const nextPreview = previewRef.current;
      if (!active || !canvas || !nextPreview) return;
      const previewDocument = structuredClone(document);
      const previewNode = previewDocument.nodes[active.nodeId];
      if (!previewNode) return;
      previewNode.transform = nextPreview;
      renderer.renderDocument(previewDocument, canvas);
      setPreview(nextPreview);
    });
  };

  const finishInteraction = () => {
    const interaction = interactionRef.current;
    const next = previewRef.current;
    if (!interaction || !next) return;
    interactionRef.current = undefined;
    previewRef.current = undefined;
    setPreview(undefined);
    if (!sameTransform(interaction.start, next)) {
      updateSelectedTransform(next);
    } else if (canvasRef.current) {
      renderer.renderDocument(document, canvasRef.current);
    }
  };

  const cancelInteraction = () => {
    interactionRef.current = undefined;
    previewRef.current = undefined;
    setPreview(undefined);
    if (canvasRef.current) renderer.renderDocument(document, canvasRef.current);
  };

  const selected = selectedNodeId ? document.nodes[selectedNodeId] : undefined;
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
      {displayedSelected && !editing ? (
        <NodeOutline
          node={displayedSelected}
          color="#7c3aed"
          selected
          onResize={startResize}
          onRotate={startRotate}
        />
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
        />
      ) : null}
    </div>
  );
}

function InlineTextEditor({
  node,
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  node: TextNode;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
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
