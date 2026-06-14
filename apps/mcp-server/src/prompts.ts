import type { PromptDefinition } from "./types";

const prompt = (
  name: string,
  description: string,
  instruction: string,
): PromptDefinition => ({
  name,
  description,
  render: (args) => `${instruction}

Input:
${JSON.stringify(args, null, 2)}

Use GeekDesign MCP tools. Inspect the current scene before revising it. Never write a complete
Design Document JSON. Use confirmation-required tools only after explicit user approval.`,
});

export const prompts: PromptDefinition[] = [
  prompt(
    "create_invitation_from_brief",
    "Create an invitation design from an event brief.",
    "Create a polished invitation. Identify title, date, location, and visual tone.",
  ),
  prompt(
    "create_resume_from_profile",
    "Create a resume design from a candidate profile.",
    "Create a readable professional resume. Preserve factual profile details.",
  ),
  prompt(
    "create_certificate_batch",
    "Plan certificate generation from recipient data.",
    "Create a certificate template and prepare variable assignments. Batch export requires confirmation.",
  ),
  prompt(
    "create_presentation_from_outline",
    "Create a presentation design plan from an outline.",
    "Turn the outline into a coherent presentation with clear hierarchy and restrained styling.",
  ),
  prompt(
    "revise_design_by_feedback",
    "Revise the current design from structured feedback.",
    "Inspect the current scene, translate feedback into focused command-backed edits, then summarize changes.",
  ),
];

export const promptMap = new Map(prompts.map((item) => [item.name, item]));
