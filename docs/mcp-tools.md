# GeekDesign MCP Server

GeekDesign MCP Server exposes the platform's controlled design capabilities to MCP-compatible
AI clients. It uses the official TypeScript MCP SDK over stdio and delegates persistence,
ownership checks, commands, templates, assets, and exports to `apps/api`.

## Run

Start the FastAPI service first, then run:

```bash
pnpm --filter @geekdesign/mcp-server start
```

Set `GEEKDESIGN_API_URL` to override the default API base URL
`http://127.0.0.1:8000/api`.

## Tools

The server exposes tools for project creation/opening, template search and creation, compact
scene reads, text and image insertion, image replacement, movement, resizing, styling,
alignment, palette application, previews, and PNG/PDF exports.

Every tool input is validated with Zod. Design mutations are translated into the backend
Command API; tools never directly replace an existing Design Document. PNG and PDF exports
return `confirmation_required` until the caller sends `confirmed: true`.

All tool attempts write a structured JSON Lines audit entry to stderr containing the tool name,
validated or raw arguments, status, timestamp, and current project id. Deployments can inject a
different `AuditLogger` to send these records to a centralized log service.

## Resources

- `design://current/scene`
- `design://current/elements`
- `design://current/thumbnail`
- `template://categories`
- `template://{template_id}`
- `asset://user/uploads`

Resource parsing uses an explicit allowlist. The server does not accept arbitrary URLs or
filesystem paths. Project and asset requests are sent to backend endpoints that enforce the
current user's ownership.

## Prompts

The prompt catalog includes invitation, resume, certificate batch, presentation, and design
revision workflows. Every prompt instructs the client to inspect the scene, use MCP tools,
avoid writing complete Design Document JSON, and respect confirmation requirements.

## Security Model

- Image tools accept uploaded `asset_id` values, never remote URLs or file paths.
- Project reads and writes rely on backend ownership checks.
- Existing design mutations use Command API validation and command audit logs.
- High-risk export operations require explicit confirmation.
- Delete, public sharing, payment, and batch export tools are intentionally not exposed.
