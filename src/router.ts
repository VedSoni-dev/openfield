// Router: resolve model -> a configured provider route -> dispatch -> poll.

import { CATALOG, findModel, type Route } from "./providers/catalog.js";
import type { Job, Provider } from "./providers/types.js";
import { fal } from "./providers/fal.js";
import { replicate } from "./providers/replicate.js";
import { custom } from "./providers/custom.js";
import { compose, type ComposeInput } from "./compose.js";
import { getCharacter, identityPhrase } from "./soul.js";

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
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  /** Soul ID character handle. Injects identity phrase + reference images. */
  character?: string;
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

  // Soul ID: resolve character, weave identity phrase + reference images.
  let identity = opts.identity;
  let references: string[] | undefined;
  if (opts.character) {
    const c = getCharacter(opts.character);
    if (!c) throw new Error(`unknown character: ${opts.character}. Run 'openfield soul list'.`);
    identity = identityPhrase(c);
    references = c.refs;
  }

  const { prompt, params } = compose({ ...opts, identity });
  const job = await provider.create({
    prompt,
    model: opts.model,
    providerModel: route.providerModel,
    image: opts.image ?? references?.[0],
    references,
    durationSec: opts.durationSec,
    aspectRatio: opts.aspectRatio,
    resolution: opts.resolution,
    extra: { ...params, ...(opts.extra ?? {}) },
  });
  return { job, provider: provider.id, prompt };
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
