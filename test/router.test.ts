import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { pickRoute } from "../src/router.js";
import { findModel } from "../src/providers/catalog.js";

const KEYS = ["FAL_KEY", "REPLICATE_API_TOKEN", "OPENFIELD_CUSTOM_URL", "OPENFIELD_CUSTOM_KEY"];

describe("router.pickRoute", () => {
  let saved: Record<string, string | undefined>;
  beforeEach(() => {
    saved = {};
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("returns null when no key is configured", () => {
    expect(pickRoute("seedance-2.0")).toBeNull();
  });

  it("picks fal when FAL_KEY is present", () => {
    process.env.FAL_KEY = "x";
    expect(pickRoute("seedance-2.0")?.provider).toBe("fal");
  });

  it("falls through to replicate when only that key is present", () => {
    process.env.REPLICATE_API_TOKEN = "x";
    expect(pickRoute("kling-2.5")?.provider).toBe("replicate");
  });

  it("throws on unknown model", () => {
    expect(() => pickRoute("does-not-exist")).toThrow(/unknown model/);
  });

  it("every catalog route resolves to a known provider slug", () => {
    for (const m of ["seedance-2.0", "wan-2.2", "ltx"]) {
      const entry = findModel(m)!;
      for (const r of entry.routes) {
        expect(["fal", "replicate", "custom"]).toContain(r.provider);
      }
    }
  });
});
