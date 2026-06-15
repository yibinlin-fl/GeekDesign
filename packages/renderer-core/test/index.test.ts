import {
  createEmptyDocument,
  createImageNode,
  createRectNode,
  createTextNode,
  type DesignDocument,
} from "@geekdesign/design-schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer, WebGLRenderer } from "../src";

type ContextMethod = ReturnType<typeof vi.fn>;

interface MockCanvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  methods: Record<string, ContextMethod>;
}

const createMockCanvas = (): MockCanvas => {
  const methodNames = [
    "beginPath",
    "clearRect",
    "clip",
    "createPattern",
    "drawImage",
    "ellipse",
    "fill",
    "fillRect",
    "fillText",
    "lineTo",
    "measureText",
    "moveTo",
    "rect",
    "restore",
    "rotate",
    "roundRect",
    "save",
    "scale",
    "setLineDash",
    "setTransform",
    "stroke",
    "strokeRect",
    "strokeText",
    "translate",
  ];
  const methods = Object.fromEntries(
    methodNames.map((name) => [name, vi.fn()]),
  ) as Record<string, ContextMethod>;
  methods.measureText = vi.fn((text: string) => ({
    width: text.length * 10,
  })) as ContextMethod;
  const gradient = { addColorStop: vi.fn() };
  methods.createLinearGradient = vi.fn(() => gradient) as ContextMethod;
  methods.createRadialGradient = vi.fn(() => gradient) as ContextMethod;

  const context = {
    ...methods,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement;

  return { canvas, context, methods };
};

const buildDocument = (): DesignDocument => {
  const document = createEmptyDocument({
    documentId: "renderer_test",
    pageId: "page_1",
    now: "2026-06-14T00:00:00.000Z",
    width: 500,
    height: 400,
  });
  const rect = createRectNode({
    id: "rect",
    parentId: "page_1",
    transform: { x: 20, y: 30, width: 200, height: 100 },
    style: { fill: { type: "solid", color: "#ff0000" } },
  });
  const title = createTextNode({
    id: "title",
    parentId: "page_1",
    content: "Hello Renderer",
    transform: { x: 30, y: 50, width: 250, height: 80 },
    style: { fill: { type: "solid", color: "#111111" } },
  });
  document.nodes = { rect, title };
  document.pages[0]!.children = ["rect", "title"];
  return document;
};

describe("Canvas2DRenderer", () => {
  let mock: MockCanvas;
  let renderer: Canvas2DRenderer;

  beforeEach(() => {
    mock = createMockCanvas();
    renderer = new Canvas2DRenderer();
  });

  it("initializes without a canvas", () => {
    expect(renderer).toBeInstanceOf(Canvas2DRenderer);
  });

  it("renders a valid document without modifying it", () => {
    const document = buildDocument();
    const before = structuredClone(document);

    expect(() => renderer.renderDocument(document, mock.canvas)).not.toThrow();

    expect(document).toEqual(before);
    expect(mock.canvas.width).toBe(500);
    expect(mock.canvas.height).toBe(400);
  });

  it("converts points between screen and canvas coordinates", () => {
    renderer.setViewport({ zoom: 2, offsetX: 100, offsetY: 50 });

    expect(renderer.canvasToScreen({ x: 20, y: 30 })).toEqual({
      x: 140,
      y: 110,
    });
    expect(renderer.screenToCanvas({ x: 140, y: 110 })).toEqual({
      x: 20,
      y: 30,
    });
  });

  it("renders a solid fill rectangle", () => {
    const document = buildDocument();
    delete document.nodes.title;
    document.pages[0]!.children = ["rect"];
    renderer.renderDocument(document, mock.canvas);

    expect(mock.methods.rect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(mock.methods.fill).toHaveBeenCalled();
    expect(mock.context.fillStyle).toBe("#ff0000");
  });

  it("renders text content", () => {
    renderer.renderDocument(buildDocument(), mock.canvas);

    expect(mock.methods.fillText).toHaveBeenCalledWith("Hello Renderer", 0, 0);
  });

  it("renders rich text runs as separately styled segments", () => {
    const document = buildDocument();
    const title = document.nodes.title;
    if (title?.type === "text") {
      title.text.runs = [
        { start: 0, end: 5, fontWeight: 700, color: "#ff0000" },
      ];
    }

    renderer.renderDocument(document, mock.canvas);

    expect(mock.methods.fillText).toHaveBeenCalledWith("Hello", 0, 0);
    expect(mock.methods.fillText).toHaveBeenCalledWith(" Renderer", 50, 0);
  });

  it("renders lightweight transform overrides without modifying the document", () => {
    const document = buildDocument();
    renderer.renderPreview(
      document,
      mock.canvas,
      "page_1",
      new Map([["rect", { ...document.nodes.rect!.transform, x: 250 }]]),
    );

    expect(mock.methods.translate).toHaveBeenCalledWith(250, 30);
    expect(document.nodes.rect?.transform.x).toBe(20);
  });

  it("renders a normalized image crop as a source rectangle", () => {
    const document = buildDocument();
    document.assets.photo = {
      id: "photo",
      type: "image",
      uri: "/photo.png",
      mimeType: "image/png",
      width: 800,
      height: 600,
    };
    document.nodes = {
      image: createImageNode({
        id: "image",
        parentId: "page_1",
        assetId: "photo",
        fit: "stretch",
        crop: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        transform: { width: 200, height: 100 },
      }),
    };
    document.pages[0]!.children = ["image"];
    const image = { width: 800, height: 600 } as CanvasImageSource;
    renderer = new Canvas2DRenderer({
      imageCache: { get: () => image, load: vi.fn() },
    });

    renderer.renderDocument(document, mock.canvas);

    expect(mock.methods.drawImage).toHaveBeenCalledWith(
      image,
      200,
      150,
      400,
      300,
      0,
      0,
      200,
      100,
    );
  });
});

describe("WebGLRenderer", () => {
  it("renders solid shapes and supports partial redraw", () => {
    const gl = {
      COLOR_BUFFER_BIT: 0x4000,
      SCISSOR_TEST: 0x0c11,
      clear: vi.fn(),
      clearColor: vi.fn(),
      disable: vi.fn(),
      enable: vi.fn(),
      scissor: vi.fn(),
      viewport: vi.fn(),
    } as unknown as WebGL2RenderingContext;
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => gl),
    } as unknown as HTMLCanvasElement;
    const renderer = new WebGLRenderer();

    renderer.renderDocument(buildDocument(), canvas);
    renderer.renderDirtyRegions("page_1", ["rect"]);

    expect(gl.viewport).toHaveBeenCalledWith(0, 0, 500, 400);
    expect(gl.scissor).toHaveBeenCalledWith(20, 270, 200, 100);
  });
});
