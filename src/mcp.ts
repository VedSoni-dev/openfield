#!/usr/bin/env node
// openfield MCP server. Exposes the preset library, model catalog, prompt
// composer, and BYOK generation as MCP tools — generate video from inside
// Claude Code / any MCP client. This is Higgsfield's growth wedge, open.
//
// Run: openfield-mcp   (stdio transport)
// Keys are read from the server process env (FAL_KEY, REPLICATE_API_TOKEN, ...).

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CATALOG } from "./providers/catalog.js";
import { PRESETS, searchPresets, byCategory } from "./presets/index.js";
import { compose } from "./compose.js";
import { generate, pollOnce, configuredProviders, pickRoute } from "./router.js";
import { listCharacters, upsertCharacter, identityPhrase } from "./soul.js";

const server = new McpServer({ name: "openfield", version: "0.1.0" });

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

server.registerTool(
  "list_presets",
  {
    title: "List presets",
    description:
      "List openfield's cinematic presets (camera moves, lens, lighting, style, VFX). Optionally filter by category or search query.",
    inputSchema: {
      category: z.enum(["camera", "lens", "lighting", "style", "vfx"]).optional(),
      query: z.string().optional(),
    },
  },
  async ({ category, query }) => {
    let list = PRESETS;
    if (category) list = byCategory(category);
    if (query) list = searchPresets(query);
    const rows = list.map((p) => `${p.id} [${p.category}] — ${p.desc}`).join("\n");
    return text(`${list.length} preset(s):\n${rows}`);
  },
);

server.registerTool(
  "list_models",
  {
    title: "List models",
    description:
      "List video models openfield can route to, and which provider keys reach each. Shows which providers are currently configured.",
    inputSchema: {},
  },
  async () => {
    const rows = CATALOG.map(
      (m) => `${m.id} — ${m.label} [${m.routes.map((r) => r.provider).join(", ")}]`,
    ).join("\n");
    const cfg = configuredProviders();
    return text(
      `${rows}\n\nConfigured providers: ${cfg.length ? cfg.join(", ") : "none — set FAL_KEY / REPLICATE_API_TOKEN / OPENFIELD_CUSTOM_URL"}`,
    );
  },
);

server.registerTool(
  "compose_prompt",
  {
    title: "Compose prompt",
    description:
      "Compose a final video prompt from a subject plus stacked preset ids. Makes NO API call — preview the exact prompt and params before spending credits.",
    inputSchema: {
      subject: z.string().describe("What should be on screen"),
      presets: z.array(z.string()).optional().describe("Preset ids to stack, in order"),
    },
  },
  async ({ subject, presets }) => {
    const c = compose({ subject, presets });
    return text(
      `PROMPT:\n${c.prompt}\n\nPARAMS:\n${JSON.stringify(c.params, null, 2)}\n\nPRESETS: ${c.used.map((p) => p.id).join(", ") || "(none)"}`,
    );
  },
);

server.registerTool(
  "generate_video",
  {
    title: "Generate video",
    description:
      "Generate a video. Composes subject + presets, routes to the first provider whose key is set, returns a job id to poll with check_status. BYOK.",
    inputSchema: {
      subject: z.string(),
      model: z.string().default("seedance-2.0"),
      presets: z.array(z.string()).optional(),
      character: z.string().optional().describe("Soul ID character handle for consistency"),
      image: z.string().optional().describe("Start-frame image url for image-to-video"),
      durationSec: z.number().optional(),
      aspectRatio: z.string().optional(),
      resolution: z.string().optional(),
    },
  },
  async ({ subject, model, presets, character, image, durationSec, aspectRatio, resolution }) => {
    const route = pickRoute(model);
    if (!route)
      return text(`No configured key for ${model}. Set a provider key and retry.`);
    const { job, provider, prompt } = await generate({
      subject,
      presets,
      model,
      character,
      image,
      durationSec,
      aspectRatio,
      resolution,
    });
    if (job.status === "failed") return text(`Create failed: ${job.error}`);
    return text(
      `Queued on ${provider}.\nprompt: ${prompt}\njob: ${job.id}\nPoll with check_status(provider="${provider}", jobId="${job.id}").`,
    );
  },
);

server.registerTool(
  "check_status",
  {
    title: "Check status",
    description: "Poll a generation job. Returns status and output video url(s) when done.",
    inputSchema: {
      provider: z.string(),
      jobId: z.string(),
    },
  },
  async ({ provider, jobId }) => {
    const j = await pollOnce(provider, jobId);
    const out = j.output?.length ? `\noutput:\n${j.output.join("\n")}` : "";
    const err = j.error ? `\nerror: ${j.error}` : "";
    return text(`status: ${j.status}${out}${err}`);
  },
);

server.registerTool(
  "list_characters",
  {
    title: "List Soul ID characters",
    description: "List saved characters (Soul ID) available for consistent generation.",
    inputSchema: {},
  },
  async () => {
    const chars = listCharacters();
    if (!chars.length) return text("No characters saved. Use save_character first.");
    return text(chars.map((c) => `${c.id} — ${c.name} (${c.refs.length} refs)`).join("\n"));
  },
);

server.registerTool(
  "save_character",
  {
    title: "Save Soul ID character",
    description:
      "Create/update a character for consistent generation: a handle, name, reference image urls, and optional look traits.",
    inputSchema: {
      id: z.string().describe("kebab-case handle"),
      name: z.string(),
      refs: z.array(z.string()).describe("reference image urls"),
      traits: z.string().optional().describe("look descriptors that pin the character"),
    },
  },
  async ({ id, name, refs, traits }) => {
    const c = upsertCharacter({ id, name, refs, traits });
    return text(`Saved ${c.id}: ${c.name} (${c.refs.length} refs)\nidentity: ${identityPhrase(c)}`);
  },
);

server.registerTool(
  "direct_video",
  {
    title: "Direct a multi-shot video",
    description:
      "Turn a brief into a storyboard (shot list) and generate every shot. Needs an LLM key (OPENROUTER_API_KEY). Set dryRun to only return the plan.",
    inputSchema: {
      brief: z.string(),
      character: z.string().optional(),
      model: z.string().optional(),
      dryRun: z.boolean().default(false),
    },
  },
  async ({ brief, character, model, dryRun }) => {
    const { llmConfigured, agentDirect, runStoryboard } = await import("./orchestrator/index.js");
    if (!llmConfigured()) return text("No LLM key. Set OPENROUTER_API_KEY or OPENFIELD_LLM_KEY.");
    const sb = (await agentDirect(brief, { character })).storyboard;
    if (model) sb.model = model;
    const plan = `"${sb.title}" — ${sb.shots.length} shots on ${sb.model}\n${sb.shots
      .map((s, i) => `  ${i + 1}. ${s.subject}${s.presets.length ? ` [${s.presets.join(", ")}]` : ""}`)
      .join("\n")}`;
    if (dryRun) return text(plan);
    const result = await runStoryboard(sb, { character, wait: false });
    const jobs = result.shots
      .map((s) => `  shot ${s.index + 1}: ${s.status} ${s.output?.join(" ") ?? s.error ?? ""}`)
      .join("\n");
    return text(`${plan}\n\nprovider: ${result.provider}\n${jobs}\n\nPoll each job with check_status.`);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so we don't corrupt the stdio JSON-RPC channel
  console.error("openfield MCP server running on stdio");
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
