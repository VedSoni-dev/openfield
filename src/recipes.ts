// Recipes — openfield's answer to Higgsfield's template gallery. Each recipe is
// a one-click bundle: a model, stacked presets, and a Cinema Studio selection,
// tuned for a common use case. Apply one, drop in your subject, generate.

import type { CinemaSelection } from "./cinema.js";

export interface Recipe {
  id: string;
  label: string;
  desc: string;
  model: string;
  presets: string[];
  cinema?: CinemaSelection;
  /** Placeholder subject to prime the field. */
  subjectHint: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "cinematic-trailer",
    label: "Cinematic Trailer",
    desc: "Epic blockbuster shot — sweeping crane, anamorphic, teal & orange.",
    model: "seedance-2.0",
    presets: ["crane-up", "epic-trailer", "teal-orange"],
    cinema: { body: "arri-alexa", lens: "anamorphic", focal: "f35", shot: "extreme-wide", angle: "low" },
    subjectHint: "a lone warrior stands on a cliff overlooking a burning city",
  },
  {
    id: "product-hero",
    label: "Product Hero Ad",
    desc: "Slow orbit around a product, macro, clean high-key light.",
    model: "kling-2.5",
    presets: ["orbit", "high-key", "hyperreal"],
    cinema: { body: "red-komodo", lens: "master-prime", focal: "f85", aperture: "f28", shot: "cu" },
    subjectHint: "a sleek perfume bottle on a reflective podium",
  },
  {
    id: "ugc-selfie",
    label: "UGC Selfie Ad",
    desc: "Handheld phone selfie vibe for authentic social ads.",
    model: "minimax-hailuo",
    presets: ["handheld", "cozy-warm"],
    cinema: { body: "iphone", shot: "cu", angle: "eye-level" },
    subjectHint: "a person excitedly showing a product to the camera in their kitchen",
  },
  {
    id: "fashion-film",
    label: "Fashion Film",
    desc: "Slow-motion tracking, 85mm, moody low-key.",
    model: "veo-3.1",
    presets: ["tracking", "slow-motion", "low-key", "35mm-film"],
    cinema: { body: "film-35", lens: "cooke-s4", focal: "f85", aperture: "f14a", shot: "medium" },
    subjectHint: "a model in a flowing gown walks through an empty marble hall",
  },
  {
    id: "real-estate",
    label: "Real-Estate Walkthrough",
    desc: "Smooth FPV glide through interiors, wide, bright.",
    model: "wan-2.2",
    presets: ["fpv-drone", "high-key"],
    cinema: { lens: "zeiss-supreme", focal: "f24", shot: "wide", angle: "eye-level" },
    subjectHint: "a sunlit modern living room opening onto a pool terrace",
  },
  {
    id: "music-video",
    label: "Music Video",
    desc: "Snorricam energy, neon noir, whip-pan transitions.",
    model: "seedance-2.0",
    presets: ["snorricam", "neon-noir", "whip-pan", "retro-80s"],
    cinema: { body: "red-komodo", lens: "anamorphic", focal: "f35" },
    subjectHint: "a singer performing under flickering neon in a rain-soaked alley",
  },
  {
    id: "anime-action",
    label: "Anime Action",
    desc: "Crash-zoom speed lines, dynamic FPV, anime style.",
    model: "wan-2.2",
    presets: ["crash-zoom", "fpv-drone", "anime"],
    cinema: { focal: "f24", angle: "dutch", shot: "medium" },
    subjectHint: "a spiky-haired hero leaps between rooftops charging an energy blast",
  },
  {
    id: "food-closeup",
    label: "Food Close-Up",
    desc: "Macro, shallow, warm practical light — mouth-watering.",
    model: "kling-2.5",
    presets: ["macro", "practical-firelight", "hyperreal"],
    cinema: { lens: "probe", focal: "f50", aperture: "f14a", shot: "ecu" },
    subjectHint: "steam rising off a fresh bowl of ramen, chili oil glistening",
  },
];

export function findRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
