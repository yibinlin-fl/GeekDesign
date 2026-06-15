# Presentation System

GeekDesign presentation capabilities build on the same renderer-independent
Design Document used by the visual editor. Presentation features must remain
editable, command-driven, and exportable rather than becoming flattened image
blobs.

## Delivered Foundation

- Image nodes support normalized crop rectangles shared by editor previews,
  thumbnails, Canvas rendering, and exports.
- Text nodes support optional rich-text ranges and paragraph metadata.
- Paragraph bullets are rendered and editable through the Web Editor.
- Pages support speaker notes, layout references, and transition metadata.
- Documents support reusable themes and slide layouts.
- Theme presets apply through an undoable `APPLY_THEME` Command.
- Semantic layout presets apply through an undoable `APPLY_LAYOUT` Command.
- Table and chart nodes store structured data and render through Canvas 2D.
- The Web Editor includes table/chart data editors and direct canvas crop drag.
- Pages store element entrance animations with an editor playback timeline.

All additions are optional and backward compatible with existing `0.1.0`
documents. Existing documents require no rewrite.

## Rich Text

`text.content` remains the canonical plain-text value for search, templates,
accessibility, and AI tools. Optional `runs` target character ranges for local
formatting. Optional `paragraphs` target ranges for bullets, indentation, and
spacing. Range validation prevents references outside canonical content.

The next editor milestone must preserve ranges while inserting and deleting
characters and expose selection-based formatting in the inline text editor.
Until then, replacing the complete text content intentionally clears existing
range formatting so stale ranges can never corrupt a document.

## Themes And Layouts

Themes define named color tokens and heading/body fonts. Layouts define semantic
placeholders using `NodeRole` and transforms. Pages reference layouts by id.
Applying a layout must be a Command that maps existing semantic nodes where
possible and creates only missing placeholders.

This structure is compatible with PPTX concepts such as themes, slide layouts,
and masters without making OOXML the storage format.

## Transitions And Animations

Page transitions are metadata and do not affect editing geometry. Element
animations use a page timeline keyed by stable node ids. The current runtime
supports fade-in, fly-in, and zoom-in previews. Animation playback creates
temporary render frames and never mutates the Scene Graph or Design Document.

## PPTX Pipeline

PPTX export should be implemented in two levels:

1. Image-based export for complete visual fidelity.
2. Editable export for supported text, image, shape, table, and chart nodes.

Unsupported effects must use documented fallback rendering. PPTX import should
parse OOXML into Design Schema nodes and preserve unsupported source fragments
only as metadata for round-trip diagnostics.

## Rendering Performance

Canvas 2D remains the compatibility renderer. Large-document work should add
dirty-region redraw, retained page thumbnails, image texture caching, and
visibility culling first. WebGL should then implement batched shapes, textures,
filters, and animation playback behind the existing Renderer contract.

An experimental WebGL2 renderer now supports page clears, solid rect/frame
rendering, viewport conversion, and explicit dirty-node redraw. It is not yet
the editor default because text, images, rotation, clipping, and batching still
require production implementations.
