import type {
  Command,
  CommandPayloadMap,
  CommandSource,
  CommandType,
} from "./types";
import { COMMAND_SCHEMA_VERSION } from "./contract";

const createId = (): string =>
  `command_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export function createCommand<T extends CommandType>(
  input: Omit<Command<T>, "id" | "timestamp"> & {
    id?: string;
    timestamp?: number;
  },
): Command<T> {
  return {
    ...input,
    schemaVersion: input.schemaVersion ?? COMMAND_SCHEMA_VERSION,
    id: input.id ?? createId(),
    timestamp: input.timestamp ?? Date.now(),
  } as Command<T>;
}

interface HelperContext {
  designId: string;
  userId: string;
  source?: CommandSource;
  requireConfirmation?: boolean;
}

const helper = <T extends CommandType>(
  type: T,
  context: HelperContext,
  payload: CommandPayloadMap[T],
): Command<T> =>
  createCommand({
    type,
    designId: context.designId,
    userId: context.userId,
    source: context.source ?? "user",
    payload,
    ...(context.requireConfirmation === undefined
      ? {}
      : { requireConfirmation: context.requireConfirmation }),
  } as Omit<Command<T>, "id" | "timestamp">);

export const updateTextCommand = (
  context: HelperContext,
  payload: CommandPayloadMap["UPDATE_TEXT"],
): Command<"UPDATE_TEXT"> => helper("UPDATE_TEXT", context, payload);

export const moveNodeCommand = (
  context: HelperContext,
  payload: CommandPayloadMap["MOVE_NODE"],
): Command<"MOVE_NODE"> => helper("MOVE_NODE", context, payload);

export const setStyleCommand = (
  context: HelperContext,
  payload: CommandPayloadMap["SET_STYLE"],
): Command<"SET_STYLE"> => helper("SET_STYLE", context, payload);

export const deleteNodeCommand = (
  context: HelperContext,
  payload: CommandPayloadMap["DELETE_NODE"],
): Command<"DELETE_NODE"> =>
  helper(
    "DELETE_NODE",
    { ...context, requireConfirmation: context.requireConfirmation ?? true },
    payload,
  );
