import type { Command, CommandSource, CommandType } from "./types";
import { COMMAND_SCHEMA_VERSION } from "./contract";
import { CommandValidationError } from "./errors";

const commandTypes = new Set<CommandType>([
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
  "UPDATE_PAGE",
  "DELETE_PAGE",
  "SET_BACKGROUND",
  "APPLY_THEME",
  "APPLY_LAYOUT",
  "REGISTER_ASSET",
  "FILL_TEMPLATE_VARIABLES",
]);

const commandSources = new Set<CommandSource>(["user", "ai", "system"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (value: unknown, name: string): void => {
  if (typeof value !== "string" || value.length === 0) {
    throw new CommandValidationError(`${name} must be a non-empty string`);
  }
};

const requireFinite = (value: unknown, name: string): void => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CommandValidationError(`${name} must be a finite number`);
  }
};

export function validateCommand(input: unknown): Command {
  if (!isRecord(input))
    throw new CommandValidationError("Command must be an object");
  requireString(input.id, "command.id");
  requireString(input.designId, "command.designId");
  requireString(input.userId, "command.userId");
  requireFinite(input.timestamp, "command.timestamp");
  if (
    input.schemaVersion !== undefined &&
    input.schemaVersion !== COMMAND_SCHEMA_VERSION
  ) {
    throw new CommandValidationError(
      `Unsupported command schemaVersion "${String(input.schemaVersion)}"`,
    );
  }
  if (
    input.clientSequence !== undefined &&
    (typeof input.clientSequence !== "number" ||
      !Number.isInteger(input.clientSequence) ||
      input.clientSequence < 0)
  ) {
    throw new CommandValidationError(
      "command.clientSequence must be a non-negative integer",
    );
  }

  if (!commandTypes.has(input.type as CommandType)) {
    throw new CommandValidationError(
      `Unsupported command type "${String(input.type)}"`,
    );
  }
  if (!commandSources.has(input.source as CommandSource)) {
    throw new CommandValidationError(
      `Unsupported command source "${String(input.source)}"`,
    );
  }
  if (!isRecord(input.payload))
    throw new CommandValidationError("command.payload must be an object");
  if (
    input.requireConfirmation !== undefined &&
    typeof input.requireConfirmation !== "boolean"
  ) {
    throw new CommandValidationError(
      "command.requireConfirmation must be a boolean",
    );
  }

  const payload = input.payload;
  switch (input.type as CommandType) {
    case "CREATE_NODE":
      requireString(payload.parentId, "payload.parentId");
      if (!isRecord(payload.node))
        throw new CommandValidationError("payload.node must be an object");
      break;
    case "DELETE_NODE":
    case "UNGROUP_NODES":
      requireString(
        payload[input.type === "DELETE_NODE" ? "nodeId" : "groupId"],
        "payload node id",
      );
      break;
    case "UPDATE_NODE":
      requireString(payload.nodeId, "payload.nodeId");
      if (!isRecord(payload.patch))
        throw new CommandValidationError("payload.patch must be an object");
      break;
    case "UPDATE_NODES":
      if (!Array.isArray(payload.updates) || payload.updates.length === 0) {
        throw new CommandValidationError(
          "payload.updates must contain at least one update",
        );
      }
      payload.updates.forEach((update) => {
        if (!isRecord(update))
          throw new CommandValidationError(
            "payload.updates[] must be an object",
          );
        requireString(update.nodeId, "payload.updates[].nodeId");
        if (!isRecord(update.patch))
          throw new CommandValidationError(
            "payload.updates[].patch must be an object",
          );
      });
      break;
    case "MOVE_NODE":
      requireString(payload.nodeId, "payload.nodeId");
      requireString(payload.newParentId, "payload.newParentId");
      break;
    case "RESIZE_NODE":
      requireString(payload.nodeId, "payload.nodeId");
      requireFinite(payload.width, "payload.width");
      requireFinite(payload.height, "payload.height");
      if ((payload.width as number) < 0 || (payload.height as number) < 0) {
        throw new CommandValidationError(
          "Resize dimensions must be non-negative",
        );
      }
      break;
    case "ROTATE_NODE":
      requireString(payload.nodeId, "payload.nodeId");
      requireFinite(payload.rotation, "payload.rotation");
      break;
    case "SET_STYLE":
      requireString(payload.nodeId, "payload.nodeId");
      if (!isRecord(payload.style))
        throw new CommandValidationError("payload.style must be an object");
      break;
    case "UPDATE_TEXT":
      requireString(payload.nodeId, "payload.nodeId");
      if (typeof payload.content !== "string") {
        throw new CommandValidationError("payload.content must be a string");
      }
      break;
    case "REORDER_NODE":
      requireString(payload.parentId, "payload.parentId");
      requireString(payload.nodeId, "payload.nodeId");
      requireFinite(payload.newIndex, "payload.newIndex");
      break;
    case "GROUP_NODES":
      if (!Array.isArray(payload.nodeIds) || payload.nodeIds.length === 0) {
        throw new CommandValidationError(
          "payload.nodeIds must contain at least one node id",
        );
      }
      payload.nodeIds.forEach((nodeId) =>
        requireString(nodeId, "payload.nodeIds[]"),
      );
      requireString(payload.groupId, "payload.groupId");
      break;
    case "ADD_PAGE":
      if (!isRecord(payload.page))
        throw new CommandValidationError("payload.page must be an object");
      break;
    case "UPDATE_PAGE":
      requireString(payload.pageId, "payload.pageId");
      if (!isRecord(payload.patch))
        throw new CommandValidationError("payload.patch must be an object");
      break;
    case "DELETE_PAGE":
    case "SET_BACKGROUND":
      requireString(payload.pageId, "payload.pageId");
      if (input.type === "SET_BACKGROUND" && !isRecord(payload.background)) {
        throw new CommandValidationError(
          "payload.background must be an object",
        );
      }
      break;
    case "FILL_TEMPLATE_VARIABLES":
      if (!isRecord(payload.values))
        throw new CommandValidationError("payload.values must be an object");
      break;
    case "REGISTER_ASSET":
      if (!isRecord(payload.asset))
        throw new CommandValidationError("payload.asset must be an object");
      requireString(payload.asset.id, "payload.asset.id");
      requireString(payload.asset.uri, "payload.asset.uri");
      requireString(payload.asset.mimeType, "payload.asset.mimeType");
      break;
    case "APPLY_THEME":
      if (!isRecord(payload.theme))
        throw new CommandValidationError("payload.theme must be an object");
      requireString(payload.theme.id, "payload.theme.id");
      break;
    case "APPLY_LAYOUT":
      requireString(payload.pageId, "payload.pageId");
      if (!isRecord(payload.layout))
        throw new CommandValidationError("payload.layout must be an object");
      requireString(payload.layout.id, "payload.layout.id");
      break;
  }

  return input as Command;
}
