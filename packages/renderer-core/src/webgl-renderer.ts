import type { DesignDocument, Node, PageId } from "@geekdesign/design-schema";

import type { Point, Renderer, Viewport } from "./types";
import { RendererError } from "./types";

export class WebGLRenderer implements Renderer {
  renderDocument(_document: DesignDocument, _canvas: HTMLCanvasElement): void {
    void _document;
    void _canvas;
    throw new RendererError("WebGLRenderer is not implemented yet");
  }

  renderPage(_pageId: PageId): void {
    void _pageId;
    throw new RendererError("WebGLRenderer is not implemented yet");
  }

  renderNode(_node: Node): void {
    void _node;
    throw new RendererError("WebGLRenderer is not implemented yet");
  }

  clear(): void {
    throw new RendererError("WebGLRenderer is not implemented yet");
  }

  setViewport(_viewport: Viewport): void {
    void _viewport;
    throw new RendererError("WebGLRenderer is not implemented yet");
  }

  screenToCanvas(_point: Point): Point {
    void _point;
    throw new RendererError("WebGLRenderer is not implemented yet");
  }

  canvasToScreen(_point: Point): Point {
    void _point;
    throw new RendererError("WebGLRenderer is not implemented yet");
  }
}
