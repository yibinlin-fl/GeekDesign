# GeekDesign API

The FastAPI service in `apps/api` provides the first persistence boundary for the
GeekDesign editor. It stores Design Documents, project versions, template metadata,
asset metadata, and queued export tasks. Rendering and design mutations remain owned
by the renderer and Command System.

## Development

From `apps/api`:

```bash
python -m pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Configuration comes from environment variables. Copy the repository `.env.example`
values into your local environment before connecting to PostgreSQL.

## Response Envelope

Every API response uses the same envelope:

```json
{
  "success": true,
  "data": {},
  "message": "ok"
}
```

Errors set `success` to `false` and use the appropriate HTTP status code.

## Authentication Boundary

Routes currently use a mock user dependency from `app/core/auth.py`. Replacing it
with verified authentication will not require changing project, asset, or export
route signatures.

## Design Document Validation

`projects.document_json` and `project_versions.document_json` store the platform's
custom Design Document JSON. Before persistence, the API validates:

- `schemaVersion` is supported.
- Canvas and page structure are present.
- Node IDs match their record keys.
- Every node references a valid parent and appears exactly once in parent children.

This is intentionally a basic server-side compatibility guard. The TypeScript
`packages/design-schema` package remains the full schema authority.

## Endpoints

| Method   | Path                                 | Purpose                                |
| -------- | ------------------------------------ | -------------------------------------- |
| GET      | `/health`                            | Service health                         |
| POST/GET | `/api/projects`                      | Create or list projects                |
| GET/PUT  | `/api/projects/{id}`                 | Load or save a project                 |
| POST     | `/api/projects/{id}/versions`        | Save an immutable document version     |
| GET      | `/api/template-categories`           | List template categories               |
| GET      | `/api/templates`                     | List templates                         |
| GET      | `/api/templates/{id}`                | Load a template                        |
| POST     | `/api/templates/{id}/create-project` | Fill variables and create a project    |
| POST     | `/api/assets/upload`                 | Validate and persist an uploaded image |
| GET      | `/api/assets`                        | List the current user's image library  |
| GET      | `/api/assets/{id}`                   | Load owned asset metadata              |
| DELETE   | `/api/assets/{id}`                   | Delete an owned asset and thumbnail    |
| POST     | `/api/exports/png`                   | Queue a PNG export                     |
| POST     | `/api/exports/pdf`                   | Queue a PDF export                     |
| GET      | `/api/exports/{task_id}`             | Read export status and download URL    |

The asset service accepts PNG, JPEG, WebP, and SVG images up to 10 MB. Raster
content is decoded to verify the claimed MIME type and generate a WebP thumbnail.
SVG uploads are structurally checked and carry an explicit sanitization TODO before
production use. Local files receive random names under `uploads`; routes depend on
an asset storage adapter so MinIO/S3 can replace local storage later.

Deleting an asset checks ownership before removing metadata or files. Export
requests must reference a project owned by the current user. Completed workers
persist bytes through the export storage adapter and publish a download URL under
`/exports`.

Template list requests support `category` and `search` query parameters. Creating a
project from a template deep-copies its Design Document, fills only supported
variable paths, assigns a new document ID and timestamps, validates the result, and
then persists the project. The original template JSON is never mutated.

## Database Migrations

Alembic owns database schema changes. The initial migration creates `users`,
`projects`, `project_versions`, `templates`, `assets`, and `export_tasks`. Future
changes must add migrations instead of mutating production tables directly.
