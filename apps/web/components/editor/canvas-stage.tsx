"use client";

import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { SceneGraph } from "@geekdesign/scene-graph";
import { useEffect, useMemo, useRef, useState } from "react";

import { useEditorStore } from "../../lib/editor-store";

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const dragRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    nextX: number;
    nextY: number;
  }>();
  const [dragPreview, setDragPreview] = useState<{
    nodeId: string;
    x: number;
    y: number;
  }>();
  const renderer = useMemo(() => new Canvas2DRenderer(), []);
  const document = useEditorStore((state) => state.document);
  const sceneGraph = useMemo(() => SceneGraph.fromDocument(document), [document]);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const hoveredNodeId = useEditorStore((state) => state.hoveredNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const hoverNode = useEditorStore((state) => state.hoverNode);
  const moveSelected = useEditorStore((state) => state.moveSelected);

  useEffect(() => {
    if (canvasRef.current && !dragRef.current) {
      renderer.renderDocument(document, canvasRef.current);
    }
  }, [document, renderer]);

  useEffect(
    () => () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * document.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * document.canvas.height,
    };
  };

  const hitNode = (event: React.PointerEvent<HTMLCanvasElement>) =>
    sceneGraph.hitTest(document.pages[0]!.id, pointFromEvent(event));

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event);
    const node = hitNode(event);
    selectNode(node?.id);
    if (node) {
      dragRef.current = {
        nodeId: node.id,
        startX: point.x,
        startY: point.y,
        x: node.transform.x,
        y: node.transform.y,
        nextX: node.transform.x,
        nextY: node.transform.y,
      };
      setDragPreview({ nodeId: node.id, x: node.transform.x, y: node.transform.y });
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      hoverNode(hitNode(event)?.id);
      return;
    }

    const point = pointFromEvent(event);
    drag.nextX = Math.round(drag.x + point.x - drag.startX);
    drag.nextY = Math.round(drag.y + point.y - drag.startY);
    if (frameRef.current !== undefined) return;

    frameRef.current = requestAnimationFrame(() => {
      const activeDrag = dragRef.current;
      const canvas = canvasRef.current;
      frameRef.current = undefined;
      if (!activeDrag || !canvas) return;

      const previewDocument = structuredClone(document);
      const previewNode = previewDocument.nodes[activeDrag.nodeId];
      if (!previewNode) return;
      previewNode.transform.x = activeDrag.nextX;
      previewNode.transform.y = activeDrag.nextY;
      renderer.renderDocument(previewDocument, canvas);
      setDragPreview({
        nodeId: activeDrag.nodeId,
        x: activeDrag.nextX,
        y: activeDrag.nextY,
      });
    });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.nextX !== drag.x || drag.nextY !== drag.y) {
      moveSelected(drag.nextX, drag.nextY);
    }
    dragRef.current = undefined;
    setDragPreview(undefined);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerCancel = () => {
    dragRef.current = undefined;
    setDragPreview(undefined);
    if (canvasRef.current) renderer.renderDocument(document, canvasRef.current);
  };

  const selected = selectedNodeId ? document.nodes[selectedNodeId] : undefined;
  const displayedSelected =
    selected && dragPreview?.nodeId === selected.id
      ? {
          ...selected,
          transform: {
            ...selected.transform,
            x: dragPreview.x,
            y: dragPreview.y,
          },
        }
      : selected;
  const hovered =
    hoveredNodeId && hoveredNodeId !== selectedNodeId
      ? document.nodes[hoveredNodeId]
      : undefined;

  return (
    <div
      className="relative shrink-0 bg-white shadow-2xl shadow-zinc-950/20"
      style={{ width: document.canvas.width, height: document.canvas.height }}
      data-testid="canvas-stage"
    >
      <canvas
        ref={canvasRef}
        className="block cursor-default"
        aria-label="Design canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => hoverNode(undefined)}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
      {hovered ? <NodeOutline node={hovered} color="#a78bfa" /> : null}
      {displayedSelected ? (
        <NodeOutline node={displayedSelected} color="#7c3aed" selected />
      ) : null}
    </div>
  );
}

function NodeOutline({
  node,
  color,
  selected = false,
}: {
  node: { transform: { x: number; y: number; width: number; height: number } };
  color: string;
  selected?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute border-2"
      data-testid={selected ? "selection-box" : undefined}
      data-x={selected ? node.transform.x : undefined}
      data-y={selected ? node.transform.y : undefined}
      style={{
        left: node.transform.x,
        top: node.transform.y,
        width: node.transform.width,
        height: node.transform.height,
        borderColor: color,
      }}
    >
      {selected ? (
        <>
          <span className="absolute -left-1.5 -top-1.5 size-3 rounded-full border-2 border-violet-600 bg-white" />
          <span className="absolute -right-1.5 -top-1.5 size-3 rounded-full border-2 border-violet-600 bg-white" />
          <span className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full border-2 border-violet-600 bg-white" />
          <span className="absolute -bottom-1.5 -right-1.5 size-3 rounded-full border-2 border-violet-600 bg-white" />
        </>
      ) : null}
    </div>
  );
}
