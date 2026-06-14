import { z } from "zod";

import { DESIGN_SCHEMA_VERSION } from "./constants";

const idSchema = z.string().min(1);
const finiteNumberSchema = z.number().finite();
const nonNegativeNumberSchema = finiteNumberSchema.nonnegative();
const positiveNumberSchema = finiteNumberSchema.positive();
const colorSchema = z.string().min(1);

export const nodeRoleSchema = z.enum([
  "background",
  "title",
  "subtitle",
  "body",
  "logo",
  "qr_code",
  "avatar",
  "date",
  "location",
  "button",
  "decoration",
  "section_title",
  "experience",
  "education",
  "skill",
]);

export const colorStopSchema = z
  .object({
    offset: z.number().min(0).max(1),
    color: colorSchema,
  })
  .strict();

const gradientStopsSchema = z.array(colorStopSchema).min(2);

export const paintSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: colorSchema }).strict(),
  z
    .object({
      type: z.literal("linear-gradient"),
      angle: finiteNumberSchema,
      stops: gradientStopsSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("radial-gradient"),
      stops: gradientStopsSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("image"),
      assetId: idSchema,
      fit: z.enum(["cover", "contain", "stretch"]),
    })
    .strict(),
]);

export const strokeSchema = z
  .object({
    paint: paintSchema,
    width: nonNegativeNumberSchema,
    dash: z.array(nonNegativeNumberSchema).optional(),
    lineCap: z.enum(["butt", "round", "square"]).optional(),
    lineJoin: z.enum(["miter", "round", "bevel"]).optional(),
  })
  .strict();

export const shadowSchema = z
  .object({
    color: colorSchema,
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
    blur: nonNegativeNumberSchema,
    spread: finiteNumberSchema,
  })
  .strict();

export const transformSchema = z
  .object({
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    width: nonNegativeNumberSchema,
    height: nonNegativeNumberSchema,
    rotation: finiteNumberSchema,
    scaleX: finiteNumberSchema,
    scaleY: finiteNumberSchema,
  })
  .strict();

export const nodeStyleSchema = z
  .object({
    opacity: z.number().min(0).max(1),
    visible: z.boolean(),
    locked: z.boolean(),
    fill: paintSchema.optional(),
    stroke: strokeSchema.optional(),
    shadow: shadowSchema.optional(),
    blendMode: z.enum(["normal", "multiply", "screen", "overlay"]).optional(),
  })
  .strict();

const baseNodeShape = {
  id: idSchema,
  parentId: idSchema,
  transform: transformSchema,
  style: nodeStyleSchema,
  role: nodeRoleSchema.optional(),
  name: z.string().min(1).optional(),
  data: z.record(z.unknown()).optional(),
};

export const textNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("text"),
    text: z
      .object({
        content: z.string(),
        fontFamily: z.string().min(1),
        fontSize: positiveNumberSchema,
        fontWeight: z.number().int().min(1).max(1000),
        lineHeight: positiveNumberSchema,
        letterSpacing: finiteNumberSchema,
        textAlign: z.enum(["left", "center", "right", "justify"]),
        fontId: idSchema.optional(),
      })
      .strict(),
  })
  .strict();

export const imageNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("image"),
    image: z
      .object({
        assetId: idSchema,
        fit: z.enum(["cover", "contain", "stretch"]),
        alt: z.string().optional(),
      })
      .strict(),
  })
  .strict();

export const rectNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("rect"),
    cornerRadius: nonNegativeNumberSchema,
  })
  .strict();

export const ellipseNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("ellipse"),
  })
  .strict();

export const lineNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("line"),
    line: z
      .object({
        x1: finiteNumberSchema,
        y1: finiteNumberSchema,
        x2: finiteNumberSchema,
        y2: finiteNumberSchema,
      })
      .strict(),
  })
  .strict();

export const svgNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("svg"),
    svg: z
      .object({
        assetId: idSchema,
        preserveAspectRatio: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const groupNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("group"),
    children: z.array(idSchema),
  })
  .strict();

export const frameNodeSchema = z
  .object({
    ...baseNodeShape,
    type: z.literal("frame"),
    children: z.array(idSchema),
    clipContent: z.boolean(),
  })
  .strict();

export const nodeSchema = z.discriminatedUnion("type", [
  textNodeSchema,
  imageNodeSchema,
  rectNodeSchema,
  ellipseNodeSchema,
  lineNodeSchema,
  svgNodeSchema,
  groupNodeSchema,
  frameNodeSchema,
]);

export const pageSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    background: paintSchema,
    children: z.array(idSchema),
  })
  .strict();

export const assetRefSchema = z
  .object({
    id: idSchema,
    type: z.enum(["image", "svg", "icon", "video", "audio", "texture"]),
    uri: z.string().min(1),
    mimeType: z.string().min(1),
    width: positiveNumberSchema.optional(),
    height: positiveNumberSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export const fontRefSchema = z
  .object({
    id: idSchema,
    family: z.string().min(1),
    source: z.enum(["system", "asset", "url"]),
    assetId: idSchema.optional(),
    uri: z.string().min(1).optional(),
    weight: z.number().int().min(1).max(1000).optional(),
    style: z.enum(["normal", "italic"]).optional(),
  })
  .strict();

export const templateVariableSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    targetNodeId: idSchema,
    path: z.string().min(1),
    type: z.enum(["text", "number", "color", "image", "date"]),
    required: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
  })
  .strict();

export const metadataSchema = z
  .object({
    createdBy: z.string().min(1).optional(),
    updatedBy: z.string().min(1).optional(),
    description: z.string().optional(),
    tags: z.array(z.string().min(1)).optional(),
    custom: z.record(z.unknown()).optional(),
  })
  .strict();

export const designDocumentSchema = z
  .object({
    schemaVersion: z.literal(DESIGN_SCHEMA_VERSION),
    documentId: idSchema,
    title: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    canvas: z
      .object({
        width: positiveNumberSchema,
        height: positiveNumberSchema,
        unit: z.enum(["px", "mm", "in"]),
        dpi: positiveNumberSchema,
      })
      .strict(),
    pages: z.array(pageSchema).min(1),
    nodes: z.record(nodeSchema),
    assets: z.record(assetRefSchema),
    fonts: z.record(fontRefSchema),
    variables: z.record(templateVariableSchema),
    metadata: metadataSchema,
  })
  .strict();
