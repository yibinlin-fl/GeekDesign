import {
  validateDesignDocument,
  type DesignDocument,
  type EllipseNode,
  type FrameNode,
  type GroupNode,
  type ImageNode,
  type LineNode,
  type Node,
  type Paint,
  type RectNode,
  type SvgNode,
  type TextNode,
  type Transform,
} from "@geekdesign/design-schema";

import type {
  Canvas2DRendererOptions,
  FontLoader,
  ImageCache,
  Point,
  Renderer,
  Viewport,
} from "./types";
import { RendererError } from "./types";

const clone = <T>(value: T): T => structuredClone(value);

const defaultViewport = (): Viewport => ({ zoom: 1, offsetX: 0, offsetY: 0 });

export class Canvas2DRenderer implements Renderer {
  private document?: DesignDocument;
  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private viewport: Viewport = defaultViewport();
  private readonly imageCache?: ImageCache;
  private readonly fontLoader?: FontLoader;
  private transformOverrides?: ReadonlyMap<string, Transform>;

  constructor(options: Canvas2DRendererOptions = {}) {
    this.imageCache = options.imageCache;
    this.fontLoader = options.fontLoader;
  }

  renderDocument(document: DesignDocument, canvas: HTMLCanvasElement): void {
    this.document = clone(validateDesignDocument(document));
    this.canvas = canvas;
    this.context = canvas.getContext("2d") ?? undefined;
    if (!this.context)
      throw new RendererError("Canvas 2D context is not available");

    canvas.width = document.canvas.width;
    canvas.height = document.canvas.height;
    const firstPage = document.pages[0];
    if (!firstPage) throw new RendererError("Document has no pages");
    this.renderPage(firstPage.id);
  }

  renderPage(pageId: string): void {
    const document = this.requireDocument();
    const context = this.requireContext();
    const page = document.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new RendererError(`Page "${pageId}" does not exist`);

    this.clear();
    context.save();
    context.translate(this.viewport.offsetX, this.viewport.offsetY);
    context.scale(this.viewport.zoom, this.viewport.zoom);

    this.fillArea(
      page.background,
      0,
      0,
      document.canvas.width,
      document.canvas.height,
    );
    page.children.forEach((nodeId) => {
      const node = document.nodes[nodeId];
      if (node) this.renderNode(node);
    });
    context.restore();
  }

  renderPreview(
    document: DesignDocument,
    canvas: HTMLCanvasElement,
    pageId: string,
    transformOverrides: ReadonlyMap<string, Transform>,
  ): void {
    this.document = document;
    this.canvas = canvas;
    this.context = canvas.getContext("2d") ?? undefined;
    if (!this.context)
      throw new RendererError("Canvas 2D context is not available");
    canvas.width = document.canvas.width;
    canvas.height = document.canvas.height;
    this.transformOverrides = transformOverrides;
    try {
      this.renderPage(pageId);
    } finally {
      this.transformOverrides = undefined;
    }
  }

  renderNode(node: Node): void {
    if (!node.style.visible || node.style.opacity <= 0) return;
    const context = this.requireContext();

    const transform = this.transformOverrides?.get(node.id) ?? node.transform;
    const renderedNode =
      transform === node.transform ? node : ({ ...node, transform } as Node);
    context.save();
    context.translate(transform.x, transform.y);
    context.rotate((transform.rotation * Math.PI) / 180);
    context.scale(transform.scaleX, transform.scaleY);
    context.globalAlpha *= node.style.opacity;
    context.globalCompositeOperation =
      node.style.blendMode === "normal"
        ? "source-over"
        : (node.style.blendMode ?? "source-over");
    this.applyShadow(node);

    switch (renderedNode.type) {
      case "text":
        this.renderTextNode(renderedNode);
        break;
      case "image":
        this.renderImageNode(renderedNode);
        break;
      case "rect":
        this.renderRectNode(renderedNode);
        break;
      case "ellipse":
        this.renderEllipseNode(renderedNode);
        break;
      case "line":
        this.renderLineNode(renderedNode);
        break;
      case "svg":
        this.renderSvgNode(renderedNode);
        break;
      case "group":
        this.renderGroupNode(renderedNode);
        break;
      case "frame":
        this.renderFrameNode(renderedNode);
        break;
    }
    context.restore();
  }

