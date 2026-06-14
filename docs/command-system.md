# Command System

Every GeekDesign mutation must flow through the Command System. The editor,
keyboard shortcuts, MCP tools, AI agent, background jobs, and future
collaboration layer all use the same validated execution path.

## Why All Operations Are Commands

Commands turn a design mutation into an explicit, auditable event. Each command
contains an id, type, design id, user id, timestamp, source, and typed payload.
This makes validation, permission checks, undo/redo, operation logs, replay,
analytics, and collaboration possible without coupling those concerns to UI
components.

High-risk commands can set `requireConfirmation`. The executor refuses them
unless the provided confirmation policy approves the exact command.

## Execution Flow

```text
Command
  -> validate envelope and payload
  -> verify design id and confirmation policy
  -> clone the current Scene Graph
  -> execute against the candidate graph
  -> validate the resulting Design Document
  -> record before/after document patches
  -> atomically publish the candidate graph
  -> append history
```

Invalid commands never modify the current Scene Graph and never enter history.
Commands with `source: "ai"` follow exactly the same validation and execution
path as user and system commands.

The executor owns the authoritative Scene Graph instance for its command
session. Consumers read current state through `getSceneGraph()` or
`toDocument()` rather than retaining and mutating the graph passed into the
constructor.

## Undo and Redo

Each successful command records complete validated Design Document snapshots as
its initial before/after patch format. `undo` restores the before document and
moves the history entry to the redo stack. `redo` restores the after document
and returns it to the undo stack.

Snapshots are intentionally simple and reliable for the first version. Future
versions can replace them with compact structural patches or inverse commands
without changing the public command contract.

## Why AI Cannot Edit JSON Directly

Direct JSON editing could create orphan nodes, invalid assets, broken template
variables, or changes that cannot be undone or attributed. AI tools instead
create normal commands such as `UPDATE_TEXT`, `MOVE_NODE`, `SET_STYLE`, or
`FILL_TEMPLATE_VARIABLES`. Semantic node roles help AI identify targets, while
the Command System controls the mutation.

## Collaboration Evolution

Later collaboration support can attach sequence numbers, actor ids, operation
ids, permissions, and conflict metadata to commands. Commands can be persisted
as an append-only operation log and translated into patches or CRDT operations.
The Scene Graph remains the validated execution target, and remote operations
still pass through the same command validation rules.
