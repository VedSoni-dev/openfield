// The openfield Director agent — the real, open Hermes.
//
// Runs Nous Research Hermes 3 (or any OpenAI-compatible model) in a genuine
// multi-tool function-calling loop: the model discovers presets, inspects the
// cinema catalog and characters, then assembles a storyboard shot by shot and
// finalizes. Mirrors how Higgsfield's Hermes orchestrates its tool suite —
// except every tool here is openfield's own, open, and inspectable.

import { chat, type ChatMessage, type ToolDef, HERMES_MODEL } from "./llm.js";
import { PRESETS, searchPresets } from "../presets/index.js";
import { CINEMA_GROUPS } from "../cinema.js";
import { CATALOG } from "../providers/catalog.js";
import { listCharacters } from "../soul.js";
import { listLocations } from "../locations.js";
import { StoryboardSchema, sanitize, type Storyboard } from "./plan.js";

export interface AgentState {
  title: string;
  model: string;
  character?: string;
  shots: Array<{ subject: string; presets: string[]; cinema?: Record<string, string>; durationSec?: number; narration?: string }>;
  done: boolean;
}

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "search_presets",
      description: "Find preset ids by keyword (camera moves, lenses, lighting, style, mood, vfx, transitions).",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_cinema",
      description: "List Cinema Studio option ids by group (genre, body, lens, focal, aperture, shot, angle).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_characters",
      description: "List saved Soul ID characters that can be featured for consistency.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_locations",
      description: "List saved locations (settings) the film can take place in.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "set_project",
      description: "Set the film title and the video model id to use for all shots.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, model: { type: "string" }, character: { type: "string", description: "optional character id to feature" } },
        required: ["title", "model"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_shot",
      description: "Append one shot to the storyboard.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "what happens on screen" },
          presets: { type: "array", items: { type: "string" }, description: "preset ids to stack" },
          cinema: { type: "object", description: "cinema option ids by group, e.g. {body:'arri-alexa',focal:'f85'}" },
          durationSec: { type: "number" },
          narration: { type: "string" },
        },
        required: ["subject"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize",
      description: "Finish — call once the shot list is complete.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

const PRESET_IDS = new Set(PRESETS.map((p) => p.id));
const MODEL_IDS = new Set(CATALOG.map((m) => m.id));

/** Execute one tool call against the working state. Pure + testable. */
export function runToolCall(name: string, args: any, state: AgentState): string {
  switch (name) {
    case "search_presets": {
      const hits = searchPresets(String(args?.query ?? "")).slice(0, 12);
      return hits.length ? hits.map((p) => `${p.id} [${p.category}] ${p.desc}`).join("\n") : "no matches";
    }
    case "list_cinema":
      return Object.entries(CINEMA_GROUPS)
        .map(([g, opts]) => `${g}: ${(opts as any[]).map((o) => o.id).join(", ")}`)
        .join("\n");
    case "list_characters": {
      const cs = listCharacters();
      return cs.length ? cs.map((c) => `${c.id} — ${c.name}`).join("\n") : "none";
    }
    case "list_locations": {
      const ls = listLocations();
      return ls.length ? ls.map((l) => `${l.id} — ${l.name}`).join("\n") : "none";
    }
    case "set_project":
      state.title = String(args?.title ?? state.title);
      if (MODEL_IDS.has(args?.model)) state.model = args.model;
      if (args?.character) state.character = String(args.character);
      return `project set: "${state.title}" on ${state.model}`;
    case "add_shot": {
      const presets = Array.isArray(args?.presets) ? args.presets.filter((p: string) => PRESET_IDS.has(p)) : [];
      const cinema = args?.cinema && typeof args.cinema === "object" ? args.cinema : undefined;
      state.shots.push({ subject: String(args?.subject ?? ""), presets, cinema, durationSec: args?.durationSec, narration: args?.narration });
      return `shot ${state.shots.length} added`;
    }
    case "finalize":
      state.done = true;
      return "finalized";
    default:
      return `unknown tool ${name}`;
  }
}

function systemPrompt(): string {
  const cats = [...new Set(PRESETS.map((p) => p.category))].join(", ");
  const models = CATALOG.filter((m) => ["t2v", "i2v", "both"].includes(m.kind)).map((m) => m.id).join(", ");
  return [
    "You are the openfield Director, an expert AI filmmaker.",
    "Turn the user's brief into a tight, well-directed shot list.",
    "Workflow: call set_project first (pick a title and one model), then for each shot call add_shot with a concrete subject, fitting preset ids, and an optional cinema selection. Call finalize when done.",
    `Use search_presets to discover ids — preset categories: ${cats}. Use list_cinema for camera option ids. Use list_characters if the brief needs a recurring person.`,
    `Available models: ${models}. Keep shots to a focused sequence (3-6 unless asked otherwise). Only use ids returned by the tools.`,
  ].join("\n");
}

export interface AgentResult {
  storyboard: Storyboard;
  steps: number;
}

/** Run the Hermes agent loop and return a validated storyboard. */
export async function agentDirect(
  brief: string,
  opts: { character?: string; maxSteps?: number; onStep?: (msg: string) => void } = {},
): Promise<AgentResult> {
  const log = opts.onStep ?? (() => {});
  const state: AgentState = { title: "Untitled", model: CATALOG[0].id, character: opts.character, shots: [], done: false };
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: brief },
  ];
  const maxSteps = opts.maxSteps ?? 12;
  let steps = 0;
  for (; steps < maxSteps && !state.done; steps++) {
    const res = await chat(messages, { tools: TOOLS, toolChoice: "auto", temperature: 0.6 });
    if (!res.toolCalls.length) {
      // nudge the model to use tools
      messages.push({ role: "assistant", content: res.content ?? "" });
      messages.push({ role: "user", content: "Use the tools: set_project, add_shot for each shot, then finalize." });
      continue;
    }
    messages.push({
      role: "assistant",
      content: res.content ?? "",
      tool_calls: res.toolCalls.map((t) => ({ id: t.id, type: "function", function: t.function })),
    });
    for (const call of res.toolCalls) {
      let args: any = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* leave empty */
      }
      const result = runToolCall(call.function.name, args, state);
      log(`${call.function.name}(${call.function.arguments || ""}) → ${result}`);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
      if (state.done) break;
    }
  }

  if (!state.shots.length) throw new Error("agent produced no shots — try a clearer brief or a more capable model.");
  const sb = sanitize(
    StoryboardSchema.parse({ title: state.title, model: state.model, shots: state.shots.length ? state.shots : [{ subject: brief, presets: [] }] }),
  );
  return { storyboard: sb, steps };
}

export { HERMES_MODEL };
