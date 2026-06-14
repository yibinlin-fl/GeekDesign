import type { DesignDocument } from "../types";
import { validateDesignDocument } from "../validation";

export function migrate010To010(document: unknown): DesignDocument {
  return validateDesignDocument(document);
}
