// Projects — the container for a Cinema Studio production (BACKLOT DOC 03).
// File-based, free, no DB: an index at ~/.openfield/projects.json plus a
// per-project directory holding elements.json and asset files.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { openfieldHome } from "./soul.js";

export interface Project {
  id: string;
  name: string;
  aspectRatio: string; // "16:9"
  targetRuntimeS: number; // 60
  createdAt: string;
}

function indexPath(): string {
  return join(openfieldHome(), "projects.json");
}
export function projectDir(id: string): string {
  return join(openfieldHome(), "projects", id);
}
export function assetDir(id: string): string {
  return join(projectDir(id), "assets");
}

type Index = Record<string, Project>;
function load(): Index {
  const p = indexPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Index;
  } catch {
    return {};
  }
}
function save(idx: Index): void {
  mkdirSync(openfieldHome(), { recursive: true });
  writeFileSync(indexPath(), JSON.stringify(idx, null, 2));
}

export function listProjects(): Project[] {
  return Object.values(load());
}
export function getProject(id: string): Project | undefined {
  return load()[id];
}

/** Deterministic-ish id from name + a caller-supplied stamp (stay pure — no Date). */
export function slugId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "project";
}

export function createProject(input: {
  name: string;
  aspectRatio?: string;
  targetRuntimeS?: number;
  createdAt: string; // ISO — passed in so this module stays pure
  id?: string;
}): Project {
  const idx = load();
  let id = input.id ?? slugId(input.name);
  // avoid collision
  let n = 2;
  while (idx[id]) id = `${slugId(input.name)}-${n++}`;
  const project: Project = {
    id,
    name: input.name,
    aspectRatio: input.aspectRatio ?? "16:9",
    targetRuntimeS: input.targetRuntimeS ?? 60,
    createdAt: input.createdAt,
  };
  idx[id] = project;
  save(idx);
  mkdirSync(assetDir(id), { recursive: true });
  return project;
}

export function removeProject(id: string): boolean {
  const idx = load();
  if (!idx[id]) return false;
  delete idx[id];
  save(idx);
  rmSync(projectDir(id), { recursive: true, force: true });
  return true;
}
