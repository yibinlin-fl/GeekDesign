import type { AuditEntry, AuditLogger } from "./types";

export class MemoryAuditLogger implements AuditLogger {
  readonly entries: AuditEntry[] = [];

  write(entry: AuditEntry): void {
    this.entries.push(entry);
  }
}

export class StderrAuditLogger implements AuditLogger {
  write(entry: AuditEntry): void {
    process.stderr.write(
      `${JSON.stringify({ event: "mcp_tool_audit", ...entry })}\n`,
    );
  }
}
