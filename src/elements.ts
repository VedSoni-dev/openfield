// Elements — the @handle registry (BACKLOT DOC 05/06). Each element is a
// recurring asset (character, product, location, prop, wardrobe, schematic,
// audio) with versions, a lock, and optional variant parentage. Consistency is
// won here: locked elements attach their canonical reference image to every
// generation that @-mentions them.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { projectDir, assetDir } from "./projects.js";
import type { Ref, RefRole } from "./refs.js";

export type ElementType =
  | "character"
  | "product"
  | "location"
  | "prop"
  | "wardrobe"
  | "schematic"
  | "audio";

export interface AssetVersion {
  versionNo: number;
  storagePath: string; // local file under the project's asset dir
  source: "uploaded" | "generated" | "edited" | "composited";
  recipeKey?: string;
  notes?: string;
}

export interface Element {
  handle: string; // ^[a-z][a-z0-9_]{1,30}$
  type: ElementType;
  displayName: string;
  aliases: string[];
  description: string;
  status: "draft" | "testing" | "locked";
  parentHandle?: string; // variant of
  versions: AssetVersion[];
  currentVersion?: number;
}

export const HANDLE_RE = /^[a-z][a-z0-9_]{1,30}$/;

function elementsPath(projectId: string): string {
  return join(projectDir(projectId), "elements.json");
}
type Store = Record<string, Element>;
function load(projectId: string): Store {
  const p = elementsPath(projectId);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Store;
  } catch {
    return {};
  }
}
function save(projectId: string, store: Store): void {
  mkdirSync(projectDir(projectId), { recursive: true });
  writeFileSync(elementsPath(projectId), JSON.stringify(store, null, 2));
}

export function listElements(projectId: string): Element[] {
  return Object.values(load(projectId));
}
export function getElement(projectId: string, handle: string): Element | undefined {
  return load(projectId)[handle];
}

export function upsertElement(
  projectId: string,
  input: { handle: string; type: ElementType; displayName?: string; aliases?: string[]; description?: string; parentHandle?: string },
): Element {
  if (!HANDLE_RE.test(input.handle)) throw new Error(`bad handle "${input.handle}" — must match ${HANDLE_RE}`);
  const store = load(projectId);
  const prev = store[input.handle];
  const el: Element = {
    handle: input.handle,
    type: input.type,
    displayName: input.displayName ?? prev?.displayName ?? input.handle,
    aliases: input.aliases ?? prev?.aliases ?? [],
    description: input.description ?? prev?.description ?? "",
    status: prev?.status ?? "draft",
    parentHandle: input.parentHandle ?? prev?.parentHandle,
    versions: prev?.versions ?? [],
    currentVersion: prev?.currentVersion,
  };
  store[input.handle] = el;
  save(projectId, store);
  return el;
}

/** Save bytes (from an uploaded/generated image) as the next version. */
export function addVersion(
  projectId: string,
  handle: string,
  data: Buffer,
  opts: { ext?: string; source?: AssetVersion["source"]; recipeKey?: string; notes?: string } = {},
): AssetVersion {
  const store = load(projectId);
  const el = store[handle];
  if (!el) throw new Error(`no element @${handle} in project`);
  if (el.status === "locked") throw new Error(`@${handle} is locked — fork a variant to change it`);
  const versionNo = (el.versions.at(-1)?.versionNo ?? 0) + 1;
  mkdirSync(assetDir(projectId), { recursive: true });
  const ext = (opts.ext ?? "png").replace(/^\./, "");
  const storagePath = join(assetDir(projectId), `${handle}_v${versionNo}.${ext}`);
  writeFileSync(storagePath, data);
  const v: AssetVersion = { versionNo, storagePath, source: opts.source ?? "uploaded", recipeKey: opts.recipeKey, notes: opts.notes };
  el.versions.push(v);
  el.currentVersion = versionNo;
  if (el.status === "draft") el.status = "testing";
  store[handle] = el;
  save(projectId, store);
  return v;
}

/** Register a version that already lives at a path/URL (no copy). */
export function addVersionRef(
  projectId: string,
  handle: string,
  storagePath: string,
  opts: { source?: AssetVersion["source"]; notes?: string } = {},
): AssetVersion {
  const store = load(projectId);
  const el = store[handle];
  if (!el) throw new Error(`no element @${handle} in project`);
  const versionNo = (el.versions.at(-1)?.versionNo ?? 0) + 1;
  const v: AssetVersion = { versionNo, storagePath, source: opts.source ?? "uploaded", notes: opts.notes };
  el.versions.push(v);
  el.currentVersion = versionNo;
  if (el.status === "draft") el.status = "testing";
  store[handle] = el;
  save(projectId, store);
  return v;
}

export function lockElement(projectId: string, handle: string): Element {
  const store = load(projectId);
  const el = store[handle];
  if (!el) throw new Error(`no element @${handle}`);
  if (!el.currentVersion) throw new Error(`@${handle} has no version to lock`);
  el.status = "locked";
  store[handle] = el;
  save(projectId, store);
  return el;
}

/** Fork a locked element into a state/wardrobe variant. */
export function forkVariant(projectId: string, parentHandle: string, newHandle: string, description?: string): Element {
  const parent = getElement(projectId, parentHandle);
  if (!parent) throw new Error(`no parent @${parentHandle}`);
  return upsertElement(projectId, {
    handle: newHandle,
    type: parent.type,
    displayName: parent.displayName,
    description: description ?? parent.description,
    parentHandle,
  });
}

const TYPE_ROLE: Record<ElementType, RefRole> = {
  character: "character",
  product: "product",
  prop: "prop",
  wardrobe: "prop",
  location: "location",
  schematic: "schematic",
  audio: "reference",
};

function currentPath(el: Element): string | undefined {
  return el.versions.find((v) => v.versionNo === el.currentVersion)?.storagePath;
}

/** Parse @tokens from text and resolve them (through aliases) to elements. */
export function resolveHandles(projectId: string, text: string): Element[] {
  const store = load(projectId);
  const byAlias = new Map<string, Element>();
  for (const el of Object.values(store)) {
    byAlias.set(el.handle, el);
    for (const a of el.aliases) byAlias.set(a.toLowerCase(), el);
  }
  const found = new Map<string, Element>();
  for (const m of text.matchAll(/@([a-z][a-z0-9_]*)/gi)) {
    const el = byAlias.get(m[1].toLowerCase());
    if (el) found.set(el.handle, el);
  }
  return [...found.values()];
}

/** Elements → attachable refs (locked, image-bearing only). */
export function elementsToRefs(elements: Element[]): Ref[] {
  const refs: Ref[] = [];
  for (const el of elements) {
    if (el.type === "audio") continue;
    const src = currentPath(el);
    if (src) refs.push({ handle: el.handle, role: TYPE_ROLE[el.type], src });
  }
  return refs;
}

/** The element manifest the Director consumes (DOC 06 §6.2). */
export function buildManifest(projectId: string): Array<{ handle: string; type: ElementType; desc: string; locked: boolean }> {
  return listElements(projectId).map((el) => ({
    handle: el.handle,
    type: el.type,
    desc: el.description,
    locked: el.status === "locked",
  }));
}

export function extFromName(name: string): string {
  return (extname(name) || ".png").replace(/^\./, "");
}
