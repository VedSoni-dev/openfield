// Canonical model catalog. Each model can be reached through several providers;
// the router picks the first route whose key is configured. Add rows freely —
// this is where "hella options" lives.

export interface Route {
  provider: "fal" | "replicate" | "custom";
  providerModel: string;
}

export type ModelKind = "t2v" | "i2v" | "both" | "image" | "upscale" | "lipsync" | "v2v";

export interface ModelEntry {
  id: string; // canonical, what users type
  label: string;
  kind: ModelKind;
  routes: Route[];
}

export const CATALOG: ModelEntry[] = [
  {
    id: "seedance-2.0",
    label: "ByteDance Seedance 2.0",
    kind: "both",
    routes: [
      { provider: "fal", providerModel: "fal-ai/bytedance/seedance/v1/pro/text-to-video" },
      { provider: "replicate", providerModel: "bytedance/seedance-1-pro" },
    ],
  },
  {
    id: "kling-2.5",
    label: "Kuaishou Kling 2.5",
    kind: "both",
    routes: [
      { provider: "fal", providerModel: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" },
      { provider: "replicate", providerModel: "kwaivgi/kling-v2.5-turbo-pro" },
    ],
  },
  {
    id: "veo-3.1",
    label: "Google Veo 3.1",
    kind: "both",
    routes: [
      { provider: "fal", providerModel: "fal-ai/veo3.1" },
      { provider: "replicate", providerModel: "google/veo-3.1" },
    ],
  },
  {
    id: "wan-2.2",
    label: "Alibaba Wan 2.2 (open weights)",
    kind: "both",
    routes: [
      { provider: "fal", providerModel: "fal-ai/wan/v2.2-a14b/text-to-video" },
      { provider: "replicate", providerModel: "wan-video/wan-2.2-t2v-a14b" },
      { provider: "custom", providerModel: "wan-2.2" },
    ],
  },
  {
    id: "hunyuan",
    label: "Tencent HunyuanVideo (open weights)",
    kind: "t2v",
    routes: [
      { provider: "fal", providerModel: "fal-ai/hunyuan-video" },
      { provider: "replicate", providerModel: "tencent/hunyuan-video" },
      { provider: "custom", providerModel: "hunyuan" },
    ],
  },
  {
    id: "ltx",
    label: "Lightricks LTX-Video (open weights, fast)",
    kind: "both",
    routes: [
      { provider: "fal", providerModel: "fal-ai/ltx-video" },
      { provider: "custom", providerModel: "ltx" },
    ],
  },
  {
    id: "minimax-hailuo",
    label: "MiniMax Hailuo 02",
    kind: "both",
    routes: [
      { provider: "fal", providerModel: "fal-ai/minimax/hailuo-02/standard/text-to-video" },
      { provider: "replicate", providerModel: "minimax/hailuo-02" },
    ],
  },

  // --- Operations (everything Higgsfield does beyond plain t2v) ---
  {
    id: "image", // start-frame / poster generation for image-to-video
    label: "FLUX.1 image (start frames)",
    kind: "image",
    routes: [
      { provider: "fal", providerModel: "fal-ai/flux/dev" },
      { provider: "replicate", providerModel: "black-forest-labs/flux-dev" },
    ],
  },
  {
    id: "upscale", // enhance / upres a generated clip
    label: "Video upscaler",
    kind: "upscale",
    routes: [
      { provider: "fal", providerModel: "fal-ai/topaz/upscale/video" },
      { provider: "replicate", providerModel: "topazlabs/video-upscale" },
    ],
  },
  {
    id: "lipsync", // Speak / LipSync Studio
    label: "LipSync (talking video)",
    kind: "lipsync",
    routes: [
      { provider: "fal", providerModel: "fal-ai/sync-lipsync" },
      { provider: "replicate", providerModel: "bytedance/latentsync" },
    ],
  },
  {
    id: "restyle", // video-to-video restyle
    label: "Restyle (video-to-video)",
    kind: "v2v",
    routes: [
      { provider: "fal", providerModel: "fal-ai/wan/v2.2-a14b/video-to-video" },
      { provider: "custom", providerModel: "restyle" },
    ],
  },
];

export function findModel(id: string): ModelEntry | undefined {
  return CATALOG.find((m) => m.id === id);
}
