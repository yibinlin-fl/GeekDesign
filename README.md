# GeekDesign

GeekDesign is a long-term extensible Canva-like online design platform. The
repository starts with a custom Design Schema, Scene Graph, Command System, and
renderer boundary so editors and AI tools share one controlled editing model.

## Prerequisites

- Node.js 18.18+
- pnpm 9+
- Python 3.11+
- Docker with Docker Compose

## Install

```bash
corepack enable
pnpm install
python -m pip install -r apps/api/requirements-dev.txt
```

## Development

Start infrastructure:

```bash
docker compose up -d
```

Start the web editor:

```bash
pnpm dev
```

Start the API from `apps/api`:

```bash
python -m uvicorn app.main:app --reload
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
