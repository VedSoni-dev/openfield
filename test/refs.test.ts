import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { referenceLegend, orderAndCap, resolveRefUrl, type Ref } from "../src/refs.js";
import { compose } from "../src/compose.js";

describe("refs", () => {
  it("builds a numbered reference legend", () => {
    const legend = referenceLegend([
      { handle: "hero", role: "character", src: "u" },
      { handle: "kitchen", role: "location", src: "u" },
    ]);
    expect(legend).toBe("References: Image 1 = @hero (character sheet). Image 2 = @kitchen (location).");
  });

  it("orders by role priority and caps", () => {
    const refs: Ref[] = [
      { handle: "kitchen", role: "location", src: "l" },
      { handle: "hero", role: "character", src: "c" },
      { handle: "map", role: "schematic", src: "s" },
    ];
    const { kept } = orderAndCap(refs, 10);
    expect(kept.map((r) => r.role)).toEqual(["character", "location", "schematic"]);
  });

  it("drops lowest-priority refs past the cap", () => {
    const refs: Ref[] = [
      { handle: "a", role: "character", src: "1" },
      { handle: "b", role: "prop", src: "2" },
      { handle: "c", role: "location", src: "3" },
    ];
    const { kept, dropped } = orderAndCap(refs, 2);
    // priority: character > prop > location, so location is dropped at cap 2
    expect(kept.map((r) => r.role)).toEqual(["character", "prop"]);
    expect(dropped.map((r) => r.role)).toEqual(["location"]);
  });

  it("passes urls and data uris through, base64-encodes local files", () => {
    expect(resolveRefUrl("https://x/a.png")).toBe("https://x/a.png");
    expect(resolveRefUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    const dir = mkdtempSync(join(tmpdir(), "openfield-refs-"));
    const f = join(dir, "ref.png");
    writeFileSync(f, Buffer.from([1, 2, 3]));
    const out = resolveRefUrl(f);
    expect(out.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("compose prepends the legend on its own line", () => {
    const c = compose({ subject: "a chase", legend: "References: Image 1 = @hero (character sheet).", presets: [] });
    expect(c.prompt.startsWith("References: Image 1 = @hero (character sheet).\n")).toBe(true);
    expect(c.prompt).toContain("a chase");
  });
});
