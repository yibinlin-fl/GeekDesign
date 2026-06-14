# GeekDesign Project Status

Last updated: 2026-06-14

## Product Context

GeekDesign is a long-term extensible Canva-like online visual design platform.
It is not a simple poster generator. The project owns its Design Schema, Scene
Graph, Command System, renderer abstraction, web editor, backend services, and
AI tool boundaries.

The repository is a pnpm monorepo. TypeScript packages use strict mode. The API
uses FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic, and pytest.

## Architecture Principles

- Design Documents use the custom `packages/design-schema` format, not
  Konva/Fabric internal JSON.
- Scene Graph is the trusted in-memory design state.
- Existing design modifications must go through the Command System.
- AI design operations must become validated Commands instead of directly
  editing stored JSON.
- Renderer Core renders documents and does not own business state.
- Selection and hover state are editor state and are not persisted in Design
  Documents.
- The backend stores validated Design Document JSON and project versions.

## Implemented Modules

### Repository Foundation

- pnpm workspace and shared TypeScript configuration
- Next.js web app
- FastAPI API app
- MCP server, agent service, and render worker foundations
- PostgreSQL, Redis, and MinIO Docker Compose configuration

### Design Schema

- Extensible Design Document, pages, nodes, paints, assets, fonts, variables,
  roles, and metadata
- Zod runtime validation and JSON Schema export
- Factory functions and schema migration foundation
- Invitation and resume examples

### Scene Graph Engine

- Controlled document copy and serialization
- Node CRUD, hierarchy, movement, ordering, traversal, bounding boxes, hit
  testing, and semantic search
- Cycle and orphan prevention

### Command System

- Validated user, AI, and system commands
- Execute, undo, redo, history, and confirmation boundaries
- Node, page, grouping, style, text, movement, and template-variable commands

### Renderer Core

- Canvas 2D renderer abstraction
- Text, image, rectangle, ellipse, line, and basic gradient rendering
- Zoom, pan, viewport conversion, image cache, and WebGL placeholder

### Web Editor MVP

- Canvas rendering
- Add text, rectangles, and image placeholders
- Select and drag elements
- Edit text, font size, and fill color
- Layer list, undo, redo, local save/load, and PNG export
- Dragging is rendered smoothly and committed as one undoable command
- AI assistant panel placeholder

### FastAPI Backend

- Unified API response envelope and mock authentication dependency
- SQLAlchemy models and Alembic migrations
- Users, projects, project versions, templates, template categories, assets,
  and export tasks
- Design Document validation before project persistence
- Project create, list, load, save, and version endpoints
- Secure asset upload and owned PNG/PDF export task endpoints

### Template System

- Template categories and extended template metadata
- Template list filtering and search
- Template detail API
- Safe variable filling with supported path validation
- Deep-copy template document generation with fresh document IDs and timestamps
- Create project from template API
- Template browser UI with category filters, search, previews, details, variable
  inputs, and editor handoff

### Asset System

- Secure PNG, JPEG, WebP, and SVG upload boundary with size and MIME validation
- Local uploads adapter with randomized paths and a MinIO-compatible boundary
- Raster thumbnail generation and SVG sanitization TODO
- Owned asset list, detail, and delete APIs
- Editor Asset Panel with upload, image insertion, and selected-image replacement
- Trusted AssetRef registration through the Command System

### Export Service

- Owned-project validation for PNG and PDF export tasks
- Export task status, options, errors, output keys, and download URLs
- Local exports adapter with a MinIO-compatible boundary
- Server-only `/render/{project_id}` canvas page
- Playwright Render Worker for exact-size PDF and future high-resolution PNG
- Editor PNG download, PDF task creation, status polling, and download link UI

## Current Product Boundaries

The core architecture and backend foundations are established, but the product
UI is still an MVP rather than a complete Canva-like experience.

- The editor currently supports a limited set of element operations.
- The Projects page remains mostly a placeholder.
- The editor primarily persists through localStorage and is not fully connected
  to project APIs.
- The template page includes a local catalog fallback and is not fully driven
  by backend data.
- Authentication, font library, multi-page editing, collaboration, payments,
  and production queue orchestration are not implemented.
- Loading states, notifications, error surfaces, responsive layouts, keyboard
  shortcuts, and broader visual polish remain limited.

## Important Locations

- `packages/design-schema`
- `packages/scene-graph`
- `packages/command-system`
- `packages/renderer-core`
- `apps/web`
- `apps/api`
- `apps/mcp-server`
- `docs/architecture.md`
- `docs/design-schema.md`
- `docs/scene-graph.md`
- `docs/command-system.md`
- `docs/renderer.md`
- `docs/web-editor.md`
- `docs/api.md`
- `docs/mcp-tools.md`

## Development Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm --filter @geekdesign/web typecheck
pnpm --filter @geekdesign/web test:e2e
```

API commands from `apps/api`:

```bash
python -m pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
pytest
ruff check .
ruff format . --check
```

## Verification State

At the end of the MCP Server milestone:

- Agent Service pytest: 7 passed
- API pytest: 24 passed
- MCP Server tools/resources/prompts implemented with official TypeScript SDK
- MCP Server Vitest: 7 passed
- Render Worker pytest: 4 passed
- API Ruff lint and format checks: passed
- TypeScript strict typecheck: passed
- Monorepo lint: passed
- Monorepo unit tests: passed
- Playwright editor, template, asset, render, PNG, and PDF smoke tests: 7 passed
- Alembic migration SQL generation: passed

The Next.js production build was additionally attempted but remained blocked by
a pre-existing local Next development process holding the build directory. No
production build error was returned.

For the AI Agent Service milestone, `pnpm lint` and `pnpm test` were requested
again but could not start because the Windows sandbox denied Node access while
resolving `C:\Users\asus`; the escalation request was then rejected by the
current Codex usage limit. No TypeScript files changed in this milestone.

## Recent Milestone Commits

- `pending feat(mcp): expose geekdesign tools resources and prompts`
- `e465c5f feat(ai): add deepseek design agent service`
- `9d54bc7 feat(templates): add variable based template system`
- `74fac98 feat(api): add project template asset export endpoints`
- `367ba7f perf(editor): smooth canvas dragging`
- `8ccbe3f feat(editor): build scene graph based web editor mvp`
- `e3ee9c2 feat(renderer): add canvas renderer core`
- `cf9b5c2 feat(command): add command executor with undo redo`
- `b872e7d feat(scene): implement scene graph engine`
- `82b3457 feat(schema): add extensible design document schema`

## Context Recovery

For a new development session, read:

1. `AGENTS.md`
2. `docs/architecture.md`
3. `docs/project-status.md`
4. The latest Git commits and current working tree status
