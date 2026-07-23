// Compose a final prompt from: user subject/prompt + stacked presets.
// This is the "glorified prompt engineering" — made free and inspectable.

import type { Preset } from "./presets/types.js";
import { findPreset } from "./presets/index.js";

export interface ComposeInput {
  /** What the user actually wants on screen. */
  subject: string;
  /** Preset ids to stack, in order. */
  presets?: string[];
  /** Soul ID identity phrase, woven in right after the subject. */
  identity?: string;
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
  for (const p of used) {
    parts.push(p.template.replaceAll("{subject}", "the subject"));
  }

  const params: Record<string, unknown> = {};
  for (const p of used) Object.assign(params, p.params ?? {});

  return { prompt: parts.join(". "), params, used };
}
