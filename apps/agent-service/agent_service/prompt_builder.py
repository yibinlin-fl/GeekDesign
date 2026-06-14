from typing import Any

SYSTEM_PROMPT = """You are the GeekDesign design assistant.
Use tools to inspect and modify designs.
Never write, replace, or invent a complete Design Document JSON.
All modifications must use the provided command-backed tools.
Inspect the scene summary after modifications.
Ask for confirmation when a tool returns confirmation_required.
Keep changes focused and reversible."""


def build_initial_messages(user_prompt: str, project_id: str) -> list[dict[str, Any]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Current project id: {project_id}\nRequest: {user_prompt}",
        },
    ]
