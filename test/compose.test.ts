import { describe, it, expect } from "vitest";
import { compose } from "../src/compose.js";

describe("compose", () => {
  it("returns the bare subject with no presets", () => {
    const c = compose({ subject: "a red car" });
    expect(c.prompt).toBe("a red car");
    expect(c.used).toHaveLength(0);
  });

  it("stacks preset fragments in order after the subject", () => {
    const c = compose({ subject: "a red car", presets: ["dolly-in", "orbit"] });
    expect(c.prompt.startsWith("a red car.")).toBe(true);
    expect(c.prompt).toContain("dollies in");
    expect(c.prompt).toContain("orbits");
    expect(c.used.map((p) => p.id)).toEqual(["dolly-in", "orbit"]);
  });

  it("resolves the {subject} token", () => {
    const c = compose({ subject: "a wolf", presets: ["disintegrate"] });
    expect(c.prompt).not.toContain("{subject}");
  });

  it("merges params, later presets winning", () => {
    const c = compose({ subject: "x", presets: ["dolly-in", "handheld"] });
    expect(c.params.camera_motion).toBe("handheld");
  });

  it("throws on an unknown preset", () => {
    expect(() => compose({ subject: "x", presets: ["nope"] })).toThrow(/unknown preset/);
  });
});
