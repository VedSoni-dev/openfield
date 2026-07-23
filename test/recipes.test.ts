import { describe, it, expect } from "vitest";
import { RECIPES, findRecipe } from "../src/recipes.js";
import { findPreset } from "../src/presets/index.js";
import { findModel } from "../src/providers/catalog.js";
import { CINEMA_GROUPS } from "../src/cinema.js";

describe("recipes", () => {
  it("every recipe references real presets, model, and cinema ids", () => {
    for (const r of RECIPES) {
      expect(findModel(r.model), `recipe ${r.id} model ${r.model}`).toBeTruthy();
      for (const p of r.presets) expect(findPreset(p), `recipe ${r.id} preset ${p}`).toBeTruthy();
      for (const [group, id] of Object.entries(r.cinema ?? {})) {
        const ok = (CINEMA_GROUPS as any)[group].some((o: any) => o.id === id);
        expect(ok, `recipe ${r.id} cinema ${group}=${id}`).toBe(true);
      }
    }
  });

  it("recipe ids are unique and findable", () => {
    const ids = new Set(RECIPES.map((r) => r.id));
    expect(ids.size).toBe(RECIPES.length);
    expect(findRecipe(RECIPES[0].id)).toBeTruthy();
  });
});
