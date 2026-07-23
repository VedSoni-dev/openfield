// Cinema Studio — openfield's answer to Higgsfield's flagship. Pick a virtual
// camera body, lens, focal length, aperture, and shot size; get a prompt
// fragment + structured params that make the model shoot like real glass.

export interface CinemaOption {
  id: string;
  label: string;
  /** Prose injected into the prompt. */
  phrase: string;
  /** Optional structured params. */
  params?: Record<string, unknown>;
  hint?: string;
}

export const CAMERA_BODIES: CinemaOption[] = [
  { id: "arri-alexa", label: "ARRI Alexa 35", phrase: "shot on an ARRI Alexa 35, rich filmic latitude, natural highlight roll-off", hint: "Hollywood digital" },
  { id: "red-komodo", label: "RED Komodo", phrase: "shot on a RED Komodo, crisp high-resolution detail, punchy contrast", hint: "sharp, modern" },
  { id: "sony-venice", label: "Sony Venice 2", phrase: "shot on a Sony Venice 2, clean shadows, cinematic dynamic range", hint: "clean, wide DR" },
  { id: "film-35", label: "35mm Film", phrase: "shot on 35mm motion picture film, organic grain, gentle halation", hint: "analog texture" },
  { id: "16mm", label: "16mm Film", phrase: "shot on grainy 16mm film, vintage documentary texture", hint: "grainy, retro" },
];

export const LENSES: CinemaOption[] = [
  { id: "master-prime", label: "Master Prime", phrase: "ARRI Master Prime lens, clinical sharpness, neutral rendering" },
  { id: "cooke-s4", label: "Cooke S4", phrase: "Cooke S4 lens, warm 'Cooke look', gentle skin rendering" },
  { id: "anamorphic", label: "Anamorphic", phrase: "anamorphic lens, 2.39:1 framing, horizontal flares, oval bokeh", params: { aspect_ratio: "2.39:1" } },
  { id: "vintage-glass", label: "Vintage Glass", phrase: "vintage uncoated lens, soft low-contrast bloom, characterful aberration" },
];

export const FOCAL_LENGTHS: CinemaOption[] = [
  { id: "f14", label: "14mm", phrase: "14mm ultra-wide, expansive exaggerated perspective", params: { focal_length_mm: 14 } },
  { id: "f24", label: "24mm", phrase: "24mm wide, environmental framing", params: { focal_length_mm: 24 } },
  { id: "f35", label: "35mm", phrase: "35mm natural field of view", params: { focal_length_mm: 35 } },
  { id: "f50", label: "50mm", phrase: "50mm normal lens, eye-level naturalism", params: { focal_length_mm: 50 } },
  { id: "f85", label: "85mm", phrase: "85mm short telephoto, flattering compression, shallow depth", params: { focal_length_mm: 85 } },
  { id: "f135", label: "135mm", phrase: "135mm telephoto, heavy compression, isolated subject", params: { focal_length_mm: 135 } },
];

export const APERTURES: CinemaOption[] = [
  { id: "f14a", label: "f/1.4", phrase: "wide open at f/1.4, razor-shallow depth of field, creamy bokeh", params: { aperture: "f/1.4" } },
  { id: "f28", label: "f/2.8", phrase: "at f/2.8, shallow depth of field, soft background", params: { aperture: "f/2.8" } },
  { id: "f56", label: "f/5.6", phrase: "at f/5.6, balanced depth of field", params: { aperture: "f/5.6" } },
  { id: "f11", label: "f/11", phrase: "stopped down to f/11, deep focus, everything sharp", params: { aperture: "f/11" } },
];

export const SHOT_SIZES: CinemaOption[] = [
  { id: "ecu", label: "Extreme Close-Up", phrase: "extreme close-up, filling the frame with detail" },
  { id: "cu", label: "Close-Up", phrase: "close-up shot" },
  { id: "medium", label: "Medium", phrase: "medium shot, waist up" },
  { id: "wide", label: "Wide", phrase: "wide establishing shot" },
  { id: "extreme-wide", label: "Extreme Wide", phrase: "extreme wide shot, subject small in a vast environment" },
];

export const CINEMA_GROUPS = {
  body: CAMERA_BODIES,
  lens: LENSES,
  focal: FOCAL_LENGTHS,
  aperture: APERTURES,
  shot: SHOT_SIZES,
} as const;

export type CinemaGroup = keyof typeof CINEMA_GROUPS;

export interface CinemaSelection {
  body?: string;
  lens?: string;
  focal?: string;
  aperture?: string;
  shot?: string;
}

function opt(group: CinemaGroup, id?: string): CinemaOption | undefined {
  if (!id) return undefined;
  return CINEMA_GROUPS[group].find((o) => o.id === id);
}

/** Build a prompt fragment + merged params from a Cinema Studio selection. */
export function cinemaFragment(sel: CinemaSelection): { phrase: string; params: Record<string, unknown> } {
  const order: CinemaGroup[] = ["shot", "focal", "aperture", "lens", "body"];
  const chosen = order.map((g) => opt(g, sel[g])).filter(Boolean) as CinemaOption[];
  const params: Record<string, unknown> = {};
  for (const c of chosen) Object.assign(params, c.params ?? {});
  return { phrase: chosen.map((c) => c.phrase).join(", "), params };
}
