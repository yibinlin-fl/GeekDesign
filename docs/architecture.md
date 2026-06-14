# GeekDesign Architecture

## Core Principle

The Scene Graph is the authoritative in-memory design state. Every user,
system, and AI mutation must be validated and executed through the Command
System. Renderers consume state but never own or mutate business state.

```text
Web Editor / AI Agent / MCP Tools
              |
              v
        Command System
              |
              v
         Scene Graph
          /       \
         v         v
   Design Schema  Renderer
```

## Boundaries

- **Design Schema** defines the durable, renderer-independent document format
  and its future migrations.
- **Scene Graph** owns node hierarchy, lookup, geometry, and serialization.
- **Command System** validates mutations and provides undo/redo history.
- **Renderer Core** defines rendering contracts for Canvas 2D and future WebGL
  implementations.
- **Editor Core** coordinates selection and tools by dispatching commands.
- **MCP Server and Agent Service** translate controlled AI tools into commands;
  they never replace complete design documents.

## Services

- FastAPI persists projects, snapshots, permissions, and operation logs.
- PostgreSQL stores application data and document snapshots.
- Redis supports caching, queues, and ephemeral coordination.
- MinIO stores uploaded and generated assets.
- Render Worker performs asynchronous high-resolution exports.

## Evolution

The first milestone establishes schemas and package boundaries. Later
milestones implement Scene Graph operations, Command execution and history,
Canvas rendering, the editor UI, persistence, MCP tools, and AI workflows in
that order.
