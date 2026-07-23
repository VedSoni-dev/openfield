// Reference attachment — the load-bearing piece BACKLOT DOC 04/06 gets right and
// a naive @-mention gets wrong. A reference is an image the video model actually
// receives (not just a name in the prompt), plus a "legend" line telling the
// model what each attached image is.

import { readFileSync, existsSync } from "node:fs";

export type RefRole =
  | "character"
  | "product"
  | "prop"
  | "location"
  | "schematic"
  | "first_frame"
  | "reference";

export interface Ref {
  handle: string;
  role: RefRole;
  /** URL, data: URI, or a local file path. */
  src: string;
}

// DOC 06 §6.3 — order refs by role priority so the highest-value ones survive
// a maxRefs trim.
const PRIORITY: RefRole[] = ["character", "product", "prop", "location", "schematic", "reference", "first_frame"];

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
};

/** Turn a local path into a data: URI so BYOK providers can receive it; pass
 *  URLs and data URIs through untouched. */
export function resolveRefUrl(src: string): string {
  if (/^(https?:|data:)/.test(src)) return src;
  if (existsSync(src)) {
    const ext = src.split(".").pop()?.toLowerCase() ?? "png";
    const mime = MIME[ext] ?? "image/png";
    return `data:${mime};base64,${readFileSync(src).toString("base64")}`;
  }
  return src; // unknown — let the provider try
}

/** Sort by role priority, then cap at maxRefs (dropping lowest priority). */
export function orderAndCap(refs: Ref[], maxRefs = 10): { kept: Ref[]; dropped: Ref[] } {
  const sorted = [...refs].sort((a, b) => PRIORITY.indexOf(a.role) - PRIORITY.indexOf(b.role));
  return { kept: sorted.slice(0, maxRefs), dropped: sorted.slice(maxRefs) };
}

const ROLE_LABEL: Record<RefRole, string> = {
  character: "character sheet",
  product: "product sheet",
  prop: "prop sheet",
  location: "location",
  schematic: "top-down layout map",
  first_frame: "first frame",
  reference: "reference",
};

/** DOC 04 §4.2 — the reference legend, prepended so the model is model-agnostic
 *  about what each attached image means. */
export function referenceLegend(refs: Ref[]): string {
  if (!refs.length) return "";
  const lines = refs.map((r, i) => `Image ${i + 1} = @${r.handle} (${ROLE_LABEL[r.role]})`);
  return `References: ${lines.join(". ")}.`;
}
