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
    </aside>
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
