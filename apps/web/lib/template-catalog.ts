import type { DesignDocument, TemplateVariable } from "@geekdesign/design-schema";

export interface TemplateSummary {
  id: string;
  title: string;
  category: string;
  tags: string[];
  style: string;
  thumbnail_url: string;
  variables: TemplateVariable[];
  premium: boolean;
  document_json: DesignDocument;
}

const textNode = (
  id: string,
  content: string,
  role: "title" | "date",
  fontSize: number,
  y: number,
) => ({
  id,
  type: "text" as const,
  parentId: "page_1",
  role,
  transform: {
    x: 120,
    y,
    width: 840,
    height: 140,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  },
  style: {
    opacity: 1,
    visible: true,
    locked: false,
    fill: { type: "solid" as const, color: "#ffffff" },
  },
  text: {
    content,
    fontFamily: "Inter",
    fontSize,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: "center" as const,
  },
});

const eventVariables: Record<string, TemplateVariable> = {
  title: {
    key: "title",
    label: "Event title",
    targetNodeId: "title_node",
    path: "text.content",
    type: "text",
    required: true,
    defaultValue: "Design Futures",
  },
  date: {
    key: "date",
    label: "Event date",
    targetNodeId: "date_node",
    path: "text.content",
    type: "date",
    defaultValue: "June 28, 2026",
  },
};

const eventDocument: DesignDocument = {
  schemaVersion: "0.1.0",
  documentId: "template_event_document",
  title: "Gradient Event Announcement",
  createdAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
  canvas: { width: 1080, height: 1080, unit: "px", dpi: 96 },
  pages: [
    {
      id: "page_1",
      name: "Page 1",
      background: {
        type: "linear-gradient",
        angle: 135,
        stops: [
          { offset: 0, color: "#1e1b4b" },
          { offset: 1, color: "#7c3aed" },
        ],
      },
      children: ["title_node", "date_node"],
    },
  ],
  nodes: {
    title_node: textNode("title_node", "Design Futures", "title", 84, 220),
    date_node: textNode("date_node", "June 28, 2026", "date", 34, 500),
  },
  assets: {},
  fonts: {},
  variables: eventVariables,
  metadata: { tags: ["event", "social"] },
};

export const templateCatalog: TemplateSummary[] = [
  {
    id: "template_event",
    title: "Gradient Event Announcement",
    category: "social",
    tags: ["event", "announcement", "gradient"],
    style: "bold",
    thumbnail_url: "/template-previews/event-gradient.svg",
    variables: Object.values(eventVariables),
    premium: false,
    document_json: eventDocument,
  },
  {
    id: "template_resume",
    title: "Minimal Product Resume",
    category: "professional",
    tags: ["resume", "minimal"],
    style: "minimal",
    thumbnail_url: "/template-previews/resume-minimal.svg",
    variables: [],
    premium: true,
    document_json: {
      ...structuredClone(eventDocument),
      documentId: "template_resume_document",
      title: "Minimal Product Resume",
      variables: {},
      metadata: { tags: ["resume", "professional"] },
    },
  },
];

export function fillLocalTemplate(
  template: TemplateSummary,
  values: Record<string, string>,
): DesignDocument {
  const document = structuredClone(template.document_json);
  Object.entries(values).forEach(([key, value]) => {
    const variable = document.variables[key];
    const node = variable ? document.nodes[variable.targetNodeId] : undefined;
    if (variable && node?.type === "text" && variable.path === "text.content") {
      node.text.content = value;
    }
  });
  const now = new Date().toISOString();
  document.documentId = `design_${Date.now().toString(36)}`;
  document.createdAt = now;
  document.updatedAt = now;
  return document;
}
