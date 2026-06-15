"use client";

import type { DesignDocument } from "@geekdesign/design-schema";
import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { useRef, useState } from "react";

import { absoluteAssetUrl, API_URL } from "../../lib/assets";
import { authHeaders, getAccessToken } from "../../lib/auth";
import { BrowserImageCache } from "../../lib/browser-image-cache";
import { useEditorStore } from "../../lib/editor-store";

interface ApiResponse<T> {
  data: T;
  message: string;
}

export function ExportControls() {
  const document = useEditorStore((state) => state.document);
  const [message, setMessage] = useState<string>();
  const [exportingPdf, setExportingPdf] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const exportPng = () => {
    const canvas = window.document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Design canvas"]',
    );
    if (!canvas) return;
    const link = window.document.createElement("a");
    link.download = `${document.title}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setMessage("PNG downloaded");
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    setMessage("Preparing all pages for PDF...");
    try {
      await downloadDocumentPdf(document);
      setMessage(`PDF downloaded (${document.pages.length} pages)`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      setExportingPdf(false);
    }
  };

  const exportPptx = async () => {
    setMessage("Preparing editable PPTX...");
    try {
      if (!getAccessToken()) {
        throw new Error("Sign in first to export editable PPTX");
      }
      const projectResponse = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          title: document.title,
          document_json: document,
        }),
      });
      if (!projectResponse.ok) throw await apiError(projectResponse);
      const project = (await projectResponse.json()) as ApiResponse<{
        id: string;
      }>;
      const response = await fetch(
        `${API_URL}/api/pptx/export/${project.data.id}`,
        { headers: authHeaders() },
      );
      if (!response.ok) throw await apiError(response);
      downloadBlob(await response.blob(), `${document.title}.pptx`);
      setMessage("Editable PPTX downloaded");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PPTX export failed");
    }
  };

  const importPptx = async (file?: File) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setMessage("Importing editable PPTX...");
    try {
      const response = await fetch(`${API_URL}/api/pptx/import`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const result = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok) throw new Error(result.message);
      window.location.href = `/editor?projectId=${result.data.id}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PPTX import failed");
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {message ? (
        <div
          className="fixed right-4 top-16 z-[100] max-w-sm rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-xs font-semibold text-white shadow-2xl"
          data-testid="export-status"
          role="status"
        >
          {message}
        </div>
      ) : null}
      <button
        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/15 hover:text-white"
        onClick={exportPng}
      >
        Export PNG
      </button>
      <button
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 transition hover:bg-violet-50"
        onClick={() => void exportPdf()}
        disabled={exportingPdf}
      >
        {exportingPdf ? "Preparing PDF..." : "Export PDF"}
      </button>
      <button
        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/15 hover:text-white"
        onClick={() => importRef.current?.click()}
      >
        Import PPTX
      </button>
      <input
        ref={importRef}
        className="hidden"
        type="file"
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onChange={(event) => void importPptx(event.target.files?.[0])}
        aria-label="Import editable PPTX"
      />
      <button
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 transition hover:bg-violet-50"
        onClick={() => void exportPptx()}
      >
        Export PPTX
      </button>
    </div>
  );
}

async function downloadDocumentPdf(document: DesignDocument): Promise<void> {
  const exportDocument = structuredClone(document);
  Object.values(exportDocument.assets).forEach((asset) => {
    asset.uri = absoluteAssetUrl(asset.uri);
  });

  const imageCache = new BrowserImageCache(() => undefined);
  await Promise.allSettled(
    Object.values(exportDocument.assets).map((asset) => imageCache.load(asset)),
  );

  const canvas = window.document.createElement("canvas");
  const renderer = new Canvas2DRenderer({ imageCache });
  renderer.renderDocument(exportDocument, canvas);

  const { jsPDF } = await import("jspdf");
  const { width, height } = exportDocument.canvas;
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });

  exportDocument.pages.forEach((page, index) => {
    if (index > 0) pdf.addPage([width, height], orientation);
    renderer.renderPage(page.id);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
  });

  pdf.save(`${document.title}.pdf`);
}

async function apiError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { message?: string };
    return new Error(body.message || `Request failed (${response.status})`);
  } catch {
    return new Error(`Request failed (${response.status})`);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
