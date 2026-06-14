# Export Service

GeekDesign exports are asynchronous tasks so the same pipeline can later support
high-resolution rendering, batches, presentation formats, retries, priorities,
and paid export limits.

## Pipeline

```text
Editor or API client
  -> save validated project
  -> POST /api/exports/{format}
  -> export_tasks row (queued)
  -> render worker claims task
  -> /render/{project_id}
  -> Playwright PDF or canvas screenshot
  -> exports storage adapter
  -> task completed with download URL
```

The API validates that the requesting user owns the project before creating a
task. Task status and download URLs are read through `GET /api/exports/{task_id}`.

## Formats

- PNG is immediately available in the editor through browser canvas download.
- PNG tasks are also modeled for future high-resolution and batch rendering.
- PDF uses Playwright to open the server-only render page and print at the exact
  design canvas dimensions.
- PPTX is intentionally not implemented, but the task format and worker dispatch
  boundaries allow it to be added without changing project storage.

## Server Render Page

`/render/{project_id}` contains only the rendered Design Document canvas. It has
no editor controls, selection overlays, hover state, or Command System behavior.
The page exposes `data-render-ready="true"` only after the canvas and image cache
are ready, so workers do not capture incomplete assets.

## Storage

Development exports are written to `apps/api/exports` and served under
`/exports`. The storage interface returns an opaque output key; a MinIO/S3
implementation can replace local storage without changing task or worker logic.

## Worker Boundary

`apps/render-worker` contains:

- `RenderWorker` task dispatch and failure recording
- `PlaywrightRenderer` PDF and PNG rendering
- `LocalExportStorage` development adapter

Queue claiming and database task updates remain adapter boundaries. Redis/RQ or
Celery can be introduced later without moving rendering into API request threads.
