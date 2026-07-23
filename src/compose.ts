// Compose a final prompt from: user subject/prompt + stacked presets.
// This is the "glorified prompt engineering" — made free and inspectable.

import type { Preset } from "./presets/types.js";
import { findPreset } from "./presets/index.js";
import { cinemaFragment, type CinemaSelection } from "./cinema.js";

export interface ComposeInput {
  /** What the user actually wants on screen. */
  subject: string;
  /** Preset ids to stack, in order. */
  presets?: string[];
  /** Soul ID identity phrase, woven in right after the subject. */
  identity?: string;
  /** Location setting phrase, woven in after identity. */
  setting?: string;
  /** Cinema Studio selection (camera body, lens, focal, aperture, shot). */
  cinema?: CinemaSelection;
  /** Reference legend, prepended as the first line(s) so the model knows what
   *  each attached reference image is. */
  legend?: string;
}

export interface Composed {
  prompt: string;
  /** Merged structured params from every preset (later presets win). */
  params: Record<string, unknown>;
  used: Preset[];
}

export function compose(input: ComposeInput): Composed {
  const used: Preset[] = [];
  for (const id of input.presets ?? []) {
    const p = findPreset(id);
    if (!p) throw new Error(`unknown preset: ${id}`);
    used.push(p);
  }

  // Build the prompt: subject first, then each preset fragment with {subject}
  // resolved to a short back-reference so we don't repeat the full subject.
  const parts = [input.subject.trim()];
  if (input.identity) parts.push(input.identity.trim());
  if (input.setting) parts.push(input.setting.trim());
  for (const p of used) {
    parts.push(p.template.replaceAll("{subject}", "the subject"));
  }

  const params: Record<string, unknown> = {};
  for (const p of used) Object.assign(params, p.params ?? {});

  // Cinema Studio fragment goes last — the optical/format description.
  if (input.cinema) {
    const cin = cinemaFragment(input.cinema);
    if (cin.phrase) parts.push(cin.phrase);
    Object.assign(params, cin.params);
  }

  const body = parts.join(". ");
  // Reference legend leads the prompt (its own line) so the model binds each
  // attached image before reading the scene.
  const prompt = input.legend ? `${input.legend.trim()}\n${body}` : body;
  return { prompt, params, used };
}
