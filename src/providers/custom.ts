// Custom / self-hosted adapter. For people running their OWN Seedance, Wan,
// Hunyuan, ComfyUI, etc. behind an HTTP endpoint. This is the "bring your own
// model" escape hatch — no vendor lock.
//
// Contract your server must implement:
//   POST {OPENFIELD_CUSTOM_URL}/create  -> { id }
//   GET  {OPENFIELD_CUSTOM_URL}/status/:id -> { status, output?: string[], error? }
// Key optional: OPENFIELD_CUSTOM_KEY (sent as Bearer).

import type { GenerateParams, Job, JobStatus, Provider } from "./types.js";

const OK: JobStatus[] = ["queued", "running", "succeeded", "failed"];
function norm(s: string): JobStatus {
  return (OK as string[]).includes(s) ? (s as JobStatus) : "failed";
}
function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.OPENFIELD_CUSTOM_KEY) h.Authorization = `Bearer ${process.env.OPENFIELD_CUSTOM_KEY}`;
  return h;
}

export const custom: Provider = {
  id: "custom",
  keyEnv: "OPENFIELD_CUSTOM_URL", // reuse: presence of the URL means configured
  configured: () => !!process.env.OPENFIELD_CUSTOM_URL,

  async create(params: GenerateParams): Promise<Job> {
    const base = process.env.OPENFIELD_CUSTOM_URL!;
    const res = await fetch(`${base}/create`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as any;
    if (!res.ok) return { id: "", status: "failed", error: JSON.stringify(data), raw: data };
    return { id: String(data.id), status: norm(data.status ?? "queued"), raw: data };
  },

  async get(jobId: string): Promise<Job> {
    const base = process.env.OPENFIELD_CUSTOM_URL!;
    const res = await fetch(`${base}/status/${jobId}`, { headers: headers() });
    const data = (await res.json()) as any;
    return {
      id: jobId,
      status: norm(data.status),
      output: data.output,
      error: data.error,
      raw: data,
    };
  },
};
