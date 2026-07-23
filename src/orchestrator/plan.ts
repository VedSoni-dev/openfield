// The planning brain — openfield's answer to Higgsfield's Hermes agent.
// Given a brief, the LLM calls one function (`storyboard`) whose arguments ARE
// the shot list. Single-tool function calling: honors the agentic contract while
// staying robust on free models.

import { z } from "zod";
import { chat, type ToolDef } from "./llm.js";
import { PRESETS } from "../presets/index.js";
import { CATALOG } from "../providers/catalog.js";

export const ShotSchema = z.object({
  subject: z.string(),
  presets: z.array(z.string()).default([]),
  durationSec: z.number().optional(),
  narration: z.string().optional(),
});
export type Shot = z.infer<typeof ShotSchema>;

export const StoryboardSchema = z.object({
  title: z.string(),
  model: z.string(),
  shots: z.array(ShotSchema).min(1),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;

const storyboardTool: ToolDef = {
  type: "function",
  function: {
    name: "storyboard",
    description: "Return the finished shot list for the requested video.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        model: { type: "string", description: "canonical model id from the allowed list" },
        shots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              subject: { type: "string", description: "what is on screen this shot" },
              presets: {
                type: "array",
                items: { type: "string" },
                description: "preset ids to stack (from the allowed list)",
              },
              durationSec: { type: "number" },
              narration: { type: "string", description: "optional voiceover line" },
            },
            required: ["subject", "presets"],
          },
        },
      },
      required: ["title", "model", "shots"],
    },
  },
};

function systemPrompt(character?: string): string {
  const presetIds = PRESETS.map((p) => `${p.id}(${p.category})`).join(", ");
  const modelIds = CATALOG.map((m) => m.id).join(", ");
  return [
    "You are a director planning a short AI-generated video.",
    "Break the brief into a tight sequence of shots. Each shot has a concrete subject and 1-3 stacked presets that fit the mood.",
    character
      ? `Every shot features the same character "${character}" — keep the subject consistent with them.`
      : "",
    `Allowed preset ids: ${presetIds}.`,
    `Allowed model ids: ${modelIds}. Pick ONE model for the whole piece.`,
    "Only use ids from those lists. Call the storyboard function with the result.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Validate preset/model ids against the catalog, dropping unknowns. */
export function sanitize(sb: Storyboard): Storyboard {
  const presetSet = new Set(PRESETS.map((p) => p.id));
  const modelSet = new Set(CATALOG.map((m) => m.id));
  const model = modelSet.has(sb.model) ? sb.model : CATALOG[0].id;
  const shots = sb.shots.map((s) => ({
    ...s,
    presets: s.presets.filter((p) => presetSet.has(p)),
  }));
  return { ...sb, model, shots };
}

export async function planStoryboard(brief: string, character?: string): Promise<Storyboard> {
  const res = await chat(
    [
      { role: "system", content: systemPrompt(character) },
      { role: "user", content: brief },
    ],
    { tools: [storyboardTool], toolChoice: "required", temperature: 0.6 },
  );
  const call = res.toolCalls[0];
  if (!call) throw new Error("LLM returned no storyboard. Try a more capable OPENFIELD_LLM_MODEL.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(call.function.arguments);
  } catch {
    throw new Error("storyboard arguments were not valid JSON");
  }
  return sanitize(StoryboardSchema.parse(parsed));
}
