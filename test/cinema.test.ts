import { describe, it, expect } from "vitest";
import { cinemaFragment } from "../src/cinema.js";
import { compose } from "../src/compose.js";

describe("cinema", () => {
  it("empty selection yields nothing", () => {
    const f = cinemaFragment({});
    expect(f.phrase).toBe("");
    expect(Object.keys(f.params)).toHaveLength(0);
  });

  it("builds phrase + merged params from a selection", () => {
    const f = cinemaFragment({ body: "arri-alexa", focal: "f85", aperture: "f14a", shot: "cu" });
    expect(f.phrase).toContain("ARRI Alexa");
    expect(f.phrase).toContain("85mm");
    expect(f.params.focal_length_mm).toBe(85);
    expect(f.params.aperture).toBe("f/1.4");
  });

  it("threads through compose after presets", () => {
    const c = compose({ subject: "a diver", presets: ["orbit"], cinema: { body: "red-komodo", shot: "wide" } });
    expect(c.prompt).toContain("a diver");
    expect(c.prompt).toContain("orbits");
    expect(c.prompt).toContain("RED Komodo");
    expect(c.prompt.indexOf("RED Komodo")).toBeGreaterThan(c.prompt.indexOf("orbits"));
  });

  it("ignores unknown ids", () => {
    const f = cinemaFragment({ body: "nope" });
    expect(f.phrase).toBe("");
  });
});
