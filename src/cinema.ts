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
  { id: "alexa-65", label: "ARRI Alexa 65", phrase: "shot on an ARRI Alexa 65 large-format sensor, immense detail and depth", hint: "large format" },
  { id: "red-komodo", label: "RED Komodo", phrase: "shot on a RED Komodo, crisp high-resolution detail, punchy contrast", hint: "sharp, modern" },
  { id: "sony-venice", label: "Sony Venice 2", phrase: "shot on a Sony Venice 2, clean shadows, cinematic dynamic range", hint: "clean, wide DR" },
  { id: "panavision", label: "Panavision DXL2", phrase: "shot on a Panavision Millennium DXL2, silky large-format cinematic rendering", hint: "epic scale" },
  { id: "blackmagic", label: "Blackmagic URSA", phrase: "shot on a Blackmagic URSA, indie-film digital look", hint: "indie" },
  { id: "film-35", label: "35mm Film", phrase: "shot on 35mm motion picture film, organic grain, gentle halation", hint: "analog texture" },
  { id: "16mm", label: "16mm Film", phrase: "shot on grainy 16mm film, vintage documentary texture", hint: "grainy, retro" },
  { id: "super8", label: "Super 8", phrase: "shot on Super 8 film, heavy grain, gate weave, nostalgic home-movie feel", hint: "nostalgic" },
  { id: "iphone", label: "iPhone 15 Pro", phrase: "shot on an iPhone 15 Pro, crisp modern smartphone footage, natural HDR", hint: "vertical/UGC" },
  { id: "drone", label: "DJI Drone", phrase: "shot from a DJI drone, smooth aerial cinematography, sweeping altitude", hint: "aerial" },
];

export const LENSES: CinemaOption[] = [
  { id: "master-prime", label: "Master Prime", phrase: "ARRI Master Prime lens, clinical sharpness, neutral rendering" },
  { id: "cooke-s4", label: "Cooke S4", phrase: "Cooke S4 lens, warm 'Cooke look', gentle skin rendering" },
  { id: "zeiss-supreme", label: "Zeiss Supreme", phrase: "Zeiss Supreme Prime lens, crisp modern contrast, smooth bokeh" },
  { id: "panavision-primo", label: "Panavision Primo", phrase: "Panavision Primo lens, classic Hollywood rendering" },
  { id: "anamorphic", label: "Anamorphic", phrase: "anamorphic lens, 2.39:1 framing, horizontal flares, oval bokeh", params: { aspect_ratio: "2.39:1" } },
  { id: "petzval", label: "Petzval Swirl", phrase: "Petzval lens, swirling background bokeh, painterly falloff" },
  { id: "lensbaby", label: "Lensbaby", phrase: "Lensbaby lens, dreamy selective-focus blur sweeping across the frame" },
  { id: "split-diopter", label: "Split Diopter", phrase: "split-diopter shot, foreground and background both in sharp focus simultaneously" },
  { id: "probe", label: "Probe / Macro", phrase: "macro probe lens, extreme close proximity, tiny world magnified" },
  { id: "vintage-glass", label: "Vintage Glass", phrase: "vintage uncoated lens, soft low-contrast bloom, characterful aberration" },
];

export const FOCAL_LENGTHS: CinemaOption[] = [
  { id: "f8", label: "8mm", phrase: "8mm fisheye, extreme barrel distortion", params: { focal_length_mm: 8 } },
  { id: "f14", label: "14mm", phrase: "14mm ultra-wide, expansive exaggerated perspective", params: { focal_length_mm: 14 } },
  { id: "f24", label: "24mm", phrase: "24mm wide, environmental framing", params: { focal_length_mm: 24 } },
  { id: "f35", label: "35mm", phrase: "35mm natural field of view", params: { focal_length_mm: 35 } },
  { id: "f50", label: "50mm", phrase: "50mm normal lens, eye-level naturalism", params: { focal_length_mm: 50 } },
  { id: "f85", label: "85mm", phrase: "85mm short telephoto, flattering compression, shallow depth", params: { focal_length_mm: 85 } },
  { id: "f135", label: "135mm", phrase: "135mm telephoto, heavy compression, isolated subject", params: { focal_length_mm: 135 } },
  { id: "f200", label: "200mm", phrase: "200mm long telephoto, extreme compression, distant flattening", params: { focal_length_mm: 200 } },
];

