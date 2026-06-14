# Web Editor MVP

The GeekDesign Web Editor is a Next.js client application that connects the
custom Design Schema, Scene Graph, Command System, and Canvas 2D Renderer into a
minimal usable visual editor.

## Routes

- `/editor` contains the design editor.
- `/templates` is the initial template browsing surface.
- `/projects` is the initial project list surface.

## State and Mutation Boundaries

Zustand stores the current validated Design Document and editor-only state such
as the selected node, hovered node, undo/redo availability, and local save
status. Selection and hover never enter the Design Document.

Components do not directly mutate documents. Toolbar actions, inspector
changes, and drag completion create Commands and execute them through
`CommandExecutor`. The store then publishes the executor's resulting document
snapshot for React and the renderer.

```text
React UI event
  -> editor store action
  -> typed Command
  -> CommandExecutor
  -> Scene Graph
  -> validated Design Document snapshot
  -> Zustand + Canvas2DRenderer
```

## Canvas Interaction

`CanvasStage` uses `Canvas2DRenderer` to draw the current document. Pointer hit
testing uses a temporary read-only Scene Graph built from the current snapshot.
Clicking selects the topmost selectable node. Dragging dispatches one controlled
position update when the pointer is released.

Selection and hover outlines are DOM overlays above the canvas. They are view
state only and are not exported or persisted.

## Persistence and Export

The MVP saves one validated document to browser `localStorage` and loads it
automatically when `/editor` opens. This is intentionally local-only until the
FastAPI project and version APIs are implemented.

PNG export uses the rendered HTML canvas directly in the browser. A future
export service can reuse Renderer Core for high-resolution server-side output.

## Current Scope

The MVP supports blank designs, text, rectangles, image placeholders, layer
selection, drag movement, text editing, font size, solid fill colors,
undo/redo, local save/load, and PNG export. The AI Assistant panel is a visual
placeholder; future AI actions must dispatch the same normal commands.

Until the Asset System and upload commands exist, an image placeholder is
represented by a styled rectangle rather than an `ImageNode` with an untrusted
or missing asset reference.