  renderTextNode(node: TextNode): void {
    const context = this.requireContext();
    const document = this.requireDocument();
    if (node.text.fontId) {
      const font = document.fonts[node.text.fontId];
      if (font) void this.fontLoader?.load(font);
    }

    context.font = `${node.text.fontWeight} ${node.text.fontSize}px "${node.text.fontFamily}"`;
    (
      context as CanvasRenderingContext2D & { letterSpacing: string }
    ).letterSpacing = `${node.text.letterSpacing}px`;
    context.textAlign =
      node.text.textAlign === "justify" ? "left" : node.text.textAlign;
    context.textBaseline = "top";
    const fill = this.resolvePaint(
      node.style.fill,
      node.transform.width,
      node.transform.height,
    );
    if (fill) context.fillStyle = fill;

    const lineHeight = node.text.fontSize * node.text.lineHeight;
    node.text.content.split("\n").forEach((line, index) => {
      const x =
        node.text.textAlign === "center"
          ? node.transform.width / 2
          : node.text.textAlign === "right"
            ? node.transform.width
            : 0;
      if (fill)
        context.fillText(line, x, index * lineHeight, node.transform.width);
      if (node.style.stroke) {
        this.applyStroke(
          node.style.stroke,
          node.transform.width,
          node.transform.height,
        );
        context.strokeText(line, x, index * lineHeight, node.transform.width);
      }
    });
  }

  renderImageNode(node: ImageNode): void {
    const document = this.requireDocument();
    const context = this.requireContext();
    const asset = document.assets[node.image.assetId];
    if (!asset) return;

    const image = this.imageCache?.get(asset.id);
    if (!image) {
      void this.imageCache?.load(asset);
      return;
    }
    context.save();
    context.beginPath();
    context.rect(0, 0, node.transform.width, node.transform.height);
    context.clip();
    this.drawImageWithFit(
      image,
      node.image.fit,
      node.transform.width,
      node.transform.height,
    );
    context.restore();
    if (node.style.stroke) {
      this.applyStroke(
        node.style.stroke,
        node.transform.width,
        node.transform.height,
      );
      context.strokeRect(0, 0, node.transform.width, node.transform.height);
    }
  }

  renderRectNode(node: RectNode): void {
    const context = this.requireContext();
    context.beginPath();
    if (node.cornerRadius > 0 && "roundRect" in context) {
      context.roundRect(
        0,
        0,
        node.transform.width,
        node.transform.height,
        node.cornerRadius,
      );
    } else {
      context.rect(0, 0, node.transform.width, node.transform.height);
    }
    this.fillAndStroke(node);
  }

