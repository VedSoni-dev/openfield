// Takes economy (BACKLOT DOC 08/10). A take is one generation of a scene's
// compiled prompt at a given seed. The finished film is the best few takes out
// of many — so takes, ratings, and selects are first-class, file-backed.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { projectDir } from "./projects.js";

export interface Take {
  sceneCode: string;
  takeNo: number;
  seed?: number;
  model: string;
  provider?: string;
  job?: string;
  status: "queued" | "running" | "succeeded" | "failed";
  output?: string[];
  error?: string;
  rating?: number; // 1..5
  selected: boolean;
  prompt: string;
  createdAt: string;
}

function takesPath(projectId: string): string {
  return join(projectDir(projectId), "takes.json");
}
type Store = Record<string, Take>; // key `${sceneCode}:${takeNo}`
function key(sceneCode: string, takeNo: number): string {
  return `${sceneCode}:${takeNo}`;
}
function load(projectId: string): Store {
  const p = takesPath(projectId);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Store;
  } catch {
    return {};
  }
}
function save(projectId: string, store: Store): void {
  mkdirSync(projectDir(projectId), { recursive: true });
  writeFileSync(takesPath(projectId), JSON.stringify(store, null, 2));
}

export function listTakes(projectId: string, sceneCode?: string): Take[] {
  const all = Object.values(load(projectId));
  return (sceneCode ? all.filter((t) => t.sceneCode === sceneCode) : all).sort(
    (a, b) => a.sceneCode.localeCompare(b.sceneCode) || a.takeNo - b.takeNo,
  );
}

export function nextTakeNo(projectId: string, sceneCode: string): number {
  return (listTakes(projectId, sceneCode).at(-1)?.takeNo ?? 0) + 1;
}

export function addTake(projectId: string, t: Take): Take {
  const store = load(projectId);
  store[key(t.sceneCode, t.takeNo)] = t;
  save(projectId, store);
  return t;
}

export function updateTake(
  projectId: string,
  sceneCode: string,
  takeNo: number,
  patch: Partial<Take>,
): Take {
  const store = load(projectId);
  const k = key(sceneCode, takeNo);
  if (!store[k]) throw new Error(`no take ${k}`);
  store[k] = { ...store[k], ...patch };
  save(projectId, store);
  return store[k];
}

export function rateTake(projectId: string, sceneCode: string, takeNo: number, rating: number): Take {
  if (rating < 1 || rating > 5) throw new Error("rating must be 1..5");
  return updateTake(projectId, sceneCode, takeNo, { rating });
}

/** Select a take — enforces at most one selected take per scene. */
export function selectTake(projectId: string, sceneCode: string, takeNo: number): Take {
  const store = load(projectId);
  for (const t of Object.values(store)) {
    if (t.sceneCode === sceneCode) t.selected = t.takeNo === takeNo;
  }
  const k = key(sceneCode, takeNo);
  if (!store[k]) throw new Error(`no take ${k}`);
  save(projectId, store);
  return store[k];
}

/** The selected take per scene, in scene order — the assembly source. */
export function selectedTakes(projectId: string): Take[] {
  return listTakes(projectId).filter((t) => t.selected && t.status === "succeeded");
}

/** Seed policy: caller passes a random() so this stays pure/testable. */
export function pickSeed(policy: "vary" | "refine", prevSeed: number | undefined, random: () => number): number {
  if (policy === "refine" && prevSeed != null) return prevSeed;
  return Math.floor(random() * 1_000_000_000);
}

// ── generation engine (network) ──────────────────────────────────────────
export interface GenerateTakesOpts {
  count?: number;
  model: string;
  seed?: number; // fix take 1's seed
  aspectRatio?: string;
  resolution?: string;
  durationSec?: number;
  onProgress?: (msg: string) => void;
}

/** Generate N takes of a scene: compile its prompt+refs, submit each at a seed. */
export async function generateTakes(projectId: string, sceneCode: string, opts: GenerateTakesOpts): Promise<Take[]> {
  const { getShotlist, compileScene } = await import("./director/index.js");
  const { generateRaw } = await import("./router.js");
  const sb = getShotlist(projectId);
  const scene = sb?.scenes.find((s) => s.code === sceneCode);
  if (!sb || !scene) throw new Error(`no scene ${sceneCode} — compile a shotlist first`);
  const { prompt, refs } = compileScene(projectId, sb, scene);
  const count = opts.count ?? 3;
  const log = opts.onProgress ?? (() => {});
  for (let i = 0; i < count; i++) {
    const takeNo = nextTakeNo(projectId, sceneCode);
    const seed = i === 0 && opts.seed != null ? opts.seed : pickSeed("vary", undefined, Math.random);
    log(`take ${takeNo} (seed ${seed})`);
    try {
      const { job, provider } = await generateRaw({
        prompt,
        model: opts.model,
        refs,
        seed,
        aspectRatio: opts.aspectRatio,
        resolution: opts.resolution,
        durationSec: opts.durationSec,
      });
      addTake(projectId, {
        sceneCode, takeNo, seed, model: opts.model, provider: provider,
        job: job.id, status: job.status === "failed" ? "failed" : "queued",
        error: job.error, prompt, selected: false, createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      addTake(projectId, { sceneCode, takeNo, seed, model: opts.model, status: "failed", error: e.message, prompt, selected: false, createdAt: new Date().toISOString() });
    }
  }
  return listTakes(projectId, sceneCode);
}

/** Poll a queued take and fold the provider status back into the store. */
export async function pollTake(projectId: string, sceneCode: string, takeNo: number): Promise<Take> {
  const store = load(projectId);
  const t = store[key(sceneCode, takeNo)];
  if (!t) throw new Error(`no take ${sceneCode}:${takeNo}`);
  if (!t.provider || !t.job) return t;
  const { pollOnce } = await import("./router.js");
  const j = await pollOnce(t.provider, t.job);
  return updateTake(projectId, sceneCode, takeNo, { status: j.status, output: j.output, error: j.error });
}
