import type {
  DesignDocument,
  EllipseNode,
  FrameNode,
  GroupNode,
  ImageNode,
  LineNode,
  NodeStyle,
  Paint,
  RectNode,
  SvgNode,
  TextNode,
  Transform,
} from "./types";

import { DESIGN_SCHEMA_VERSION } from "./constants";

const solidWhite: Paint = { type: "solid", color: "#ffffff" };

const createId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const createDefaultTransform = (): Transform => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

export const createDefaultStyle = (): NodeStyle => ({
  opacity: 1,
  visible: true,
  locked: false,
});

type CommonNodeInput = {
  id?: string;
  parentId: string;
  name?: string;
  role?: TextNode["role"];
  transform?: Partial<Transform>;
  style?: Partial<NodeStyle>;
};

const commonNode = (input: CommonNodeInput, prefix: string) => ({
  id: input.id ?? createId(prefix),
  parentId: input.parentId,
  ...(input.name ? { name: input.name } : {}),
  ...(input.role ? { role: input.role } : {}),
  transform: { ...createDefaultTransform(), ...input.transform },
  style: { ...createDefaultStyle(), ...input.style },
});

export function createEmptyDocument(
  input: {
    documentId?: string;
    pageId?: string;
    title?: string;
    now?: string;
    width?: number;
    height?: number;
  } = {},
): DesignDocument {
  const now = input.now ?? new Date().toISOString();
  const pageId = input.pageId ?? createId("page");
  return {
    schemaVersion: DESIGN_SCHEMA_VERSION,
    documentId: input.documentId ?? createId("design"),
    title: input.title ?? "Untitled design",
    createdAt: now,
    updatedAt: now,
    canvas: {
      width: input.width ?? 1080,
      height: input.height ?? 1080,
      unit: "px",
      dpi: 96,
    },
    pages: [
      { id: pageId, name: "Page 1", background: solidWhite, children: [] },
    ],
    nodes: {},
    assets: {},
    fonts: {},
    variables: {},
    metadata: {},
  };
}

export function createTextNode(
  input: CommonNodeInput & {
    content?: string;
    fontFamily?: string;
    fontSize?: number;
  },
): TextNode {
  return {
    ...commonNode(input, "text"),
    type: "text",
    text: {
      content: input.content ?? "",
      fontFamily: input.fontFamily ?? "Arial",
      fontSize: input.fontSize ?? 32,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "left",
    },
  };
}

export function createImageNode(
  input: CommonNodeInput & {
    assetId: string;
    fit?: ImageNode["image"]["fit"];
    alt?: string;
  },
): ImageNode {
  return {
    ...commonNode(input, "image"),
    type: "image",
    image: {
      assetId: input.assetId,
      fit: input.fit ?? "cover",
      ...(input.alt ? { alt: input.alt } : {}),
    },
  };
}

export function createRectNode(
  input: CommonNodeInput & { cornerRadius?: number },
): RectNode {
  return {
    ...commonNode(input, "rect"),
    type: "rect",
    cornerRadius: input.cornerRadius ?? 0,
  };
}

export function createEllipseNode(input: CommonNodeInput): EllipseNode {
  return { ...commonNode(input, "ellipse"), type: "ellipse" };
}

export function createLineNode(input: CommonNodeInput): LineNode {
  return {
    ...commonNode(input, "line"),
    type: "line",
    line: { x1: 0, y1: 0, x2: 100, y2: 0 },
  };
}

export function createSvgNode(
  input: CommonNodeInput & { assetId: string },
): SvgNode {
  return {
    ...commonNode(input, "svg"),
    type: "svg",
    svg: { assetId: input.assetId, preserveAspectRatio: true },
  };
}

export function createGroupNode(
  input: CommonNodeInput & { children?: string[] },
): GroupNode {
  return {
    ...commonNode(input, "group"),
    type: "group",
    children: input.children ?? [],
  };
}

export function createFrameNode(
  input: CommonNodeInput & { children?: string[]; clipContent?: boolean },
): FrameNode {
  return {
    ...commonNode(input, "frame"),
    type: "frame",
    children: input.children ?? [],
    clipContent: input.clipContent ?? true,
  };
}
