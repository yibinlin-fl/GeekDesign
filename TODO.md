# GeekDesign TODO

Last updated: 2026-06-15

This file is the primary continuation guide for the next development session.
Read `AGENTS.md`, this file, and the latest Git commits before starting work.

## Current Product State

The editor now has a usable visual foundation:

- Custom Design Schema, Scene Graph, Command System, and Canvas 2D Renderer
- Text, rectangles, ellipses, lines, frames, real uploaded/local images
- Selection, drag, resize, rotate, keyboard movement, duplicate, and delete
- Inline text editing and typography controls
- Page thumbnails and multi-page add, switch, duplicate, delete, and background
- Undo/redo, local save/load, cloud project autosave, PNG/PDF export foundations
- Template, asset, project, authentication, AI Agent, and MCP foundations

Recent editor milestone commits:

- `8c6701a feat(editor): add canvas viewport and transform controls`
- `371790d feat(editor): add shapes and local image workflow`
- `4876d64 feat(editor): add inline text editing and typography tools`
- `4b1ca94 feat(editor): add multi-page design workflow`
- `pending feat(editor): add multi-select alignment and layer controls`

## Is The Editor Already PowerPoint-Level?

No. The frontend Command System has a solid extensible foundation, but the UI
does not yet expose the range or polish of PowerPoint, Canva, or Figma.

Already supported by the TypeScript Command System:

- Create, delete, update, move, resize, rotate, and style nodes
- Update text
- Reorder layers
- Group and ungroup nodes
- Add and delete pages
- Set page backgrounds
- Register assets
- Fill template variables
- Validate, execute, undo, redo, history, source attribution, and confirmation

Already exposed in the Web Editor:

- Create common nodes and insert images
- Single-node selection
- Move, resize, rotate, duplicate, delete
- Basic text and appearance editing
- Multi-page workflow
- Undo and redo

Important missing PowerPoint-like operations:

- Multi-select and marquee selection
- Align and distribute multiple elements
- Smart guides, snapping, grid settings, and spacing indicators
- Bring forward, send backward, bring to front, and send to back UI
- Group and ungroup UI
- Copy, cut, paste, paste-in-place, and clipboard interoperability
- Context menus and a richer keyboard shortcut system
- Aspect-ratio locking, flip, crop, masking, and image adjustments
- Rich text ranges, bullets, numbering, auto-fit text, and text boxes
- Tables, charts, icons, editable SVG, connectors, and arrows
- Slide layouts, themes, masters, speaker notes, and sections
- Transitions, animations, comments, and collaboration
- Editable PPTX import/export

## Current Frontend And Backend Command Connection

There are currently two command executors with similar concepts but different
capabilities.

### Web Editor Path

```text
React UI
  -> Zustand editor action
  -> packages/command-system TypeScript CommandExecutor
  -> packages/scene-graph
  -> validated DesignDocument snapshot
  -> Canvas renderer
```

The TypeScript executor is the most complete implementation and owns local
undo/redo. For cloud projects, the editor currently autosaves the resulting
complete `document_json` through `/api/projects/{id}/autosave`.

Therefore, normal Web Editor changes do not currently send their individual
Commands to the backend Command API.

### MCP And AI Path

```text
MCP Tool or Agent Tool
  -> POST /api/projects/{id}/commands
  -> FastAPI Python command executor
  -> validate resulting document
  -> persist document_json
  -> write CommandLog
```

The backend Python executor currently supports only:

- `CREATE_NODE`
- `UPDATE_NODE`
- `UPDATE_TEXT`
- `SET_STYLE`
- `FILL_TEMPLATE_VARIABLES`

MCP is functional, but it can only use this backend subset. It cannot currently
perform deletion, rotation, hierarchy movement, layer reordering, grouping, or
page operations.

### Main Architecture Gap

The frontend and backend share command names and document concepts, but they do
not yet share one canonical command contract or equivalent execution behavior.
Undo/redo history is local to the Web Editor and is not persisted as a backend
operation stream.

## Next Stage: Professional Manipulation UI

Goal: expose the capabilities users expect from a serious slide editor before
adding more content types.

- [x] Add ordered `selectedNodeIds` while retaining a primary selection
- [x] Add Shift-click multi-select
- [x] Add drag marquee selection
- [x] Render one combined multi-selection bounding box
- [x] Move multiple selected elements as one undoable operation
- [x] Add align left, center, right, top, middle, bottom
- [x] Add distribute horizontally and vertically
- [x] Add bring forward, send backward, bring to front, send to back
- [x] Add group and ungroup UI
- [ ] Add smart guides and edge/center snapping
- [x] Add configurable grid visibility and snap settings
- [x] Add copy, cut, paste, and paste-in-place
- [x] Add context menu for common operations
- [x] Resize multiple selected elements as one undoable operation

Acceptance criteria:

- Every mutation goes through the TypeScript Command System.
- One drag or multi-element transform creates one history entry.
- Alignment and distribution are deterministic and covered by unit tests.
- Playwright covers multi-select, align, group, reorder, and undo/redo.

