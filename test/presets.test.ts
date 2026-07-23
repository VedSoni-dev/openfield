import { describe, it, expect } from "vitest";
import { PRESETS, findPreset, searchPresets, byCategory } from "../src/presets/index.js";

describe("presets", () => {
  it("has a healthy library", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(40);
  });

  it("every preset has unique id and non-empty template", () => {
    const ids = new Set<string>();
    for (const p of PRESETS) {
      expect(p.template.length).toBeGreaterThan(0);
      expect(ids.has(p.id), `dup id ${p.id}`).toBe(false);
      ids.add(p.id);
    }
  });

  it("finds by id", () => {
    expect(findPreset("orbit")?.category).toBe("camera");
  });

  it("searches by tag", () => {
    const r = searchPresets("bokeh");
    expect(r.length).toBeGreaterThan(0);
  });

  it("filters by category", () => {
    expect(byCategory("lighting").every((p) => p.category === "lighting")).toBe(true);
  });
});
