"use client";

import { Canvas2DRenderer } from "@geekdesign/renderer-core";
import { useEffect, useMemo, useRef, useState } from "react";

import { API_URL } from "../../lib/assets";
import { authHeaders } from "../../lib/auth";
import { BrowserImageCache } from "../../lib/browser-image-cache";

interface ProjectResponse {
  data: {
    title: string;
    document_json: Parameters<Canvas2DRenderer["renderDocument"]>[0];
  };
}

export function ServerRenderCanvas({ projectId }: { projectId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [project, setProject] = useState<ProjectResponse["data"]>();
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
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
    void fetch(`${API_URL}/api/projects/${projectId}`, {
      headers: authHeaders(),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Project not found");
        return (await response.json()) as ProjectResponse;
      })
      .then((result) => setProject(result.data))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Render failed"),
      );
  }, [projectId]);

  useEffect(() => {
    if (project && canvasRef.current) {
      renderer.renderDocument(project.document_json, canvasRef.current);
      setReady(imageCache.isIdle());
    }
  }, [assetVersion, imageCache, project, renderer]);

  if (error) return <p data-render-error>{error}</p>;
  if (!project) return <p>Loading design...</p>;

  return (
    <main
      data-render-ready={ready ? "true" : "false"}
      style={{
        width: project.document_json.canvas.width,
        height: project.document_json.canvas.height,
      }}
    >
      <canvas ref={canvasRef} aria-label="Server render canvas" />
    </main>
  );
}
