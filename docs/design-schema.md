# Design Schema

GeekDesign stores designs in its own renderer-independent document format. The
schema is the contract shared by the editor, scene graph, command system,
renderers, persistence layer, export workers, MCP tools, and AI agent.

## Why Not Konva or Fabric JSON

Konva and Fabric object formats describe the implementation details of a
specific renderer. Persisting those formats would couple every saved design to
one rendering library and make renderer replacement, server-side export,
version migration, collaboration, and controlled AI editing harder.

GeekDesign instead owns a stable Design Schema. Canvas 2D, future WebGL, SVG,
PDF, and PPTX renderers can all interpret the same document without becoming
the source of truth.

## Document Structure

A `DesignDocument` contains:

- `schemaVersion`, identity, timestamps, and canvas settings
- an ordered `pages` array
- a `nodes` Record keyed by node id
- asset and font reference Records
- template variables and metadata

Each page stores its top-level stacking order in `page.children`. Groups and
frames store their nested stacking order in their own `children` arrays. Later
items render above earlier items.

Every node has `id`, `type`, `parentId`, `transform`, and `style`. Node-specific
data is stored under discriminated fields such as `text`, `image`, `svg`, or
`line`.

## Why Nodes Use a Record

`Record<NodeId, Node>` provides direct id lookup without scanning an array.
This is important because editor commands, MCP tools, AI operations, history
patches, and future collaboration updates all target stable node ids. Ordering
belongs to parent `children` arrays rather than the node storage container.

## Semantic Roles

The optional `role` field describes design intent, including `title`, `body`,
`logo`, `qr_code`, `date`, and `location`. Roles remain meaningful when text,
position, and styling change.

An AI request such as “make the title larger” can find the node whose role is
`title` and issue a validated resize or typography command. It does not need to
guess from coordinates or directly rewrite the document JSON.

## Validation

`validateDesignDocument` first runs strict Zod validation and then verifies
cross-document invariants:

- Record keys match contained ids
- pages have unique ids
- every node has a valid parent
- each node appears exactly once in its parent's `children`
- child `parentId` values match their containing page, group, or frame
- referenced assets, fonts, and template targets exist

The package also exports `designDocumentJsonSchema` for external systems that
need JSON Schema validation or tool contract generation.

## Version Migration

Every persisted document includes `schemaVersion`. Migrations live in
`packages/design-schema/src/migrations` and must transform one known version to
the next without silently discarding data. The initial
`migrate010To010` migration is a validating no-op and establishes the migration
interface.

Breaking schema changes require a migration and tests for both the old input
and new output. Services should migrate documents before constructing a Scene
Graph.

Presentation-oriented optional fields extend the same stable model:

- image crop rectangles use normalized source coordinates
- rich-text runs and paragraph styles target canonical text ranges
- pages carry speaker notes, layout references, and transitions
- documents carry reusable themes and slide layouts
- tables and charts remain structured editable nodes

These fields do not depend on PPTX OOXML. Import and export adapters translate
between OOXML and the Design Schema while the editor keeps one canonical model.
