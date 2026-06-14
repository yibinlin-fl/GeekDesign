import { z } from "zod";

export const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const confirmationSchema = z.boolean().optional().default(false);

export const projectSchema = z.object({ project_id: idSchema }).strict();
export const nodeSchema = z
  .object({ project_id: idSchema.optional(), node_id: idSchema })
  .strict();
export const paintSchema = z
  .object({ type: z.literal("solid"), color: colorSchema })
  .strict();
export const styleSchema = z
  .object({
    opacity: z.number().min(0).max(1).optional(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
    fill: paintSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "style must not be empty");
