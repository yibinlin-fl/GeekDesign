import { zodToJsonSchema } from "zod-to-json-schema";

import { designDocumentSchema } from "./schemas";

export const designDocumentJsonSchema = zodToJsonSchema(designDocumentSchema, {
  name: "DesignDocument",
  target: "jsonSchema7",
});
