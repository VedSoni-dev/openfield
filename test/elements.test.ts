import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "openfield-proj-"));
  process.env.OPENFIELD_HOME = dir;
});
afterEach(() => {
  delete process.env.OPENFIELD_HOME;
  rmSync(dir, { recursive: true, force: true });
});

describe("projects + elements", () => {
  it("creates a project and registers elements with valid handles", async () => {
    const proj = await import("../src/projects.js");
    const el = await import("../src/elements.js");
    const p = proj.createProject({ name: "Headphones Spot", createdAt: "2026-07-23T00:00:00Z" });
    expect(p.id).toBe("headphones-spot");
    el.upsertElement(p.id, { handle: "hero", type: "character", description: "lean man, curls" });
    expect(el.listElements(p.id)).toHaveLength(1);
    expect(() => el.upsertElement(p.id, { handle: "Bad Handle", type: "prop" })).toThrow(/bad handle/);
  });

  it("versions, locks, and blocks edits to a locked element", async () => {
    const proj = await import("../src/projects.js");
    const el = await import("../src/elements.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    el.upsertElement(p.id, { handle: "hero", type: "character" });
    el.addVersion(p.id, "hero", Buffer.from([1, 2, 3]), { ext: "png" });
    expect(el.getElement(p.id, "hero")?.currentVersion).toBe(1);
    el.lockElement(p.id, "hero");
    expect(el.getElement(p.id, "hero")?.status).toBe("locked");
    expect(() => el.addVersion(p.id, "hero", Buffer.from([9]))).toThrow(/locked/);
  });

  it("forks a variant that keeps type and points at its parent", async () => {
    const proj = await import("../src/projects.js");
    const el = await import("../src/elements.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    el.upsertElement(p.id, { handle: "s_hero", type: "character" });
    const wet = el.forkVariant(p.id, "s_hero", "s_hero_wet", "sweat-soaked");
    expect(wet.parentHandle).toBe("s_hero");
    expect(wet.type).toBe("character");
  });

  it("resolves @handles (and aliases) and turns locked elements into refs", async () => {
    const proj = await import("../src/projects.js");
    const el = await import("../src/elements.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    el.upsertElement(p.id, { handle: "bag", type: "prop", aliases: ["backpack"], description: "green daypack" });
    el.addVersion(p.id, "bag", Buffer.from([1]), { ext: "png" });
    const hits = el.resolveHandles(p.id, "he grabs the @backpack and runs");
    expect(hits.map((h) => h.handle)).toEqual(["bag"]);
    const refs = el.elementsToRefs(hits);
    expect(refs[0].role).toBe("prop");
    expect(refs[0].handle).toBe("bag");
  });

  it("builds a manifest with lock state", async () => {
    const proj = await import("../src/projects.js");
    const el = await import("../src/elements.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    el.upsertElement(p.id, { handle: "kitchen", type: "location", description: "sage-green kitchen, 3/4" });
    const man = el.buildManifest(p.id);
    expect(man[0]).toMatchObject({ handle: "kitchen", type: "location", locked: false });
  });
});
