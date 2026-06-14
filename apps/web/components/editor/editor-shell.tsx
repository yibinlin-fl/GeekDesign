"use client";

import type { Node } from "@geekdesign/design-schema";
import Link from "next/link";
import { useEffect } from "react";

import { getSelectedNode, useEditorStore } from "../../lib/editor-store";
import { AssetPanel } from "./asset-panel";
import { CanvasStage } from "./canvas-stage";
import { ExportControls } from "./export-controls";

const buttonClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40";

export function EditorShell() {
  const store = useEditorStore();
  const selected = getSelectedNode(store.document, store.selectedNodeId);

  useEffect(() => {
    store.load();
    // Loading once on mount is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex h-screen min-w-[1100px] flex-col overflow-hidden bg-zinc-100">
      <header className="flex h-16 items-center gap-3 border-b border-zinc-200 bg-white px-4">
        <Link
          href="/"
          className="mr-3 text-lg font-black tracking-tight text-violet-700"
        >
          GeekDesign
        </Link>
        <button className={buttonClass} onClick={store.newDesign}>
          New design
        </button>
        <button
          className={buttonClass}
          onClick={store.undo}
          disabled={!store.canUndo}
          aria-label="Undo"
        >
          Undo
        </button>
        <button
          className={buttonClass}
          onClick={store.redo}
          disabled={!store.canRedo}
          aria-label="Redo"
        >
          Redo
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {store.saved ? "Saved locally" : "Unsaved changes"}
          </span>
          <button className={buttonClass} onClick={store.save}>
            Save
          </button>
          <button className={buttonClass} onClick={store.load}>
            Load
          </button>
          <ExportControls />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="border-r border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Add
          </h2>
          <div className="grid gap-2">
            <button className={buttonClass} onClick={store.addText}>
              Add text
            </button>
            <button className={buttonClass} onClick={store.addRect}>
              Add rectangle
            </button>
            <button className={buttonClass} onClick={store.addImagePlaceholder}>
              Add image placeholder
            </button>
          </div>
          <AssetPanel />
          <h2 className="mb-3 mt-7 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Layers
          </h2>
          <div className="space-y-1" data-testid="layers-list">
            {[...store.document.pages[0]!.children].reverse().map((nodeId) => {
              const node = store.document.nodes[nodeId]!;
              return (
                <button
                  key={node.id}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    store.selectedNodeId === node.id
                      ? "bg-violet-100 text-violet-800"
                      : "hover:bg-zinc-100"
                  }`}
                  onClick={() => store.selectNode(node.id)}
                >
                  <span className="text-xs uppercase text-zinc-400">
                    {node.type}
                  </span>
                  <span className="truncate">{layerName(node)}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="overflow-auto bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[size:20px_20px] p-12">
          <div className="mx-auto w-fit">
            <CanvasStage />
          </div>
        </section>

        <aside className="overflow-y-auto border-l border-zinc-200 bg-white p-5">
          <Inspector node={selected} />
          <div className="mt-8 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
              AI Assistant
            </p>
            <p className="mt-2 text-sm text-violet-900">
              AI design commands will appear here in a later milestone.
            </p>
            <button
              disabled
              className="mt-3 w-full rounded-lg bg-violet-200 px-3 py-2 text-sm text-violet-500"
            >
              Ask AI
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Inspector({ node }: { node?: Node }) {
  const updateText = useEditorStore((state) => state.updateText);
  const updateFontSize = useEditorStore((state) => state.updateFontSize);
  const updateFillColor = useEditorStore((state) => state.updateFillColor);

  if (!node) {
    return (
      <p className="text-sm text-zinc-500">
        Select an element to edit its properties.
      </p>
    );
  }
  const fillColor =
    node.style.fill?.type === "solid" ? node.style.fill.color : "#7c3aed";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Selected
        </p>
        <h2 className="mt-1 font-semibold">{layerName(node)}</h2>
      </div>
      {node.type === "text" ? (
        <>
          <label className="block text-sm font-medium">
            Text content
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-zinc-300 p-3"
              value={node.text.content}
              onChange={(event) => updateText(event.target.value)}
              aria-label="Text content"
            />
          </label>
          <label className="block text-sm font-medium">
            Font size
            <input
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
              type="number"
              min="1"
              value={node.text.fontSize}
              onChange={(event) => updateFontSize(Number(event.target.value))}
              aria-label="Font size"
            />
          </label>
        </>
      ) : null}
      <label className="block text-sm font-medium">
        Fill color
        <input
          className="mt-2 h-11 w-full rounded-lg border border-zinc-300 p-1"
          type="color"
          value={fillColor}
          onChange={(event) => updateFillColor(event.target.value)}
          aria-label="Fill color"
        />
      </label>
      <dl className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600">
        <dt>X</dt>
        <dd>{Math.round(node.transform.x)}</dd>
        <dt>Y</dt>
        <dd>{Math.round(node.transform.y)}</dd>
        <dt>Width</dt>
        <dd>{Math.round(node.transform.width)}</dd>
        <dt>Height</dt>
        <dd>{Math.round(node.transform.height)}</dd>
      </dl>
    </div>
  );
}

function layerName(node: Node): string {
  if (node.type === "text") return node.text.content || "Text";
  return node.name ?? node.type;
}
