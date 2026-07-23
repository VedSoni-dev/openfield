import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate the store to a temp dir per test run.
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "openfield-soul-"));
  process.env.OPENFIELD_HOME = dir;
});
afterEach(() => {
  delete process.env.OPENFIELD_HOME;
  rmSync(dir, { recursive: true, force: true });
});

describe("soul", () => {
  it("upserts, lists, gets, removes a character", async () => {
    const soul = await import("../src/soul.js");
    expect(soul.listCharacters()).toHaveLength(0);
    soul.upsertCharacter({ id: "nova", name: "Nova", refs: ["http://x/1.png"], traits: "red bob" });
    expect(soul.getCharacter("nova")?.name).toBe("Nova");
    expect(soul.listCharacters()).toHaveLength(1);
    // update merges
    soul.upsertCharacter({ id: "nova", name: "Nova Prime", refs: ["http://x/1.png"] });
    expect(soul.getCharacter("nova")?.name).toBe("Nova Prime");
    expect(soul.removeCharacter("nova")).toBe(true);
    expect(soul.getCharacter("nova")).toBeUndefined();
  });

  it("builds an identity phrase with traits", async () => {
    const soul = await import("../src/soul.js");
    const p = soul.identityPhrase({ id: "x", name: "Rex", refs: [], traits: "scar over left eye" });
    expect(p).toContain("Rex");
    expect(p).toContain("scar over left eye");
    expect(p).toContain("consistent");
  });
});
