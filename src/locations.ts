// Locations — the setting half of Higgsfield's "@ characters & locations".
// A named place with a description (and optional reference images) that gets
// woven into the prompt so a scene stays in a consistent world.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { openfieldHome } from "./soul.js";

export interface Location {
  id: string;
  name: string;
  description: string;
  refs?: string[];
}

function storePath(): string {
  return join(openfieldHome(), "locations.json");
}
type Store = Record<string, Location>;

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

export function listLocations(): Location[] {
  return Object.values(load());
}
export function getLocation(id: string): Location | undefined {
  return load()[id];
}
export function upsertLocation(l: Location): Location {
  if (!l.id) throw new Error("location needs an id");
  const store = load();
  store[l.id] = { ...store[l.id], ...l };
  save(store);
  return store[l.id];
}
export function removeLocation(id: string): boolean {
  const store = load();
  if (!store[id]) return false;
  delete store[id];
  save(store);
  return true;
}

/** The setting phrase woven into a prompt. */
export function locationPhrase(l: Location): string {
  return `set in ${l.name}${l.description ? ` — ${l.description}` : ""}`;
}
