# DeepSeek Presentation Creation

GeekDesign connects DeepSeek through the Python Agent Service. DeepSeek never
writes a complete Design Document. It selects validated tools, which become
backend Commands and are persisted with the authenticated user.

## Prerequisites

1. Start the FastAPI service and Web Editor.
2. Register at `/register` or log in at `/login`.
3. Open `/projects`, create a blank project, and copy its `projectId` from the
   editor URL.
4. Obtain the access token from browser local storage key
   `geekdesign.auth.token`.
5. Set environment variables:

```powershell
$env:DEEPSEEK_API_KEY="your-deepseek-key"
$env:GEEKDESIGN_ACCESS_TOKEN="your-geekdesign-token"
$env:GEEKDESIGN_API_URL="http://127.0.0.1:8000/api"
```

## Create A Presentation

Run from the repository root:

```powershell
python -m agent_service.cli --project-id "project_xxx" "Create a five-slide product launch presentation. Use a title slide, problem, solution, roadmap, and closing slide."
```

Set `PYTHONPATH=apps/agent-service` if the package is not installed:

```powershell
$env:PYTHONPATH="apps/agent-service"
python -m agent_service.cli --project-id "project_xxx" "Create a concise investor presentation."
```

Use `--dry-run` to validate planned tool calls without modifying the project.
The Agent currently creates pages and text, edits/moves/styles elements, applies
templates and variables, groups elements, and queues PDF export. Image search,
automatic chart generation, and a Web Editor chat endpoint remain future work.
