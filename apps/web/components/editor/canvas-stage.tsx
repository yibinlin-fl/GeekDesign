"use client";

import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { SceneGraph } from "@geekdesign/scene-graph";
import { useEffect, useMemo, useRef } from "react";

import { useEditorStore } from "../../lib/editor-store";

export function CanvasStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
  }>();
  const renderer = useMemo(() => new Canvas2DRenderer(), []);
  const document = useEditorStore((state) => state.document);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const hoveredNodeId = useEditorStore((state) => state.hoveredNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const hoverNode = useEditorStore((state) => state.hoverNode);
  const moveSelected = useEditorStore((state) => state.moveSelected);

  useEffect(() => {
    if (canvasRef.current) renderer.renderDocument(document, canvasRef.current);
  }, [document, renderer]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * document.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * document.canvas.height,
    };
  };

  const hitNode = (event: React.PointerEvent<HTMLCanvasElement>) =>
    SceneGraph.fromDocument(document).hitTest(
      document.pages[0]!.id,
      pointFromEvent(event),
    );

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
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointFromEvent(event);
    const nextX = Math.round(drag.x + point.x - drag.startX);
    const nextY = Math.round(drag.y + point.y - drag.startY);
    if (nextX !== drag.x || nextY !== drag.y) moveSelected(nextX, nextY);
    dragRef.current = undefined;
  };

  const selected = selectedNodeId ? document.nodes[selectedNodeId] : undefined;
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
        onPointerMove={(event) => hoverNode(hitNode(event)?.id)}
        onPointerLeave={() => hoverNode(undefined)}
        onPointerUp={onPointerUp}
      />
      {hovered ? <NodeOutline node={hovered} color="#a78bfa" /> : null}
      {selected ? (
        <NodeOutline node={selected} color="#7c3aed" selected />
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
