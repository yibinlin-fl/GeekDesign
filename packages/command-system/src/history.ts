import type { HistoryEntry } from "./types";

const clone = <T>(value: T): T => structuredClone(value);

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  push(entry: HistoryEntry): void {
    this.undoStack.push(clone(entry));
    this.redoStack = [];
  }

  undo(): HistoryEntry | undefined {
    const entry = this.undoStack.pop();
    if (!entry) return undefined;
    this.redoStack.push(entry);
    return clone(entry);
  }

  redo(): HistoryEntry | undefined {
    const entry = this.redoStack.pop();
    if (!entry) return undefined;
    this.undoStack.push(entry);
    return clone(entry);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getHistory(): HistoryEntry[] {
    return clone(this.undoStack);
  }

  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
