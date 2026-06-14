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

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Service health |
| POST/GET | `/api/projects` | Create or list projects |
| GET/PUT | `/api/projects/{id}` | Load or save a project |
| POST | `/api/projects/{id}/versions` | Save an immutable document version |
| GET | `/api/templates` | List templates |
| GET | `/api/templates/{id}` | Load a template |
| POST | `/api/assets/upload` | Validate upload and create mock asset metadata |
| POST | `/api/exports/png` | Queue a PNG export |
| POST | `/api/exports/pdf` | Queue a PDF export |

The upload endpoint currently does not persist file bytes. Its `mock://` storage key
is the integration point for the future MinIO/S3 asset service. Export endpoints
create queued tasks for a future render worker.

## Database Migrations

Alembic owns database schema changes. The initial migration creates `users`,
`projects`, `project_versions`, `templates`, `assets`, and `export_tasks`. Future
changes must add migrations instead of mutating production tables directly.
