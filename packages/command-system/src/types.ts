import type {
  AssetRef,
  DesignDocument,
  Node,
  NodeId,
  NodeStyle,
  Page,
  PageId,
  Paint,
  SlideLayout,
  Theme,
} from "@geekdesign/design-schema";
import type { NodePatch, SceneGraph } from "@geekdesign/scene-graph";

export type CommandSource = "user" | "ai" | "system";

export type CommandType =
  | "CREATE_NODE"
  | "DELETE_NODE"
  | "UPDATE_NODE"
  | "UPDATE_NODES"
  | "MOVE_NODE"
  | "RESIZE_NODE"
  | "ROTATE_NODE"
  | "SET_STYLE"
  | "UPDATE_TEXT"
  | "REORDER_NODE"
  | "GROUP_NODES"
  | "UNGROUP_NODES"
  | "ADD_PAGE"
  | "UPDATE_PAGE"
  | "DELETE_PAGE"
  | "SET_BACKGROUND"
  | "APPLY_THEME"
  | "APPLY_LAYOUT"
  | "REGISTER_ASSET"
  | "FILL_TEMPLATE_VARIABLES";

export interface CommandPayloadMap {
  CREATE_NODE: { parentId: PageId | NodeId; node: Node; index?: number };
  DELETE_NODE: { nodeId: NodeId };
  UPDATE_NODE: { nodeId: NodeId; patch: NodePatch };
  UPDATE_NODES: { updates: Array<{ nodeId: NodeId; patch: NodePatch }> };
  MOVE_NODE: { nodeId: NodeId; newParentId: PageId | NodeId; index?: number };
  RESIZE_NODE: { nodeId: NodeId; width: number; height: number };
  ROTATE_NODE: { nodeId: NodeId; rotation: number };
  SET_STYLE: { nodeId: NodeId; style: Partial<NodeStyle> };
  UPDATE_TEXT: { nodeId: NodeId; content: string };
  REORDER_NODE: { parentId: PageId | NodeId; nodeId: NodeId; newIndex: number };
  GROUP_NODES: {
    nodeIds: NodeId[];
    groupId: NodeId;
    name?: string;
    index?: number;
  };
  UNGROUP_NODES: { groupId: NodeId };
  ADD_PAGE: { page: Page; index?: number };
  UPDATE_PAGE: {
    pageId: PageId;
    patch: Partial<
      Pick<Page, "name" | "notes" | "layoutId" | "transition" | "animations">
    >;
  };
  DELETE_PAGE: { pageId: PageId };
  SET_BACKGROUND: { pageId: PageId; background: Paint };
  APPLY_THEME: { theme: Theme };
  APPLY_LAYOUT: { pageId: PageId; layout: SlideLayout };
  REGISTER_ASSET: { asset: AssetRef };
  FILL_TEMPLATE_VARIABLES: { values: Record<string, unknown> };
}

export type Command<T extends CommandType = CommandType> = {
  [Key in T]: {
    schemaVersion?: "0.1.0";
    id: string;
    type: Key;
    designId: string;
    userId: string;
    timestamp: number;
    source: CommandSource;
    payload: CommandPayloadMap[Key];
    requireConfirmation?: boolean;
    clientSequence?: number;
  };
}[T];

export interface DocumentPatch {
  document: DesignDocument;
}

export interface CommandResult {
  command: Command;
  before: DocumentPatch;
  after: DocumentPatch;
  executedAt: number;
}

export interface CommandContext {
  sceneGraph: SceneGraph;
  designId?: string;
  confirm?: (command: Command) => boolean;
}

export interface HistoryEntry extends CommandResult {}
