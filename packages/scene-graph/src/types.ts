import type { Node } from "@geekdesign/design-schema";

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

export type NodePatch = DeepPartial<Node>;

export class SceneGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneGraphError";
  }
}
