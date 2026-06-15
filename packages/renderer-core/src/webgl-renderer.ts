import type { DesignDocument, Node, PageId } from "@geekdesign/design-schema";

import type { Point, Renderer, Viewport } from "./types";
import { RendererError } from "./types";

export class WebGLRenderer implements Renderer {
  private document?: DesignDocument;
  private canvas?: HTMLCanvasElement;
  private context?: WebGL2RenderingContext;
  private viewport: Viewport = { zoom: 1, offsetX: 0, offsetY: 0 };

  renderDocument(document: DesignDocument, canvas: HTMLCanvasElement): void {
    const context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
    });
    if (!context) throw new RendererError("WebGL2 is not available");
    this.document = document;
    this.canvas = canvas;
    this.context = context;
    canvas.width = document.canvas.width;
    canvas.height = document.canvas.height;
    context.viewport(0, 0, canvas.width, canvas.height);
    this.renderPage(document.pages[0]!.id);
  }

  renderPage(pageId: PageId): void {
    const document = this.requireDocument();
    const page = document.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new RendererError(`Page "${pageId}" does not exist`);
    const background =
      page.background.type === "solid" ? page.background.color : "#ffffff";
    this.clearWithColor(background);
    page.children.forEach((nodeId) => {
      const node = document.nodes[nodeId];
      if (node) this.renderNode(node);
    });
  }

  renderNode(node: Node): void {
    if (!node.style.visible || node.style.fill?.type !== "solid") return;
    if (node.type !== "rect" && node.type !== "frame") return;
    this.fillRegion(
      node.transform.x,
      node.transform.y,
      node.transform.width,
      node.transform.height,
      node.style.fill.color,
      node.style.opacity,
    );
  }

  clear(): void {
    this.clearWithColor("#00000000");
  }

  setViewport(viewport: Viewport): void {
    if (!Number.isFinite(viewport.zoom) || viewport.zoom <= 0)
      throw new RendererError("Viewport zoom must be positive");
    this.viewport = { ...viewport };
  }

  screenToCanvas(point: Point): Point {
    return {
      x: (point.x - this.viewport.offsetX) / this.viewport.zoom,
      y: (point.y - this.viewport.offsetY) / this.viewport.zoom,
    };
  }

  canvasToScreen(point: Point): Point {
    return {
      x: point.x * this.viewport.zoom + this.viewport.offsetX,
      y: point.y * this.viewport.zoom + this.viewport.offsetY,
    };
  }

  renderDirtyRegions(pageId: PageId, nodeIds: readonly string[]): void {
    const document = this.requireDocument();
    const page = document.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new RendererError(`Page "${pageId}" does not exist`);
    nodeIds.forEach((nodeId) => {
      const node = document.nodes[nodeId];
      if (node) this.renderNode(node);
    });
  }

  private fillRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    opacity = 1,
  ): void {
    const gl = this.requireContext();
    const canvas = this.canvas!;
    const rgba = parseColor(color, opacity);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(
      Math.round(x),
      Math.round(canvas.height - y - height),
      Math.round(width),
      Math.round(height),
    );
    gl.clearColor(...rgba);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
  }

  private clearWithColor(color: string): void {
    const gl = this.requireContext();
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(...parseColor(color));
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private requireDocument(): DesignDocument {
    if (!this.document) throw new RendererError("No document is loaded");
    return this.document;
  }

  private requireContext(): WebGL2RenderingContext {
    if (!this.context) throw new RendererError("No WebGL2 canvas is attached");
    return this.context;
  }
}

function parseColor(
  color: string,
  opacity = 1,
): [number, number, number, number] {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(normalized))
    return [0, 0, 0, opacity];
  const alpha =
    normalized.length === 8
      ? Number.parseInt(normalized.slice(6, 8), 16) / 255
      : 1;
  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
    alpha * opacity,
  ];
}
