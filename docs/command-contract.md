# Command Contract

GeekDesign uses one command vocabulary across the Web Editor, FastAPI, MCP
Server, and AI Agent Service. A command describes an intentional mutation; it
does not contain a replacement Design Document.

## Wire Envelope

The canonical wire version is `0.1.0`. New commands created by the TypeScript
factory include `schemaVersion`, and FastAPI accepts legacy clients without the
field by defaulting them to `0.1.0`.

```json
{
  "schemaVersion": "0.1.0",
  "id": "command_123",
  "type": "ROTATE_NODE",
  "designId": "design_123",
  "userId": "user_123",
  "timestamp": 1781510400000,
  "source": "user",
  "clientSequence": 12,
  "payload": {
    "nodeId": "title",
    "rotation": 15
  }
}
```

`packages/command-system` exports `COMMAND_SCHEMA_VERSION`, `commandTypes`,
and `commandJsonSchema`. `clientSequence` is reserved for ordering optimistic
cloud edits. The current backend validates it but does not yet reject stale
sequences.

## Supported Commands

Both TypeScript and FastAPI executors support:

- Node create, delete, update, atomic batch update, move, resize, and rotate
- Style and text updates
- Layer reorder, group, and ungroup
- Page add, delete, and background updates
- Asset registration and template-variable filling

Both executors apply a command to a controlled copy and validate the resulting
Design Document. Invalid commands must never partially change persisted state.

## Execution Paths

The Web Editor currently executes commands locally for responsive undo/redo,
then autosaves a validated document snapshot. MCP and Agent tools execute
commands through `POST /api/projects/{project_id}/commands`, which writes an
audit log and persists the validated result.

The next cloud step is to send each Web Editor command to that endpoint with a
monotonic `clientSequence`, retain optimistic local execution, and reconcile
the server acknowledgement. Conflict and stale-document behavior must be
defined before full-document autosave is removed.

## Compatibility

Adding optional envelope fields or a new command type can remain within
`0.1.0` while clients are in active development. Breaking payload semantics or
removing fields requires a new command schema version and explicit adapters in
the API, MCP Server, and Agent Service.
