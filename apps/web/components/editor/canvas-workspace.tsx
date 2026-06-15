"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { localAssetFromFile } from "../../lib/assets";
import { useEditorStore } from "../../lib/editor-store";
import { CanvasStage } from "./canvas-stage";

export function CanvasWorkspace({ children }: { children?: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number }>();
  const [spacePressed, setSpacePressed] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const document = useEditorStore((state) => state.document);
  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const insertAsset = useEditorStore((state) => state.insertAsset);

  const fitCanvas = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setZoom(
      Math.min(
        1.35,
        (viewport.clientWidth - 96) / document.canvas.width,
        (viewport.clientHeight - 96) / document.canvas.height,
      ),
    );
  }, [document.canvas.height, document.canvas.width, setZoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(viewport);
    fitCanvas();
    return () => observer.disconnect();
  }, [fitCanvas]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
        return;
      const store = useEditorStore.getState();
      if (event.code === "Space") {
        event.preventDefault();
        setSpacePressed(true);
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        event.shiftKey ? store.redo() : store.undo();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
        store.duplicateSelected();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        ["+", "="].includes(event.key)
      ) {
        event.preventDefault();
        store.setZoom(store.zoom + 0.1);
      } else if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        store.setZoom(store.zoom - 0.1);
      } else if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        fitCanvas();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        store.deleteSelected();
      } else {
        const offsets: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const offset = offsets[event.key];
        if (!offset || !store.selectedNodeId) return;
        const node = store.document.nodes[store.selectedNodeId];
        if (!node) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        store.moveSelected(
          node.transform.x + offset[0] * step,
          node.transform.y + offset[1] * step,
        );
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
    };
    const blur = () => setSpacePressed(false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
    };
  }, [fitCanvas]);

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || (!spacePressed && event.target !== event.currentTarget))
      return;
    event.preventDefault();
    panRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <section className="relative h-full min-w-0 overflow-hidden bg-[#ececf0]">
      <div className="absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        <ZoomButton label="Zoom out" onClick={() => setZoom(zoom - 0.1)}>
          -
        </ZoomButton>
        <ZoomButton label="Fit canvas" onClick={fitCanvas} wide>
          {Math.round(zoom * 100)}%
        </ZoomButton>
        <ZoomButton label="Zoom in" onClick={() => setZoom(zoom + 0.1)}>
          +
        </ZoomButton>
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        <span className="px-2 text-[11px] font-bold text-zinc-500">Page 1</span>
      </div>
      <div
        ref={viewportRef}
        className={`canvas-grid h-full overflow-auto ${spacePressed ? "cursor-grab" : ""}`}
        data-testid="canvas-viewport"
        onPointerDownCapture={(event) => {
          if (spacePressed) {
            startPan(event);
            event.stopPropagation();
          }
        }}
        onPointerDown={startPan}
        onPointerMove={(event) => {
          const viewport = viewportRef.current;
          const pan = panRef.current;
          if (!viewport || !pan) return;
          viewport.scrollLeft = pan.left - (event.clientX - pan.x);
          viewport.scrollTop = pan.top - (event.clientY - pan.y);
        }}
        onPointerUp={() => {
          panRef.current = undefined;
        }}
        onPointerCancel={() => {
          panRef.current = undefined;
        }}
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          setZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
        }}
        onDragEnter={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setDraggingFile(true);
          }
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files"))
            event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDraggingFile(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDraggingFile(false);
          const file = event.dataTransfer.files[0];
          if (file)
            void localAssetFromFile(file)
              .then((asset) => insertAsset(asset))
              .catch(() => undefined);
        }}
      >
        <div className="grid min-h-full min-w-full place-items-center p-12">
          <div
            style={{
              width: document.canvas.width * zoom,
              height: document.canvas.height * zoom,
            }}
          >
            <div
              style={{
                width: document.canvas.width,
                height: document.canvas.height,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              <CanvasStage />
            </div>
          </div>
        </div>
      </div>
      {draggingFile ? (
        <div className="pointer-events-none absolute inset-5 z-30 grid place-items-center rounded-3xl border-2 border-dashed border-violet-500 bg-violet-500/10 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-8 py-5 text-center shadow-xl">
            <p className="font-black text-violet-700">Drop image onto canvas</p>
            <p className="mt-1 text-xs text-zinc-500">
              PNG, JPEG, WebP, or SVG up to 10 MB
            </p>
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
  wide = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      className={`${wide ? "min-w-14" : ""} rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100`}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}
