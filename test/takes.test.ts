import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "openfield-takes-"));
  process.env.OPENFIELD_HOME = dir;
});
afterEach(() => {
  delete process.env.OPENFIELD_HOME;
  rmSync(dir, { recursive: true, force: true });
});

async function seedTake(pid: string, sceneCode: string, takeNo: number, status = "succeeded") {
  const t = await import("../src/takes.js");
  t.addTake(pid, { sceneCode, takeNo, model: "seedance-2.0", status: status as any, output: ["u"], selected: false, prompt: "p", createdAt: "2026-07-23T00:00:00Z" });
}

describe("takes", () => {
  it("adds and lists takes in scene/take order", async () => {
    const proj = await import("../src/projects.js");
    const t = await import("../src/takes.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    await seedTake(p.id, "1a", 1);
    await seedTake(p.id, "1a", 2);
    expect(t.listTakes(p.id, "1a").map((x) => x.takeNo)).toEqual([1, 2]);
    expect(t.nextTakeNo(p.id, "1a")).toBe(3);
  });

  it("rates within 1..5 and rejects out of range", async () => {
    const proj = await import("../src/projects.js");
    const t = await import("../src/takes.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    await seedTake(p.id, "1a", 1);
    expect(t.rateTake(p.id, "1a", 1, 4).rating).toBe(4);
    expect(() => t.rateTake(p.id, "1a", 1, 9)).toThrow(/1\.\.5/);
  });

  it("selecting a take deselects the others in that scene", async () => {
    const proj = await import("../src/projects.js");
    const t = await import("../src/takes.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    await seedTake(p.id, "1a", 1);
    await seedTake(p.id, "1a", 2);
    await seedTake(p.id, "2", 1);
    t.selectTake(p.id, "1a", 1);
    t.selectTake(p.id, "1a", 2); // moves the select
    const scene1 = t.listTakes(p.id, "1a");
    expect(scene1.filter((x) => x.selected).map((x) => x.takeNo)).toEqual([2]);
    t.selectTake(p.id, "2", 1);
    expect(t.selectedTakes(p.id).map((x) => `${x.sceneCode}:${x.takeNo}`)).toEqual(["1a:2", "2:1"]);
  });

  it("seed policy: refine reuses, vary makes a new seed", async () => {
    const t = await import("../src/takes.js");
    expect(t.pickSeed("refine", 42, () => 0.5)).toBe(42);
    expect(t.pickSeed("vary", 42, () => 0.5)).toBe(500_000_000);
  });
});
