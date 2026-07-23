// Router: resolve model -> a configured provider route -> dispatch -> poll.

import { CATALOG, findModel, type Route } from "./providers/catalog.js";
import type { Job, Provider } from "./providers/types.js";
import { fal } from "./providers/fal.js";
import { replicate } from "./providers/replicate.js";
import { custom } from "./providers/custom.js";
import { compose, type ComposeInput } from "./compose.js";
import { getCharacter, identityPhrase } from "./soul.js";
import { getLocation, locationPhrase } from "./locations.js";
import { orderAndCap, resolveRefUrl, referenceLegend, type Ref } from "./refs.js";
import { resolveHandles, elementsToRefs } from "./elements.js";

const PROVIDERS: Record<string, Provider> = {
  fal,
  replicate,
  custom,
};

export function providerFor(route: Route): Provider {
  return PROVIDERS[route.provider];
}

/** First route whose provider key is present. Null if none configured. */
export function pickRoute(modelId: string): Route | null {
  const m = findModel(modelId);
  if (!m) throw new Error(`unknown model: ${modelId}. Run 'openfield models'.`);
  for (const r of m.routes) {
    if (providerFor(r).configured()) return r;
  }
  return null;
}

export interface GenerateOptions extends ComposeInput {
  model: string;
  image?: string;
  audio?: string;
  video?: string;
  withAudio?: boolean;
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  /** Soul ID character handle. Injects identity phrase + reference images. */
  character?: string;
  /** Location handle. Injects the setting phrase. */
  location?: string;
  /** Extra reference images to attach (elements, schematic, first-frame). */
  refs?: Ref[];
  /** Project id — @handles in the subject resolve to locked element refs. */
  project?: string;
  extra?: Record<string, unknown>;
}

export interface Dispatched {
  job: Job;
  provider: string;
  prompt: string;
}

export async function generate(opts: GenerateOptions): Promise<Dispatched> {
  const route = pickRoute(opts.model);
  if (!route) {
    const m = findModel(opts.model)!;
    const keys = m.routes.map((r) => providerFor(r).keyEnv).join(" or ");
    throw new Error(`no key for ${opts.model}. Set one of: ${keys}`);
  }
  const provider = providerFor(route);

  // Soul ID: resolve character, weave identity phrase + attach reference images.
  let identity = opts.identity;
  const refObjs: Ref[] = [];
  if (opts.character) {
    const c = getCharacter(opts.character);
    if (!c) throw new Error(`unknown character: ${opts.character}. Run 'openfield soul list'.`);
    identity = identityPhrase(c);
    for (const src of c.refs) refObjs.push({ handle: c.id, role: "character", src });
  }
  let setting = opts.setting;
  if (opts.location) {
    const l = getLocation(opts.location);
    if (!l) throw new Error(`unknown location: ${opts.location}.`);
    setting = locationPhrase(l);
    for (const src of l.refs ?? []) refObjs.push({ handle: l.id, role: "location", src });
  }
  // Project elements: resolve @handles in the subject to locked element refs.
  if (opts.project) {
    for (const r of elementsToRefs(resolveHandles(opts.project, opts.subject))) refObjs.push(r);
  }
  // Explicit refs passed by the caller (elements, schematics, first-frame).
  for (const r of opts.refs ?? []) refObjs.push(r);

  // Order by priority, cap, resolve local paths to data URIs, build the legend.
  const { kept } = orderAndCap(refObjs, 10);
  const references = kept.length ? kept.map((r) => resolveRefUrl(r.src)) : undefined;
  const legend = referenceLegend(kept);

  const { prompt, params } = compose({ ...opts, identity, setting, legend });
  const job = await provider.create({
    prompt,
    model: opts.model,
    providerModel: route.providerModel,
    image: opts.image ?? references?.[0],
    references,
    audio: opts.audio,
    video: opts.video,
    withAudio: opts.withAudio,
    durationSec: opts.durationSec,
    aspectRatio: opts.aspectRatio,
    resolution: opts.resolution,
    extra: { ...params, ...(opts.extra ?? {}) },
  });
  return { job, provider: provider.id, prompt };
}

/** Submit a pre-compiled prompt + refs verbatim (no compose re-wrap). Used by
 *  the takes engine where the Director already built the full prompt+legend. */
export async function generateRaw(opts: {
  prompt: string;
  model: string;
  refs?: Ref[];
  seed?: number;
  image?: string;
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  withAudio?: boolean;
  extra?: Record<string, unknown>;
}): Promise<Dispatched> {
  const route = pickRoute(opts.model);
  if (!route) {
    const m = findModel(opts.model)!;
    throw new Error(`no key for ${opts.model}. Set one of: ${m.routes.map((r) => providerFor(r).keyEnv).join(" or ")}`);
  }
  const provider = providerFor(route);
  const { kept } = orderAndCap(opts.refs ?? [], 10);
  const references = kept.length ? kept.map((r) => resolveRefUrl(r.src)) : undefined;
  const job = await provider.create({
    prompt: opts.prompt,
    model: opts.model,
    providerModel: route.providerModel,
    image: opts.image ?? references?.[0],
    references,
    withAudio: opts.withAudio,
    durationSec: opts.durationSec,
    aspectRatio: opts.aspectRatio,
    resolution: opts.resolution,
    extra: { ...(opts.seed != null ? { seed: opts.seed } : {}), ...(opts.extra ?? {}) },
  });
  return { job, provider: provider.id, prompt: opts.prompt };
}

export async function waitFor(
  providerId: string,
  jobId: string,
  { intervalMs = 3000, timeoutMs = 600_000 } = {},
): Promise<Job> {
  const provider = PROVIDERS[providerId];
  const deadline = Date.now() + timeoutMs;
  // Date.now allowed here (runtime, not a workflow script).
  while (Date.now() < deadline) {
    const job = await provider.get(jobId);
    if (job.status === "succeeded" || job.status === "failed") return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`timeout waiting for job ${jobId}`);
}

export async function pollOnce(providerId: string, jobId: string): Promise<Job> {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`unknown provider: ${providerId}`);
  return provider.get(jobId);
}

export function configuredProviders(): string[] {
  return Object.values(PROVIDERS).filter((p) => p.configured()).map((p) => p.id);
}

export { CATALOG };
