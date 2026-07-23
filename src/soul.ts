// Soul ID — character consistency. Higgsfield's paid feature: lock the same
// character across shots. Here it's a local file-backed store of reference
// images + an identity descriptor, threaded into generation.
//
// Real consistency needs model-side reference conditioning (image-to-video with
// a subject reference, or IP-Adapter). openfield stores the character once and
// hands the references + a stable identity phrase to whichever provider you use.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Character {
  id: string; // kebab-case handle, e.g. "nova"
  name: string; // display name used in the identity phrase
  refs: string[]; // reference image urls or local paths
  /** Extra descriptors that pin the look ("red bob, freckles, green jacket"). */
  traits?: string;
  notes?: string;
}

export function openfieldHome(): string {
  return process.env.OPENFIELD_HOME || join(homedir(), ".openfield");
}
function storePath(): string {
  return join(openfieldHome(), "characters.json");
}

type Store = Record<string, Character>;

function load(): Store {
  const p = storePath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Store;
  } catch {
    return {};
  }
}
function save(store: Store): void {
  mkdirSync(openfieldHome(), { recursive: true });
  writeFileSync(storePath(), JSON.stringify(store, null, 2));
}

export function listCharacters(): Character[] {
  return Object.values(load());
}

export function getCharacter(id: string): Character | undefined {
  return load()[id];
}

export function upsertCharacter(c: Character): Character {
  if (!c.id) throw new Error("character needs an id");
  const store = load();
  store[c.id] = { ...store[c.id], ...c };
  save(store);
  return store[c.id];
}

export function removeCharacter(id: string): boolean {
  const store = load();
  if (!store[id]) return false;
  delete store[id];
  save(store);
  return true;
}

/** Stable identity phrase woven into the prompt so the model keeps the look. */
export function identityPhrase(c: Character): string {
  const traits = c.traits ? `, ${c.traits}` : "";
  return `${c.name}, the same consistent character${traits}, identical face and appearance across every shot`;
}
