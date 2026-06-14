# GeekDesign

GeekDesign is a long-term extensible Canva-like online design platform. The
repository starts with a custom Design Schema, Scene Graph, Command System, and
renderer boundary so editors and AI tools share one controlled editing model.

## Prerequisites

- Node.js 18.18+
- pnpm 9+
- Python 3.11+
- Docker with Docker Compose (optional, for PostgreSQL/Redis/MinIO)

## Install

```bash
corepack enable
pnpm install
python -m pip install -r apps/api/requirements-dev.txt
```

## Development

### Windows, without Docker

Install dependencies once:

```powershell
corepack enable
pnpm install
python -m pip install -r apps/api/requirements-dev.txt
```

Then launch the API, web app, and browser:

```powershell
.\scripts\start-windows.ps1
```

The local API uses `apps/api/geekdesign.db` by default. PostgreSQL, Redis, and
MinIO remain available for production-like development, but are not required
to open and use the current editor.

### Docker development

Start optional infrastructure:

```bash
docker compose up -d
```

Start the web editor:

```bash
pnpm dev
```

Start the API from `apps/api`:

```bash
python -m app.db.bootstrap
python -m uvicorn app.main:app --reload
```

Install the render worker and Playwright browser:

```bash
python -m pip install -r apps/render-worker/requirements.txt
python -m playwright install chromium
```

## Quality Checks

```bash
pnpm lint
pnpm test
pnpm typecheck
cd apps/api
pytest
docker compose config
```

## Repository Layout

- `apps/web`: Next.js web editor shell
- `apps/api`: FastAPI backend
- `apps/mcp-server`: MCP tool server boundary
- `apps/agent-service`: AI agent service boundary
- `apps/render-worker`: export and rendering worker boundary
- `packages/design-schema`: canonical design document types
- `packages/scene-graph`: authoritative scene state
- `packages/command-system`: controlled design mutations
- `packages/renderer-core`: renderer contracts
- `packages/editor-core`: editor orchestration contracts
- `packages/shared`: shared primitives
