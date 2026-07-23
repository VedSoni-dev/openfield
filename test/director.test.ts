import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// mock the LLM so compile is deterministic + offline
vi.mock("../src/orchestrator/llm.js", () => ({
  chat: vi.fn(async () =>
    ({
      content: JSON.stringify({
        project_title: "Tap In",
        style_prefix: "Style: 8K IMAX commercial, 16:9.\nLighting: soft morning daylight.\nAudio: diegetic only.",
        scenes: [
          {
            code: "1a",
            title: "Kitchen tap-in",
            logline: "hero kills the mower noise",
            duration_target_s: 15,
            element_handles: ["hero", "headphones"],
            audio_handle: null,
            style_override: null,
            body: "Characters:\nHERO (@hero) — 100% matches the reference.\n\nScene: kitchen.\n\nCUT 1 — 35mm: he lifts @headphones.\n\nAUDIO: mower to hum.\n\nPOSITIVE LOCKS: orange ring identical.",
          },
        ],
      }),
      toolCalls: [],
    }),
  ),
  llmConfig: () => ({ base: "x", key: "k", model: "m" }),
  llmConfigured: () => true,
  HERMES_MODEL: "nousresearch/hermes-3-llama-3.1-70b",
}));

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "openfield-dir-"));
  process.env.OPENFIELD_HOME = dir;
});
afterEach(() => {
  delete process.env.OPENFIELD_HOME;
  rmSync(dir, { recursive: true, force: true });
});

describe("director", () => {
  it("splices only matching line-keys into the prefix", async () => {
    const { spliceOverride } = await import("../src/director/index.js");
    const prefix = "Style: a.\nLighting: morning.\nAudio: diegetic.";
    const out = spliceOverride(prefix, "Lighting: hard noon sun.");
    expect(out).toBe("Style: a.\nLighting: hard noon sun.\nAudio: diegetic.");
  });

  it("compiles a scene: prefix + legend + body, flags unlocked elements", async () => {
    const proj = await import("../src/projects.js");
    const el = await import("../src/elements.js");
    const { compileScene } = await import("../src/director/index.js");
    const p = proj.createProject({ name: "P", createdAt: "2026-07-23T00:00:00Z" });
    el.upsertElement(p.id, { handle: "hero", type: "character" });
    el.addVersion(p.id, "hero", Buffer.from([1]), { ext: "png" });
    el.lockElement(p.id, "hero");
    el.upsertElement(p.id, { handle: "headphones", type: "product" }); // unlocked
    el.addVersion(p.id, "headphones", Buffer.from([2]), { ext: "png" });

    const sb = {
      project_title: "T",
      style_prefix: "Style: a.",
      scenes: [{ code: "1a", title: "t", logline: "", duration_target_s: 15, element_handles: ["hero", "headphones"], audio_handle: null, style_override: null, body: "CUT 1 — he moves." }],
    };
    const r = compileScene(p.id, sb as any, sb.scenes[0] as any);
    expect(r.prompt).toContain("Style: a.");
    expect(r.prompt).toContain("References: Image 1 = @hero (character sheet)");
    expect(r.prompt).toContain("CUT 1 — he moves.");
    expect(r.refs).toHaveLength(2);
    expect(r.missing).toEqual(["headphones"]); // unlocked flagged
  });

  it("compiles a full shotlist via the (mocked) Director and saves it", async () => {
    const proj = await import("../src/projects.js");
    const el = await import("../src/elements.js");
    const { compileShotlist, getShotlist, exportShotlistHtml } = await import("../src/director/index.js");
    const p = proj.createProject({ name: "Tap In", createdAt: "2026-07-23T00:00:00Z" });
    el.upsertElement(p.id, { handle: "hero", type: "character", description: "lean man" });
    const sb = await compileShotlist(p.id, { script: "hero tap-ins", targetRuntimeS: 15 });
    expect(sb.scenes).toHaveLength(1);
    expect(sb.style_prefix).toContain("Lighting");
    expect(getShotlist(p.id)?.project_title).toBe("Tap In");
    const html = exportShotlistHtml(p.id, sb);
    expect(html).toContain("Global Style Prefix");
    expect(html).toContain("Kitchen tap-in");
  });
});
