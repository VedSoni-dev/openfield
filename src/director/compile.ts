// Shotlist compiler. Turns script + element manifest into a Global Style Prefix
// plus per-scene prompts, then compiles each scene into a submittable prompt
// (prefix + override splice + reference legend + body).

import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chat } from "../orchestrator/llm.js";
import { DIRECTOR_SYSTEM, directorUserMessage } from "./prompt.js";
import { buildManifest, getElement, elementsToRefs, resolveHandles } from "../elements.js";
import { projectDir } from "../projects.js";
import { referenceLegend, type Ref } from "../refs.js";

export const SceneSchema = z.object({
  code: z.string(),
  title: z.string(),
  logline: z.string().default(""),
  duration_target_s: z.number().default(15),
  element_handles: z.array(z.string()).default([]),
  audio_handle: z.string().nullable().default(null),
  style_override: z.string().nullable().default(null),
  body: z.string(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const ShotlistSchema = z.object({
  project_title: z.string(),
  style_prefix: z.string(),
  scenes: z.array(SceneSchema).min(1),
});
export type Shotlist = z.infer<typeof ShotlistSchema>;

function shotlistPath(projectId: string): string {
  return join(projectDir(projectId), "shotlist.json");
}
export function getShotlist(projectId: string): Shotlist | undefined {
  const p = shotlistPath(projectId);
  if (!existsSync(p)) return undefined;
  try {
    return ShotlistSchema.parse(JSON.parse(readFileSync(p, "utf8")));
  } catch {
    return undefined;
  }
}
export function saveShotlist(projectId: string, sb: Shotlist): void {
  mkdirSync(projectDir(projectId), { recursive: true });
  writeFileSync(shotlistPath(projectId), JSON.stringify(sb, null, 2));
}

/** Splice: replace ONLY the line-keys present in `override` into `prefix`. */
export function spliceOverride(prefix: string, override?: string | null): string {
  if (!override) return prefix;
  const overrides = new Map<string, string>();
  for (const line of override.split("\n")) {
    const m = line.match(/^(\w+):/);
    if (m) overrides.set(m[1].toLowerCase(), line.trim());
  }
  if (!overrides.size) return prefix;
  return prefix
    .split("\n")
    .map((line) => {
      const m = line.match(/^\s*(\w+):/);
      if (m && overrides.has(m[1].toLowerCase())) return overrides.get(m[1].toLowerCase())!;
      return line;
    })
    .join("\n");
}

/** Compile one scene into a submittable prompt + the refs to attach. */
export function compileScene(
  projectId: string,
  sb: Shotlist,
  scene: Scene,
): { prompt: string; refs: Ref[]; missing: string[] } {
  const prefix = spliceOverride(sb.style_prefix, scene.style_override);
  // resolve handles named in the scene (explicit list ∪ @tokens in body)
  const named = new Set<string>([...scene.element_handles, ...resolveHandles(projectId, scene.body).map((e) => e.handle)]);
  const els = [...named].map((h) => getElement(projectId, h)).filter(Boolean) as NonNullable<ReturnType<typeof getElement>>[];
  const refs = elementsToRefs(els);
  const missing = els.filter((e) => e.status !== "locked").map((e) => e.handle);
  const legend = referenceLegend(refs);
  const prompt = [prefix, legend, scene.body].filter(Boolean).join("\n\n");
  return { prompt, refs, missing };
}

/** Deterministic prefix swap across all scenes (no LLM). */
export function propagatePrefix(sb: Shotlist, newPrefix: string): Shotlist {
  return { ...sb, style_prefix: newPrefix };
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export interface CompileInput {
  script: string;
  notes?: string;
  targetRuntimeS?: number;
  musicHandle?: string;
}

/** Ask the Director LLM to compile the shotlist; validate + one retry. */
export async function compileShotlist(projectId: string, input: CompileInput): Promise<Shotlist> {
  const manifest = buildManifest(projectId);
  const user = directorUserMessage({
    script: input.script,
    manifest,
    notes: input.notes,
    targetRuntimeS: input.targetRuntimeS ?? 60,
    musicHandle: input.musicHandle,
  });
  const messages = [
    { role: "system" as const, content: DIRECTOR_SYSTEM },
    { role: "user" as const, content: user },
  ];
  let last = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await chat(attempt === 0 ? messages : [...messages, { role: "user", content: "That was not valid JSON matching the schema. Return ONLY the corrected JSON." }], { temperature: 0.6 });
    last = res.content ?? "";
    try {
      const sb = ShotlistSchema.parse(JSON.parse(stripFences(last)));
      saveShotlist(projectId, sb);
      return sb;
    } catch {
      /* retry once */
    }
  }
  throw new Error(`Director returned invalid shotlist JSON: ${last.slice(0, 200)}`);
}
