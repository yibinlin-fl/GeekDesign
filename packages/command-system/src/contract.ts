import type { CommandType } from "./types";

export const COMMAND_SCHEMA_VERSION = "0.1.0" as const;

export const commandTypes = [
  "CREATE_NODE",
  "DELETE_NODE",
  "UPDATE_NODE",
  "UPDATE_NODES",
  "MOVE_NODE",
  "RESIZE_NODE",
  "ROTATE_NODE",
  "SET_STYLE",
  "UPDATE_TEXT",
  "REORDER_NODE",
  "GROUP_NODES",
  "UNGROUP_NODES",
  "ADD_PAGE",
  "DELETE_PAGE",
  "SET_BACKGROUND",
  "REGISTER_ASSET",
  "FILL_TEMPLATE_VARIABLES",
] as const satisfies readonly CommandType[];

export const commandJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://geekdesign.dev/schemas/command/0.1.0.json",
  title: "GeekDesign Command",
  type: "object",
  required: [
    "schemaVersion",
    "id",
    "type",
    "designId",
    "userId",
    "timestamp",
    "source",
    "payload",
  ],
  properties: {
    schemaVersion: { const: COMMAND_SCHEMA_VERSION },
    id: { type: "string", minLength: 1 },
    type: { enum: commandTypes },
    designId: { type: "string", minLength: 1 },
    userId: { type: "string", minLength: 1 },
    timestamp: { type: "number" },
    source: { enum: ["user", "ai", "system"] },
    payload: { type: "object" },
    clientSequence: { type: "integer", minimum: 0 },
    requireConfirmation: { type: "boolean" },
  },
  additionalProperties: false,
} as const;
