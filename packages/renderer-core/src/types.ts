import type {
  AssetRef,
  DesignDocument,
  FontRef,
  Node,
  PageId,
  Transform,
} from "@geekdesign/design-schema";

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface ImageCache {
  get(assetId: string): CanvasImageSource | undefined;
  load(asset: AssetRef): Promise<CanvasImageSource>;
}

export interface FontLoader {
  load(font: FontRef): Promise<void>;
}

export interface Renderer {
  renderDocument(document: DesignDocument, canvas: HTMLCanvasElement): void;
  renderPage(pageId: PageId): void;
  renderNode(node: Node): void;
  renderPreview?(
    document: DesignDocument,
    canvas: HTMLCanvasElement,
    pageId: PageId,
    transformOverrides: ReadonlyMap<string, Transform>,
  ): void;
  clear(): void;
  setViewport(viewport: Viewport): void;
  screenToCanvas(point: Point): Point;
  canvasToScreen(point: Point): Point;
}

export interface Canvas2DRendererOptions {
  imageCache?: ImageCache;
  fontLoader?: FontLoader;
}

export class RendererError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RendererError";
  }
}
