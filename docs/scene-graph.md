# Scene Graph Engine

The Scene Graph is GeekDesign's authoritative, operable in-memory design state.
It is built from a validated Design Document and exposes controlled tree
operations for the editor, Command System, renderers, MCP tools, and AI agent.

## Relationship to Design Schema

The Design Schema defines the durable renderer-independent document contract.
The Scene Graph does not introduce a second storage format. It loads a validated
deep copy of a `DesignDocument`, operates on that copy, and serializes back to
the same schema.

Every mutation is applied to a candidate copy and passed through
`validateDesignDocument` before becoming current state. Failed operations leave
the existing scene unchanged. Callers also receive copies from query methods,
so they cannot mutate graph state outside controlled operations.

## Maintaining the Node Tree

Nodes live in `document.nodes`, keyed by stable node id. Tree membership and
ordering live in:

- `page.children` for top-level nodes
- `group.children` and `frame.children` for nested nodes

`parentId` must agree with the containing `children` array. Only pages, groups,
and frames can contain children. Moving a node updates both sides of this
relationship and rejects moves that would create a cycle or orphan.

Deleting a group or frame recursively deletes all descendants. Template
variables targeting deleted nodes are removed at the same time.

## Stacking Order

Children earlier in an array render below children later in the array. This is
the Scene Graph's z-index rule. `addNode`, `moveNode`, and `reorderNode` update
the relevant children array while preserving all other sibling order.

## Bounding Boxes and Hit Testing

Bounding boxes use composed 2D matrices, including nested group/frame
translation, rotation, and scale. `getBoundingBox` transforms all four node
corners and returns their world-space axis-aligned bounds.

`hitTest` walks children in reverse stacking order, visiting nested children
before their container. Points are transformed back into each node's local
coordinate system, so rotated rectangles and ellipses are tested against their
real geometry rather than only their axis-aligned bounds. The first matching
topmost node is returned. Hidden, fully transparent, or locked ancestors
suppress hits for their descendants. Clipped frames suppress descendant hits
outside the frame.

## AI Element Tree Access

AI and MCP tools can read a stable element tree through `getChildren`,
`getAncestors`, `getDescendants`, `findNodesByRole`, and
`findTextNodesByContent`. Semantic roles let an AI locate elements such as the
title, logo, date, or location without guessing from coordinates.

AI writes must still be translated into Command System operations. The Scene
Graph is the controlled execution target, not a bypass around commands.
