// Canonical model catalog. Each model can be reached through several providers;
// the router picks the first route whose key is configured. Add rows freely —
// this is where "hella options" lives.

export interface Route {
  provider: "fal" | "replicate" | "custom";
  providerModel: string;
}

export interface ModelEntry {
  id: string; // canonical, what users type
  label: string;
  kind: "t2v" | "i2v" | "both";
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
];

export function findModel(id: string): ModelEntry | undefined {
  return CATALOG.find((m) => m.id === id);
}
