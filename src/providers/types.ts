// Provider = a backend that actually runs a video model.
// BYOK: each provider reads its own API key from env. Openfield never sees it.

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface GenerateParams {
  /** Final composed prompt (preset applied). */
  prompt: string;
  /** Canonical model id, e.g. "seedance-2.0". */
  model: string;
  /** Provider-specific model slug, resolved by the catalog. */
  providerModel: string;
  /** Optional start frame (image url or local path). */
  image?: string;
  durationSec?: number;
  aspectRatio?: string; // "16:9" | "9:16" | "1:1" | ...
  resolution?: string; // "720p" | "1080p" | "4k"
  /** Extra knobs passed straight to the provider. */
  extra?: Record<string, unknown>;
}

export interface Job {
  id: string;
  status: JobStatus;
  /** URL(s) of finished video(s). */
  output?: string[];
  error?: string;
  raw?: unknown;
}

export interface Provider {
  /** Stable id, e.g. "fal", "replicate", "bytedance". */
  id: string;
  /** Env var that holds this provider's key. */
  keyEnv: string;
  /** True if the key is present in env. */
  configured(): boolean;
  /** Kick off a generation. Returns a job to poll. */
  create(params: GenerateParams): Promise<Job>;
  /** Poll job state. */
  get(jobId: string): Promise<Job>;
}

export function requireKey(p: Provider): string {
  const k = process.env[p.keyEnv];
  if (!k) throw new Error(`${p.id}: missing ${p.keyEnv}. Bring your own key.`);
  return k;
}
