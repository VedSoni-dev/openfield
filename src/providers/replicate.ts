// Replicate adapter. BYOK: REPLICATE_API_TOKEN.
// providerModel = "owner/name" or "owner/name:version". Uses official model endpoint.

import type { GenerateParams, Job, JobStatus, Provider } from "./types.js";
import { requireKey } from "./types.js";

const BASE = "https://api.replicate.com/v1";

function mapStatus(s: string): JobStatus {
  if (s === "succeeded") return "succeeded";
  if (s === "processing" || s === "starting") return "running";
  if (s === "canceled" || s === "failed") return "failed";
  return "queued";
}

function collect(output: unknown): string[] {
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) return output.filter((x) => typeof x === "string");
  if (output && typeof output === "object" && "url" in (output as any)) return [(output as any).url];
  return [];
}

export const replicate: Provider = {
  id: "replicate",
  keyEnv: "REPLICATE_API_TOKEN",
  configured: () => !!process.env.REPLICATE_API_TOKEN,

  async create(params: GenerateParams): Promise<Job> {
    const key = requireKey(replicate);
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      ...(params.image ? { image: params.image } : {}),
      ...(params.references?.length ? { reference_images: params.references } : {}),
      ...(params.audio ? { audio: params.audio } : {}),
      ...(params.video ? { video: params.video } : {}),
      ...(params.durationSec ? { duration: params.durationSec } : {}),
      ...(params.aspectRatio ? { aspect_ratio: params.aspectRatio } : {}),
      ...(params.extra ?? {}),
    };
    // If a version pin is present use /predictions, else the model-scoped endpoint.
    const hasVersion = params.providerModel.includes(":");
    const url = hasVersion
      ? `${BASE}/predictions`
      : `${BASE}/models/${params.providerModel}/predictions`;
    const body = hasVersion
      ? { version: params.providerModel.split(":")[1], input }
      : { input };
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as any;
    if (!res.ok) return { id: "", status: "failed", error: JSON.stringify(data), raw: data };
    return { id: data.id, status: mapStatus(data.status), raw: data };
  },

  async get(jobId: string): Promise<Job> {
    const key = requireKey(replicate);
    const res = await fetch(`${BASE}/predictions/${jobId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = (await res.json()) as any;
    const status = mapStatus(data.status);
    return {
      id: jobId,
      status,
      output: status === "succeeded" ? collect(data.output) : undefined,
      error: data.error ?? undefined,
      raw: data,
    };
  },
};
