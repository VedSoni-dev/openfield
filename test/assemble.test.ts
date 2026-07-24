import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "openfield-asm-"));
  process.env.OPENFIELD_HOME = dir;
});
afterEach(() => {
  delete process.env.OPENFIELD_HOME;
  rmSync(dir, { recursive: true, force: true });
});

async function setup() {
  const proj = await import("../src/projects.js");
  const takes = await import("../src/takes.js");
  const { saveShotlist } = await import("../src/director/index.js");
  const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
  saveShotlist(p.id, {
    project_title: "Tap In",
    style_prefix: "Style: a.",
    scenes: [
      { code: "1a", title: "k", logline: "", duration_target_s: 10, element_handles: [], audio_handle: null, style_override: null, body: "b" },
      { code: "2", title: "s", logline: "", duration_target_s: 15, element_handles: [], audio_handle: null, style_override: null, body: "b" },
    ],
  });
  const mk = (scene: string, no: number) =>
    takes.addTake(p.id, { sceneCode: scene, takeNo: no, seed: 100 + no, model: "seedance-2.0", status: "succeeded", output: [`https://x/${scene}_${no}.mp4`], selected: false, prompt: "p", createdAt: "2026-07-23T00:00:00Z" });
  mk("1a", 1); mk("1a", 2); mk("2", 1);
  takes.selectTake(p.id, "1a", 2);
  takes.selectTake(p.id, "2", 1);
  return p.id;
}

describe("assemble", () => {
  it("exports FCPXML with clips in scene order and traceable markers", async () => {
    const pid = await setup();
    const { exportFCPXML } = await import("../src/assemble.js");
    const xml = exportFCPXML(pid, "My Cut");
    expect(xml).toContain("<fcpxml version=\"1.10\">");
    // selected: 1a take2, then scene2 take1
    expect(xml).toContain("scene 1a · take 2 · seedance-2.0 · seed 102");
    expect(xml).toContain("scene 2 · take 1 · seedance-2.0 · seed 101");
    // 1a duration 10s @24 = 240 frames; scene2 offset should be 240/24s
    expect(xml).toContain('offset="240/24s"');
    expect(xml).toContain("My Cut");
  });

  it("exports a manifest CSV of the selected takes", async () => {
    const pid = await setup();
    const { exportManifestCsv } = await import("../src/assemble.js");
    const csv = exportManifestCsv(pid);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("scene,take,file,seed,model,rating");
    expect(lines).toHaveLength(3); // header + 2 selected
    expect(csv).toContain("1a,2,https://x/1a_2.mp4,102,seedance-2.0");
  });

  it("assembly summary lists selected scenes", async () => {
    const pid = await setup();
    const { assemblySummary } = await import("../src/assemble.js");
    expect(assemblySummary(pid).map((s) => `${s.scene}:${s.take}`)).toEqual(["1a:2", "2:1"]);
  });
});
