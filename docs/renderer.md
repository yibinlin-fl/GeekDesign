# Renderer Core

Renderer Core defines how GeekDesign visual state is drawn. The initial
implementation uses Canvas 2D and keeps the public boundary small enough for a
future WebGL renderer and server-side export adapters.

## Relationship to Scene Graph

The Scene Graph is the authoritative operable design state. Renderers consume a
validated Design Document snapshot produced by that state and draw pages and
nodes in `children` order.

Renderer Core does not execute Commands, mutate nodes, manage selection, or
decide business behavior. A renderer may hold presentation-only session state,
such as the active canvas, zoom, pan offset, image cache, and loaded fonts.

## Why Renderer Does Not Own State

Keeping rendering separate from business state allows the editor, AI tools,
undo/redo, persistence, and collaboration to share one consistent design
model. Canvas redraws cannot silently change documents, and changing rendering
technology does not require changing saved designs.

`Canvas2DRenderer.renderDocument` validates and copies its input before drawing.
Node traversal follows page, group, and frame child order. Transforms are
applied recursively, while viewport zoom and pan are applied at page level.

## Canvas 2D Capabilities

The first Canvas 2D renderer includes:

- text, image, rectangle, ellipse, line, group, and frame rendering
- an SVG placeholder pending trusted SVG rasterization
- solid, linear-gradient, radial-gradient, and basic cached image paints
- image caching and font loading extension interfaces
- zoom, pan, clear, and coordinate conversion

Image loading remains external and asynchronous. The renderer asks the cache
for a loaded image and requests a load on cache miss; the host schedules the
next render when the asset becomes available.

## WebGL Evolution

`WebGLRenderer` currently implements the Renderer interface as an explicit TODO
boundary. Later milestones can add retained GPU resources, texture atlases,
batched geometry, filters, video, animation, and large-canvas optimizations
without changing the Design Schema or Command System.

## Export Service Reuse

The export service can reuse the Renderer contract with a server-provided
Canvas implementation or a headless browser. It loads the same validated
Design Document, assets, and fonts, sets an export viewport, renders the target
page, and encodes the resulting canvas to PNG or PDF. Higher-resolution exports
can scale the target canvas without altering design coordinates.
