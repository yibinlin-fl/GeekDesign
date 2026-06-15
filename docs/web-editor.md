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
position update when the pointer is released. During the drag, the editor
renders a transient document preview on animation frames; this preview is not
published to Zustand, persisted, or added to command history.

Selection and hover outlines are DOM overlays above the canvas. They are view
state only and are not exported or persisted.

The workspace automatically fits the page into the available editor area and
supports zoom controls, Ctrl/Cmd + wheel zoom, and Space + drag panning.
Selection handles provide resize and rotation previews. The final transform is
committed as one command when the pointer is released.

Keyboard actions include Delete/Backspace, arrow-key movement, Shift + arrow
movement, Ctrl/Cmd + D duplication, and Ctrl/Cmd + Z history navigation.

Double-clicking a text node opens an inline editor positioned over the canvas
node. Keystrokes remain local draft state while editing; blur or Ctrl/Cmd +
Enter commits one `UPDATE_TEXT` command, while Escape cancels the draft. Text
selection also exposes a contextual toolbar for font family, size, weight,
alignment, and color. Line height and letter spacing are available in the
Inspector.

## Persistence and Export

The MVP saves one validated document to browser `localStorage` and loads it
automatically when `/editor` opens. This is intentionally local-only until the
FastAPI project and version APIs are implemented.

PNG export uses the rendered HTML canvas directly in the browser. A future
export service can reuse Renderer Core for high-resolution server-side output.

## Current Scope

The MVP supports blank designs, text, rectangles, ellipses, lines, frames,
image placeholders, layer selection, drag movement, resize, rotation, keyboard
movement, duplication, deletion, precise transform fields, text editing, font
size, fills, strokes, opacity, shadows, locking, visibility, undo/redo, local
save/load, and PNG export. The AI Assistant panel is a visual placeholder;
future AI actions must dispatch the same normal commands.

The Asset Panel uploads trusted image types through the API, lists generated
thumbnails, and inserts real ImageNodes. A `REGISTER_ASSET` command first adds the
trusted AssetRef to the Design Document; image insertion and replacement then use
normal node commands so undo and redo remain available.

When the API is unavailable, the editor validates a selected or dropped local
image and stores its data URL as a local AssetRef. This allows PNG, JPEG, WebP,
and SVG images up to 10 MB to render immediately without Docker or a running
backend. Local images can be replaced and switched between cover, contain, and
stretch fit modes. Cloud upload remains the preferred persistent asset path.
