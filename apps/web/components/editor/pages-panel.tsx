"use client";

import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrowserImageCache } from "../../lib/browser-image-cache";
import { useEditorStore } from "../../lib/editor-store";
import { Icon } from "../ui/icon";

export function PagesPanel() {
  const document = useEditorStore((state) => state.document);
  const currentPageId = useEditorStore((state) => state.currentPageId);
  const selectPage = useEditorStore((state) => state.selectPage);
  const addPage = useEditorStore((state) => state.addPage);
  const duplicatePage = useEditorStore((state) => state.duplicatePage);
  const deletePage = useEditorStore((state) => state.deletePage);
  const updatePageNotes = useEditorStore((state) => state.updatePageNotes);
  const updatePageTransition = useEditorStore(
    (state) => state.updatePageTransition,
  );
  const currentPage = document.pages.find((page) => page.id === currentPageId);

  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-zinc-300 bg-[#f7f7f9]">
      <div className="flex h-12 items-center border-b border-zinc-200 px-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
            Slides
          </p>
          <p className="text-xs font-black text-zinc-700">
            {document.pages.length}{" "}
            {document.pages.length === 1 ? "page" : "pages"}
          </p>
        </div>
        <button
          className="ml-auto grid size-8 place-items-center rounded-lg bg-violet-600 text-white shadow-sm hover:bg-violet-700"
          onClick={addPage}
          aria-label="Add page"
          title="Add page"
        >
          <Icon className="size-4" name="plus" />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {document.pages.map((page, index) => (
          <div
            key={page.id}
            className={`group rounded-xl border p-1.5 transition ${
              page.id === currentPageId
                ? "border-violet-500 bg-violet-50 shadow-sm"
                : "border-transparent hover:border-zinc-300 hover:bg-white"
            }`}
            data-testid="page-card"
          >
            <button
              className="block w-full text-left"
              onClick={() => selectPage(page.id)}
              aria-label={`Open page ${index + 1}`}
            >
              <div className="relative overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
                <PageThumbnail pageId={page.id} />
                <span className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-md bg-zinc-950/65 text-[9px] font-black text-white">
                  {index + 1}
                </span>
              </div>
              <p className="mt-1.5 truncate px-1 text-[10px] font-bold text-zinc-600">
                {page.name}
              </p>
            </button>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button
                className="rounded-md px-1 py-1 text-[9px] font-bold text-zinc-500 hover:bg-white hover:text-violet-700"
                onClick={() => duplicatePage(page.id)}
                aria-label={`Duplicate page ${index + 1}`}
              >
                Duplicate
              </button>
              <button
                className="rounded-md px-1 py-1 text-[9px] font-bold text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                onClick={() => deletePage(page.id)}
                disabled={document.pages.length === 1}
                aria-label={`Delete page ${index + 1}`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 bg-white p-3">
        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
          Transition
          <select
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-[11px] font-bold normal-case tracking-normal text-zinc-700"
            value={currentPage?.transition?.type ?? "none"}
            onChange={(event) =>
              updatePageTransition({
                type: event.target.value as "none" | "fade" | "push" | "wipe",
                durationMs: event.target.value === "none" ? 0 : 500,
              })
            }
            aria-label="Page transition"
          >
            <option value="none">None</option>
            <option value="fade">Fade</option>
            <option value="push">Push</option>
            <option value="wipe">Wipe</option>
          </select>
        </label>
        <SpeakerNotesEditor
          key={currentPageId}
          value={currentPage?.notes ?? ""}
          onCommit={updatePageNotes}
        />
      </div>
    </aside>
  );
}

function SpeakerNotesEditor({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="mt-3 block text-[9px] font-black uppercase tracking-widest text-zinc-400">
      Speaker notes
      <textarea
        className="mt-2 h-24 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-[11px] font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-violet-300"
        placeholder="Add private notes for this slide..."
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== value) onCommit(draft);
        }}
        aria-label="Speaker notes"
      />
    </label>
  );
}

function PageThumbnail({ pageId }: { pageId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const document = useEditorStore((state) => state.document);
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

  useEffect(() => {
    if (!canvasRef.current) return;
    renderer.renderDocument(document, canvasRef.current);
    renderer.renderPage(pageId);
  }, [assetVersion, document, pageId, renderer]);

  return (
    <canvas
      ref={canvasRef}
      className="block aspect-[4/3] w-full"
      aria-label={`Page thumbnail ${pageId}`}
    />
  );
}
