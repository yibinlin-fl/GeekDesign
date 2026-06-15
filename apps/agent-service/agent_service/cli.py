import argparse
import os

from agent_service.agent_loop import AgentLoop
from agent_service.command_api_client import CommandApiClient
from agent_service.deepseek_client import DeepSeekClient
from agent_service.design_tools import create_design_tool_registry


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or revise a GeekDesign presentation with DeepSeek."
    )
    parser.add_argument("prompt", help="Natural-language design request")
    parser.add_argument("--project-id", required=True, help="Existing GeekDesign project id")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-tool-steps", type=int, default=12)
    args = parser.parse_args()

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    token = os.environ.get("GEEKDESIGN_ACCESS_TOKEN")
    if not api_key:
        parser.error("DEEPSEEK_API_KEY is required")
    if not token:
        parser.error("GEEKDESIGN_ACCESS_TOKEN is required")

    api = CommandApiClient(
        os.environ.get("GEEKDESIGN_API_URL", "http://127.0.0.1:8000/api"),
        access_token=token,
    )
    loop = AgentLoop(
        DeepSeekClient(api_key),
        create_design_tool_registry(api),
        max_tool_steps=args.max_tool_steps,
    )
    print(loop.run(args.prompt, args.project_id, dry_run=args.dry_run).model_dump_json(indent=2))


if __name__ == "__main__":
    main()