Suggested commit:

```text
feat(editor): add multi-select alignment and layer controls
```

## Following Stage: Unify Command Contracts And Cloud Execution

Goal: make Web Editor, MCP, AI Agent, and backend persistence use equivalent
validated Commands.

- [ ] Define a canonical versioned Command schema
- [ ] Export Command JSON Schema from `packages/command-system`
- [ ] Add command schema version and optional client sequence fields
- [ ] Expand FastAPI CommandRequest to every TypeScript command type
- [ ] Implement backend parity for delete, move, resize, rotate, reorder, group,
      ungroup, assets, and pages
- [ ] Add shared golden command fixtures executed by TypeScript and Python tests
- [ ] Verify both executors produce equivalent Design Documents
- [ ] Send Web Editor cloud mutations to `/projects/{id}/commands`
- [ ] Keep optimistic local execution, then reconcile server acknowledgement
- [ ] Persist operation metadata and command ordering
- [ ] Define server conflict and stale-document behavior
- [ ] Expose the expanded commands through MCP and Agent tools

Recommended direction:

- Keep the TypeScript Command System as the canonical behavior specification.
- Generate JSON Schema for the wire contract.
- Maintain a Python backend executor with parity tests until a shared
  TypeScript command service is introduced.
- Do not let the backend accept arbitrary full-document replacement as the
  normal editing path.

Acceptance criteria:

- The same command fixture produces equivalent frontend and backend documents.
- Web cloud edits are recorded as commands, not only whole-document autosaves.
- MCP can perform page, layer, grouping, transform, and deletion operations.
- Invalid or unauthorized commands never modify persisted projects.

Suggested commit:

```text
feat(command): unify backend command execution and mcp coverage
```

## Later Stage: Rich Slide Content

- [ ] Extend Design Schema with rich text and text ranges
- [ ] Add bullets, numbering, indentation, and text auto-fit
- [ ] Add arrows, connectors, icons, editable SVG, and QR code nodes
- [ ] Add tables and charts with structured data
- [ ] Add image crop, mask, flip, filters, and adjustments
- [ ] Add slide layouts, themes, masters, sections, and speaker notes
- [ ] Add reusable components and brand kits
- [ ] Add schema migrations and fixtures for every new node type

Suggested commit:

```text
feat(editor): add rich slide content and layout tools
```

## Later Stage: PPTX And Advanced Export

- [ ] Export all pages as multi-page PDF
- [ ] Export high-resolution PNG per page
- [ ] Export image-based PPTX first
- [ ] Export editable PPTX for supported node types
- [ ] Define fallback rendering for unsupported effects
- [ ] Add PPTX import research and compatibility matrix
- [ ] Add batch export and ZIP packaging

Suggested commit:

```text
feat(export): add multi-page and pptx export pipeline
```

## Later Stage: Performance And Collaboration

- [ ] Replace full before/after history snapshots with compact patches
- [ ] Add command batching and transactions
- [ ] Add renderer dirty-region updates and layered caching
- [ ] Improve rotated and nested-node bounding boxes and hit testing
- [ ] Add persistent command log replay
- [ ] Add comments, team roles, and approval workflow
- [ ] Add collaboration sequencing, conflict handling, then CRDT research
- [ ] Add rate limiting, centralized audit logs, and production queues

## Known Technical Debt

- `docs/project-status.md` is outdated and still describes the editor before the
  latest four visual editor stages.
- The backend Python command executor duplicates TypeScript behavior manually.
- Backend Command API has no persisted undo/redo operation model.
- Web Editor cloud autosave sends complete documents instead of commands.
- Page duplication is currently implemented as multiple commands rather than
  one transaction, so undo acts on each internal step separately.
- Node duplication does not yet support duplicating groups or frames from the
  normal selection action.
- Scene Graph rotated bounding boxes are still simplified.
- PDF/export behavior needs explicit multi-page verification.
- SVG upload sanitization remains a production security TODO.

## Start Here Tomorrow

Recommended next task: **Professional Manipulation UI**.

Start by changing editor-only selection state from:

```ts
selectedNodeId?: string
```

to:

```ts
selectedNodeIds: string[]
```

Then implement Shift-click multi-select and a combined selection box before
building alignment, distribution, grouping, and layer controls.

Files to inspect first:

- `apps/web/lib/editor-store.ts`
- `apps/web/components/editor/canvas-stage.tsx`
- `apps/web/components/editor/editor-shell.tsx`
- `packages/command-system/src/types.ts`
- `packages/command-system/src/executor.ts`
- `packages/scene-graph/src/scene-graph.ts`
- `apps/api/app/modules/commands`
- `apps/mcp-server/src/tools.ts`

Verification commands:

```powershell
pnpm lint
pnpm test
pnpm typecheck
pnpm --filter @geekdesign/web test:e2e
```

API verification from `apps/api`:

```powershell
pytest
ruff check .
ruff format . --check
```
