// Multi-shot export. Downloads generated clips and concatenates them into one
// mp4 with ffmpeg. Best-effort: if ffmpeg isn't installed, we say so clearly.
// Cross-platform — spawns the system ffmpeg, normalizes each clip, then concats.

import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(cmd: string, cliArgs: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, cliArgs, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", () => resolve({ code: -1, stderr: "spawn failed" }));
    p.on("close", (code) => resolve({ code: code ?? -1, stderr }));
  });
}

export async function ffmpegAvailable(): Promise<boolean> {
  const { code } = await run("ffmpeg", ["-version"]);
  return code === 0;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

export interface StitchOptions {
  width?: number;
  height?: number;
  fps?: number;
  onProgress?: (msg: string) => void;
}

/**
 * Concatenate clip urls (or local paths) into outPath. Each clip is first
 * normalized to a common resolution/fps so concat never mismatches.
 */
export async function stitch(
  clips: string[],
  outPath: string,
  opts: StitchOptions = {},
): Promise<string> {
  if (!clips.length) throw new Error("no clips to stitch");
  if (!(await ffmpegAvailable())) {
    throw new Error("ffmpeg not found. Install it (https://ffmpeg.org) to export stitched video.");
  }
  const log = opts.onProgress ?? (() => {});
  const { width = 1280, height = 720, fps = 24 } = opts;
  const dir = await mkdtemp(join(tmpdir(), "openfield-stitch-"));
  try {
    const normalized: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const src = clips[i];
      let input = src;
      if (/^https?:\/\//.test(src)) {
        input = join(dir, `src${i}.mp4`);
        log(`downloading clip ${i + 1}/${clips.length}`);
        await download(src, input);
      }
      const norm = join(dir, `norm${i}.mp4`);
      log(`normalizing clip ${i + 1}/${clips.length}`);
      const { code, stderr } = await run("ffmpeg", [
        "-y", "-i", input,
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
        "-r", String(fps), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", norm,
      ]);
      if (code !== 0) throw new Error(`normalize failed for clip ${i + 1}: ${stderr.slice(-300)}`);
      normalized.push(norm);
    }

    const listFile = join(dir, "list.txt");
    await writeFile(listFile, normalized.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
    log("concatenating");
    const { code, stderr } = await run("ffmpeg", [
      "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath,
    ]);
    if (code !== 0) throw new Error(`concat failed: ${stderr.slice(-300)}`);
    log(`wrote ${outPath}`);
    return outPath;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
