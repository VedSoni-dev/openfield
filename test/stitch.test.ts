import { describe, it, expect } from "vitest";
import { stitch, ffmpegAvailable } from "../src/stitch.js";

describe("stitch", () => {
  it("rejects an empty clip list", async () => {
    await expect(stitch([], "out.mp4")).rejects.toThrow(/no clips/);
  });

  it("ffmpegAvailable resolves to a boolean", async () => {
    expect(typeof (await ffmpegAvailable())).toBe("boolean");
  });
});
