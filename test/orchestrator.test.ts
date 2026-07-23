import { describe, it, expect } from "vitest";
import { sanitize, StoryboardSchema } from "../src/orchestrator/plan.js";

describe("orchestrator.sanitize", () => {
  it("drops unknown presets and unknown models", () => {
    const raw = StoryboardSchema.parse({
      title: "Test",
      model: "not-a-real-model",
      shots: [
        { subject: "a cat", presets: ["orbit", "made-up-preset"] },
        { subject: "a dog", presets: ["neon-noir"] },
      ],
    });
    const clean = sanitize(raw);
    // unknown model falls back to a real catalog id
    expect(clean.model).not.toBe("not-a-real-model");
    // unknown preset removed, known kept
    expect(clean.shots[0].presets).toEqual(["orbit"]);
    expect(clean.shots[1].presets).toEqual(["neon-noir"]);
  });

  it("rejects a storyboard with zero shots", () => {
    expect(() => StoryboardSchema.parse({ title: "x", model: "wan-2.2", shots: [] })).toThrow();
  });

  it("defaults presets to an empty array", () => {
    const sb = StoryboardSchema.parse({ title: "x", model: "wan-2.2", shots: [{ subject: "a bird" }] });
    expect(sb.shots[0].presets).toEqual([]);
  });
});
