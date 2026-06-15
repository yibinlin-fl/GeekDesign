export type DocumentId = string;
export type PageId = string;
export type NodeId = string;
export type AssetId = string;
export type FontId = string;

export type NodeType =
  | "text"
  | "image"
  | "rect"
  | "ellipse"
  | "line"
  | "svg"
  | "table"
  | "chart"
  | "group"
  | "frame";

export type NodeRole =
  | "background"
  | "title"
  | "subtitle"
  | "body"
  | "logo"
  | "qr_code"
  | "avatar"
  | "date"
  | "location"
  | "button"
  | "decoration"
  | "section_title"
  | "experience"
  | "education"
  | "skill";

export interface ColorStop {
  offset: number;
  color: string;
}

export type Paint =
  | { type: "solid"; color: string }
  | { type: "linear-gradient"; angle: number; stops: ColorStop[] }
  | { type: "radial-gradient"; stops: ColorStop[] }
  | {
      type: "image";
      assetId: AssetId;
      fit: "cover" | "contain" | "stretch";
    };

export interface Stroke {
  paint: Paint;
  width: number;
  dash?: number[];
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
}

export interface Shadow {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface NodeStyle {
  opacity: number;
  visible: boolean;
  locked: boolean;
  fill?: Paint;
  stroke?: Stroke;
  shadow?: Shadow;
  blendMode?: "normal" | "multiply" | "screen" | "overlay";
}

export interface BaseNode {
  id: NodeId;
  type: NodeType;
  parentId: PageId | NodeId;
  transform: Transform;
  style: NodeStyle;
  role?: NodeRole;
  name?: string;
  data?: Record<string, unknown>;
}

export interface TextNode extends Omit<BaseNode, "type"> {
  type: "text";
  text: {
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    textAlign: "left" | "center" | "right" | "justify";
    fontId?: FontId;
    runs?: RichTextRun[];
    paragraphs?: ParagraphStyle[];
  };
}

export interface RichTextRun {
  start: number;
  end: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontId?: FontId;
  color?: string;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
}

export interface ParagraphStyle {
  start: number;
  end: number;
  bullet?: {
    type: "unordered" | "ordered";
    level: number;
  };
  indent?: number;
  spacingBefore?: number;
  spacingAfter?: number;
}

export interface ImageNode extends Omit<BaseNode, "type"> {
  type: "image";
  image: {
    assetId: AssetId;
    fit: "cover" | "contain" | "stretch";
    alt?: string;
    crop?: ImageCrop;
  };
}

export interface ImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RectNode extends Omit<BaseNode, "type"> {
  type: "rect";
  cornerRadius: number;
}

export interface EllipseNode extends Omit<BaseNode, "type"> {
  type: "ellipse";
}

export interface LineNode extends Omit<BaseNode, "type"> {
  type: "line";
  line: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface SvgNode extends Omit<BaseNode, "type"> {
  type: "svg";
  svg: {
    assetId: AssetId;
    preserveAspectRatio: boolean;
  };
}

export interface TableNode extends Omit<BaseNode, "type"> {
  type: "table";
  table: {
    rows: string[][];
    headerRows: number;
    columnWidths?: number[];
  };
}

export interface ChartNode extends Omit<BaseNode, "type"> {
  type: "chart";
  chart: {
    kind: "bar" | "line" | "pie";
    labels: string[];
    series: Array<{
      name: string;
      values: number[];
      color: string;
    }>;
  };
}

export interface GroupNode extends Omit<BaseNode, "type"> {
  type: "group";
  children: NodeId[];
}

export interface FrameNode extends Omit<BaseNode, "type"> {
  type: "frame";
  children: NodeId[];
  clipContent: boolean;
}

export type Node =
  | TextNode
  | ImageNode
  | RectNode
  | EllipseNode
  | LineNode
  | SvgNode
  | TableNode
  | ChartNode
  | GroupNode
  | FrameNode;

export interface Page {
  id: PageId;
  name: string;
  background: Paint;
  children: NodeId[];
  notes?: string;
  layoutId?: string;
  transition?: PageTransition;
  animations?: ElementAnimation[];
}

export interface PageTransition {
  type: "none" | "fade" | "push" | "wipe";
  durationMs: number;
  direction?: "left" | "right" | "up" | "down";
}

export interface ElementAnimation {
  nodeId: NodeId;
  effect: "fade-in" | "fly-in" | "zoom-in";
  delayMs: number;
  durationMs: number;
  direction?: "left" | "right" | "up" | "down";
}

export interface Theme {
  id: string;
  name: string;
  colors: Record<string, string>;
  fonts: {
    heading: string;
    body: string;
  };
}

export interface SlideLayout {
  id: string;
  name: string;
  themeId?: string;
  placeholders: Array<{
    role: NodeRole;
    transform: Transform;
  }>;
}

export interface Canvas {
  width: number;
  height: number;
  unit: "px" | "mm" | "in";
  dpi: number;
}

export interface AssetRef {
  id: AssetId;
  type: "image" | "svg" | "icon" | "video" | "audio" | "texture";
  uri: string;
  mimeType: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export interface FontRef {
  id: FontId;
  family: string;
  source: "system" | "asset" | "url";
  assetId?: AssetId;
  uri?: string;
  weight?: number;
  style?: "normal" | "italic";
}

export interface TemplateVariable {
  key: string;
  label: string;
  targetNodeId: NodeId;
  path: string;
  type: "text" | "number" | "color" | "image" | "date";
  required?: boolean;
  defaultValue?: unknown;
}

export interface Metadata {
  createdBy?: string;
  updatedBy?: string;
  description?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
}

export interface DesignDocument {
  schemaVersion: string;
  documentId: DocumentId;
  title: string;
  createdAt: string;
  updatedAt: string;
  canvas: Canvas;
  pages: Page[];
  nodes: Record<NodeId, Node>;
  assets: Record<AssetId, AssetRef>;
  fonts: Record<FontId, FontRef>;
  variables: Record<string, TemplateVariable>;
  metadata: Metadata;
  themes?: Record<string, Theme>;
  layouts?: Record<string, SlideLayout>;
  activeThemeId?: string;
}
