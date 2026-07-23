// fal.ai adapter. One key unlocks Seedance, Kling, Veo, Wan, Hunyuan, LTX, Minimax...
// Uses fal's queue REST API directly (no SDK dep). BYOK: FAL_KEY.

import type { GenerateParams, Job, JobStatus, Provider } from "./types.js";
import { requireKey } from "./types.js";

const BASE = "https://queue.fal.run";

function mapStatus(s: string): JobStatus {
  if (s === "COMPLETED") return "succeeded";
  if (s === "IN_PROGRESS") return "running";
  if (s === "IN_QUEUE") return "queued";
  return "failed";
}

// providerModel is the fal app path, e.g. "fal-ai/bytedance/seedance/v1/pro/text-to-video"
export const fal: Provider = {
  id: "fal",
  keyEnv: "FAL_KEY",
  configured: () => !!process.env.FAL_KEY,

  async create(params: GenerateParams): Promise<Job> {
    const key = requireKey(fal);
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      ...(params.image ? { image_url: params.image } : {}),
      ...(params.references?.length ? { reference_image_urls: params.references } : {}),
      ...(params.audio ? { audio_url: params.audio } : {}),
      ...(params.video ? { video_url: params.video } : {}),
      ...(params.durationSec ? { duration: String(params.durationSec) } : {}),
      ...(params.aspectRatio ? { aspect_ratio: params.aspectRatio } : {}),
      ...(params.resolution ? { resolution: params.resolution } : {}),
      ...(params.extra ?? {}),
    };
    const res = await fetch(`${BASE}/${params.providerModel}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as any;
    if (!res.ok) return { id: "", status: "failed", error: JSON.stringify(data), raw: data };
    // Encode app path into id so get() can hit the right status endpoint statelessly.
    return { id: `${params.providerModel}::${data.request_id}`, status: mapStatus(data.status ?? "IN_QUEUE"), raw: data };
  },

  async get(jobId: string): Promise<Job> {
    const key = requireKey(fal);
    const [app, reqId] = jobId.split("::");
    // fal wants the app's base path (first two segments) for the status route.
    const appBase = app.split("/").slice(0, 2).join("/");
    const res = await fetch(`${BASE}/${appBase}/requests/${reqId}/status`, {
      headers: { Authorization: `Key ${key}` },
    });
    const data = (await res.json()) as any;
    const status = mapStatus(data.status);
    if (status !== "succeeded") return { id: jobId, status, raw: data };
    const out = await fetch(`${BASE}/${appBase}/requests/${reqId}`, {
      headers: { Authorization: `Key ${key}` },
    });
    const result = (await out.json()) as any;
    const urls: string[] = [];
    if (result.video?.url) urls.push(result.video.url);
    if (Array.isArray(result.videos)) urls.push(...result.videos.map((v: any) => v.url));
    if (result.image?.url) urls.push(result.image.url);
    if (Array.isArray(result.images)) urls.push(...result.images.map((v: any) => v.url ?? v));
    return { id: jobId, status: "succeeded", output: urls.filter(Boolean), raw: result };
  },
};