export const APERTURES: CinemaOption[] = [
  { id: "f14a", label: "f/1.4", phrase: "wide open at f/1.4, razor-shallow depth of field, creamy bokeh", params: { aperture: "f/1.4" } },
  { id: "f28", label: "f/2.8", phrase: "at f/2.8, shallow depth of field, soft background", params: { aperture: "f/2.8" } },
  { id: "f56", label: "f/5.6", phrase: "at f/5.6, balanced depth of field", params: { aperture: "f/5.6" } },
  { id: "f8a", label: "f/8", phrase: "at f/8, sharp across most of the frame", params: { aperture: "f/8" } },
  { id: "f11", label: "f/11", phrase: "stopped down to f/11, deep focus, everything sharp", params: { aperture: "f/11" } },
  { id: "f16", label: "f/16", phrase: "stopped down to f/16, maximum depth of field, sunstars on highlights", params: { aperture: "f/16" } },
];

export const SHOT_SIZES: CinemaOption[] = [
  { id: "ecu", label: "Extreme Close-Up", phrase: "extreme close-up, filling the frame with detail" },
  { id: "cu", label: "Close-Up", phrase: "close-up shot" },
  { id: "medium", label: "Medium", phrase: "medium shot, waist up" },
  { id: "ots", label: "Over-the-Shoulder", phrase: "over-the-shoulder shot" },
  { id: "two-shot", label: "Two Shot", phrase: "two shot framing both subjects" },
  { id: "wide", label: "Wide", phrase: "wide establishing shot" },
  { id: "extreme-wide", label: "Extreme Wide", phrase: "extreme wide shot, subject small in a vast environment" },
];

export const ANGLES: CinemaOption[] = [
  { id: "eye-level", label: "Eye Level", phrase: "eye-level angle, neutral natural perspective" },
  { id: "low", label: "Low Angle", phrase: "low camera angle looking up, imposing and powerful" },
  { id: "high", label: "High Angle", phrase: "high camera angle looking down, subject diminished" },
  { id: "dutch", label: "Dutch Tilt", phrase: "dutch-tilt angle, canted horizon, unease and tension" },
  { id: "birdseye", label: "Bird's Eye", phrase: "top-down bird's-eye view directly overhead" },
  { id: "worms-eye", label: "Worm's Eye", phrase: "worm's-eye view from ground level looking straight up" },
];

export const CINEMA_GROUPS = {
  body: CAMERA_BODIES,
  lens: LENSES,
  focal: FOCAL_LENGTHS,
  aperture: APERTURES,
  shot: SHOT_SIZES,
  angle: ANGLES,
} as const;

export type CinemaGroup = keyof typeof CINEMA_GROUPS;

export interface CinemaSelection {
  body?: string;
  lens?: string;
  focal?: string;
  aperture?: string;
  shot?: string;
  angle?: string;
}

function opt(group: CinemaGroup, id?: string): CinemaOption | undefined {
  if (!id) return undefined;
  return CINEMA_GROUPS[group].find((o) => o.id === id);
}

/** Build a prompt fragment + merged params from a Cinema Studio selection. */
export function cinemaFragment(sel: CinemaSelection): { phrase: string; params: Record<string, unknown> } {
  const order: CinemaGroup[] = ["shot", "angle", "focal", "aperture", "lens", "body"];
  const chosen = order.map((g) => opt(g, sel[g])).filter(Boolean) as CinemaOption[];
  const params: Record<string, unknown> = {};
  for (const c of chosen) Object.assign(params, c.params ?? {});
  return { phrase: chosen.map((c) => c.phrase).join(", "), params };
}
