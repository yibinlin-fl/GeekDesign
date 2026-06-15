"use client";

import { useEffect, useRef, useState } from "react";

import { API_URL } from "../../lib/assets";
import { authHeaders } from "../../lib/auth";
import { useEditorStore } from "../../lib/editor-store";

interface ExportTask {
  id: string;
  format: string;
  status: "queued" | "processing" | "completed" | "failed";
  result_url?: string | null;
  error_message?: string | null;
}

interface ApiResponse<T> {
  data: T;
  message: string;
}

export function ExportControls() {
  const document = useEditorStore((state) => state.document);
  const [task, setTask] = useState<ExportTask>();
  const [message, setMessage] = useState<string>();
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

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
    setMessage("Saving design for PDF export...");
    try {
      const projectResponse = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          title: document.title,
          document_json: document,
        }),
      });
      if (!projectResponse.ok)
        throw new Error("Unable to save design for export");
      const project = (await projectResponse.json()) as ApiResponse<{
        id: string;
      }>;
      const taskResponse = await fetch(`${API_URL}/api/exports/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ project_id: project.data.id, scale: 1 }),
      });
      if (!taskResponse.ok) throw new Error("Unable to create PDF export");
      const result = (await taskResponse.json()) as ApiResponse<ExportTask>;
      setTask(result.data);
      setMessage("PDF export queued");
      startPolling(result.data.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF export failed");
    }
  };

  const exportPptx = async () => {
    setMessage("Preparing editable PPTX...");
    try {
      const projectResponse = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          title: document.title,
          document_json: document,
        }),
      });
      if (!projectResponse.ok) throw new Error("Sign in before exporting PPTX");
      const project = (await projectResponse.json()) as ApiResponse<{
        id: string;
      }>;
      const response = await fetch(
        `${API_URL}/api/pptx/export/${project.data.id}`,
        { headers: authHeaders() },
      );
      if (!response.ok) throw new Error("Editable PPTX export failed");
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

  const startPolling = (taskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      void fetch(`${API_URL}/api/exports/${taskId}`, { headers: authHeaders() })
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to refresh export task");
          return (await response.json()) as ApiResponse<ExportTask>;
        })
        .then((result) => {
          setTask(result.data);
          setMessage(`PDF export ${result.data.status}`);
          if (
            ["completed", "failed"].includes(result.data.status) &&
            pollRef.current
          ) {
            clearInterval(pollRef.current);
          }
        })
        .catch(() => {
          if (pollRef.current) clearInterval(pollRef.current);
        });
    }, 1500);
  };

  return (
    <div className="flex items-center gap-1.5">
      {message ? (
        <span
          className="max-w-32 truncate text-[10px] text-white/45"
          data-testid="export-status"
        >
          {message}
        </span>
      ) : null}
      {task?.status === "completed" && task.result_url ? (
        <a
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white"
          href={`${API_URL}${task.result_url}`}
          download
        >
          Download PDF
        </a>
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
        disabled={task?.status === "queued" || task?.status === "processing"}
      >
        Export PDF
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
