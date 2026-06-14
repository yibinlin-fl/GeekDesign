"use client";

import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { useEffect, useMemo, useRef, useState } from "react";

import { API_URL } from "../../lib/assets";

export function SharedRenderCanvas({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [project, setProject] = useState<{
    title: string;
    document_json: Parameters<Canvas2DRenderer["renderDocument"]>[0];
  }>();
  const renderer = useMemo(() => new Canvas2DRenderer(), []);

  useEffect(() => {
    void fetch(`${API_URL}/api/shares/${token}`)
      .then((response) => response.json())
      .then((body: { data: typeof project }) => setProject(body.data));
  }, [token]);

  useEffect(() => {
    if (project && canvasRef.current)
      renderer.renderDocument(project.document_json, canvasRef.current);
  }, [project, renderer]);

  if (!project) return <p>Loading shared design...</p>;
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section>
        <p className="mb-3 text-center text-sm font-semibold text-zinc-500">
          Read-only shared design
        </p>
        <h1 className="mb-5 text-center text-2xl font-bold">{project.title}</h1>
        <canvas
          ref={canvasRef}
          className="max-w-full bg-white shadow-xl"
          aria-label="Shared design canvas"
        />
      </section>
    </main>
  );
}
