# User And Project System

GeekDesign uses real user identities and JWT bearer authentication for protected API operations.
Projects, assets, exports, commands, and template-created projects resolve the current user from
the signed token instead of a mock user id.

## Authentication

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me`

Passwords are hashed with the standard-library `scrypt` password derivation function using a
random salt. JWT access tokens use HMAC-SHA256, contain expiry and unique token identifiers, and
are signed with `JWT_SECRET`. Production deployments must replace the example secret.
If the variable is absent, a process-local random development secret is generated; multi-instance
deployments therefore must configure a shared secret explicitly.

`rate_limit_placeholder` is an explicit dependency seam for a future Redis-backed per-IP and
per-user rate limiter.

## Project Ownership

Every protected project query filters by both `project.id` and the authenticated `owner_id`.
Deleted projects are excluded. Unauthorized users receive the same not-found response as a
missing project, avoiding project existence disclosure.

Project management endpoints include rename, duplicate, soft delete, autosave, immutable version
history, version restoration, and read-only share links. Soft deletion sets `deleted_at`; it does
not remove project rows or versions. Deleting a project also disables its share link.

## Autosave And Versions

`POST /api/projects/{id}/autosave` validates the incoming Design Document, stores the previous
document as an immutable version, and then saves the new document. Restoring a historical version
first snapshots the current document, so restoration itself can be undone through history.

The Web Editor loads cloud projects with `/editor?projectId=...` and autosaves command-produced
document snapshots after a short idle delay. It never mutates the Design Document directly.

## Sharing

Owners can enable sharing through `POST /api/projects/{id}/share`. The API creates a
cryptographically random URL-safe token. `GET /api/shares/{token}` is public and read-only; no
write endpoint exists under `/shares`. Disabled or deleted project links return not found.

## Service Clients

MCP Server accepts `GEEKDESIGN_API_TOKEN`, and the Agent Service `CommandApiClient` accepts an
access token. These clients pass bearer tokens to the same owner-validated API routes as the Web
application.
