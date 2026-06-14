# GeekDesign UI Design System

GeekDesign uses a calm, modern visual language inspired by professional online
creative tools without copying their internal UI.

## Product Shell

- Dark editor chrome keeps the canvas visually dominant.
- White resource and property panels separate creation tools from inspection.
- Violet-to-fuchsia gradients identify primary actions and AI capabilities.
- Rounded 12-24px surfaces and restrained shadows establish clear hierarchy.

## Editor Layout

The editor has five stable regions:

1. Top toolbar for document actions, history, save, AI, and export.
2. Left tool dock for switching creation contexts.
3. Resource panel for elements, layers, uploads, and search.
4. Central canvas workspace with a compact contextual toolbar.
5. Right inspector for selected element properties.

Selection and hover state remain editor-only state. Design changes continue to
flow through the Command System.

## Interaction Rules

- Primary actions use the brand gradient.
- Destructive actions use rose text and require confirmation.
- Tool buttons always expose accessible labels.
- Loading, empty, offline, and error states are designed as first-class states.
- Existing editor commands keep stable accessible names for automation tests.

## Local Development

Windows users can run `scripts/start-windows.ps1`. It initializes the local
SQLite database, starts FastAPI and Next.js, and opens the app without Docker.