  renderEllipseNode(node: EllipseNode): void {
    const context = this.requireContext();
    context.beginPath();
    context.ellipse(
      node.transform.width / 2,
      node.transform.height / 2,
      node.transform.width / 2,
      node.transform.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    this.fillAndStroke(node);
  }

  renderLineNode(node: LineNode): void {
    const context = this.requireContext();
    context.beginPath();
    context.moveTo(node.line.x1, node.line.y1);
    context.lineTo(node.line.x2, node.line.y2);
    if (node.style.stroke) {
      this.applyStroke(
        node.style.stroke,
        node.transform.width,
        node.transform.height,
      );
      context.stroke();
    }
  }

  renderSvgNode(node: SvgNode): void {
    const context = this.requireContext();
    // TODO: parse trusted SVG assets or rasterize them through the image cache.
    context.save();
    context.setLineDash([6, 4]);
    context.strokeStyle = "#a1a1aa";
    context.strokeRect(0, 0, node.transform.width, node.transform.height);
    context.restore();
  }

  clear(): void {
    const context = this.requireContext();
    const canvas = this.requireCanvas();
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  setViewport(viewport: Viewport): void {
    if (!Number.isFinite(viewport.zoom) || viewport.zoom <= 0) {
      throw new RendererError("Viewport zoom must be a positive finite number");
    }
    if (
      !Number.isFinite(viewport.offsetX) ||
      !Number.isFinite(viewport.offsetY)
    ) {
      throw new RendererError("Viewport offsets must be finite numbers");
    }
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

  private renderGroupNode(node: GroupNode): void {
    this.renderChildren(node.children);
  }

  private renderFrameNode(node: FrameNode): void {
    const context = this.requireContext();
    context.beginPath();
    context.rect(0, 0, node.transform.width, node.transform.height);
    this.fillAndStroke(node);
    if (node.clipContent) {
      context.beginPath();
      context.rect(0, 0, node.transform.width, node.transform.height);
      context.clip();
    }
    this.renderChildren(node.children);
  }

  private renderChildren(children: string[]): void {
    const document = this.requireDocument();
    children.forEach((nodeId) => {
      const child = document.nodes[nodeId];
      if (child) this.renderNode(child);
    });
  }

  private fillAndStroke(node: Node): void {
    const context = this.requireContext();
    const fill = this.resolvePaint(
      node.style.fill,
      node.transform.width,
      node.transform.height,
    );
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (node.style.stroke) {
      this.applyStroke(
        node.style.stroke,
        node.transform.width,
        node.transform.height,
      );
      context.stroke();
    }
  }

  private fillArea(
    paint: Paint,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const context = this.requireContext();
    const fill = this.resolvePaint(paint, width, height);
    if (!fill) return;
    context.fillStyle = fill;
    context.fillRect(x, y, width, height);
  }

  private resolvePaint(
    paint: Paint | undefined,
    width: number,
    height: number,
  ): string | CanvasGradient | CanvasPattern | undefined {
    if (!paint) return undefined;
    const context = this.requireContext();
    if (paint.type === "solid") return paint.color;
    if (paint.type === "linear-gradient") {
      const radians = (paint.angle * Math.PI) / 180;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius =
        Math.abs(width * Math.cos(radians)) / 2 +
        Math.abs(height * Math.sin(radians)) / 2;
      const gradient = context.createLinearGradient(
        centerX - Math.cos(radians) * radius,
        centerY - Math.sin(radians) * radius,
        centerX + Math.cos(radians) * radius,
        centerY + Math.sin(radians) * radius,
      );
      paint.stops.forEach((stop) =>
        gradient.addColorStop(stop.offset, stop.color),
      );
      return gradient;
    }
    if (paint.type === "radial-gradient") {
      const gradient = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 2,
      );
      paint.stops.forEach((stop) =>
        gradient.addColorStop(stop.offset, stop.color),
      );
      return gradient;
    }

    const asset = this.requireDocument().assets[paint.assetId];
    if (!asset) return undefined;
    const image = this.imageCache?.get(asset.id);
    if (!image) {
      void this.imageCache?.load(asset);
      return undefined;
    }
    return context.createPattern(image, "no-repeat") ?? undefined;
  }

  private applyStroke(
    stroke: NonNullable<Node["style"]["stroke"]>,
    width: number,
    height: number,
  ): void {
    const context = this.requireContext();
    const paint = this.resolvePaint(stroke.paint, width, height);
    if (paint) context.strokeStyle = paint;
    context.lineWidth = stroke.width;
    context.setLineDash(stroke.dash ?? []);
    context.lineCap = stroke.lineCap ?? "butt";
    context.lineJoin = stroke.lineJoin ?? "miter";
  }

  private applyShadow(node: Node): void {
    const context = this.requireContext();
    const shadow = node.style.shadow;
    if (!shadow) return;
    context.shadowColor = shadow.color;
    context.shadowOffsetX = shadow.offsetX;
    context.shadowOffsetY = shadow.offsetY;
    context.shadowBlur = shadow.blur;
  }

  private drawImageWithFit(
    image: CanvasImageSource,
    fit: ImageNode["image"]["fit"],
    width: number,
    height: number,
  ): void {
    const context = this.requireContext();
    const sourceWidth = "width" in image ? Number(image.width) : width;
    const sourceHeight = "height" in image ? Number(image.height) : height;
    if (fit === "stretch" || !sourceWidth || !sourceHeight) {
      context.drawImage(image, 0, 0, width, height);
      return;
    }

    const scale =
      fit === "cover"
        ? Math.max(width / sourceWidth, height / sourceHeight)
        : Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    context.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  }

  private requireDocument(): DesignDocument {
    if (!this.document)
      throw new RendererError("No document has been rendered");
    return this.document;
  }

  private requireCanvas(): HTMLCanvasElement {
    if (!this.canvas) throw new RendererError("No canvas has been attached");
    return this.canvas;
  }

  private requireContext(): CanvasRenderingContext2D {
    if (!this.context)
      throw new RendererError("Canvas 2D context is not available");
    return this.context;
  }
}
