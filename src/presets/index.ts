import type { Preset, PresetCategory } from "./types.js";
import { CAMERA_PRESETS } from "./camera.js";
import { LENS_PRESETS } from "./lens.js";
import { LIGHTING_PRESETS } from "./lighting.js";
import { STYLE_PRESETS } from "./style.js";
import { VFX_PRESETS } from "./vfx.js";
import { MOOD_PRESETS } from "./mood.js";
import { TRANSITION_PRESETS } from "./transition.js";

// All preset packs merge here. Add a pack = import + spread.
export const PRESETS: Preset[] = [
  ...CAMERA_PRESETS,
  ...LENS_PRESETS,
  ...LIGHTING_PRESETS,
  ...STYLE_PRESETS,
  ...VFX_PRESETS,
  ...MOOD_PRESETS,
  ...TRANSITION_PRESETS,
];

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function byCategory(cat: PresetCategory): Preset[] {
  return PRESETS.filter((p) => p.category === cat);
}

export function searchPresets(q: string): Preset[] {
  const t = q.toLowerCase();
  return PRESETS.filter(
    (p) =>
      p.id.includes(t) ||
      p.label.toLowerCase().includes(t) ||
      p.desc.toLowerCase().includes(t) ||
      p.category.includes(t) ||
      (p.tags ?? []).some((tag) => tag.includes(t)),
  );
}

export type { Preset, PresetCategory } from "./types.js";
