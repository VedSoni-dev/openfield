import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "openfield-loc-"));
  process.env.OPENFIELD_HOME = dir;
});
afterEach(() => {
  delete process.env.OPENFIELD_HOME;
  rmSync(dir, { recursive: true, force: true });
});

describe("locations", () => {
  it("upserts, lists, gets, removes", async () => {
    const loc = await import("../src/locations.js");
    expect(loc.listLocations()).toHaveLength(0);
    loc.upsertLocation({ id: "mars", name: "The Red Dunes", description: "endless rust desert" });
    expect(loc.getLocation("mars")?.name).toBe("The Red Dunes");
    expect(loc.listLocations()).toHaveLength(1);
    expect(loc.removeLocation("mars")).toBe(true);
    expect(loc.getLocation("mars")).toBeUndefined();
  });

  it("builds a setting phrase", async () => {
    const loc = await import("../src/locations.js");
    const p = loc.locationPhrase({ id: "x", name: "Neo Tokyo", description: "rain-slick neon streets" });
    expect(p).toContain("set in Neo Tokyo");
    expect(p).toContain("rain-slick neon streets");
  });

  it("threads through compose as setting", async () => {
    const { compose } = await import("../src/compose.js");
    const c = compose({ subject: "a chase", setting: "set in Neo Tokyo — neon streets", presets: [] });
    expect(c.prompt).toContain("a chase");
    expect(c.prompt).toContain("Neo Tokyo");
  });
});
