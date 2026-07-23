// Execute a storyboard: generate every shot through the router, poll to done,
// collect the output urls. Optional best-effort stitch if ffmpeg is present.

import { generate, waitFor } from "../router.js";
import type { Storyboard } from "./plan.js";

export interface ShotResult {
  index: number;
  subject: string;
  presets: string[];
  status: "succeeded" | "failed";
  output?: string[];
  error?: string;
}

export interface RunResult {
  title: string;
  model: string;
  provider?: string;
  shots: ShotResult[];
}

export async function runStoryboard(
  sb: Storyboard,
  opts: { character?: string; wait?: boolean; onProgress?: (msg: string) => void } = {},
): Promise<RunResult> {
  const log = opts.onProgress ?? (() => {});
  const shots: ShotResult[] = [];
  let provider: string | undefined;

  for (let i = 0; i < sb.shots.length; i++) {
    const s = sb.shots[i];
    log(`shot ${i + 1}/${sb.shots.length}: ${s.subject}`);
    try {
      const { job, provider: prov } = await generate({
        subject: s.subject,
        presets: s.presets,
        model: sb.model,
        character: opts.character,
        durationSec: s.durationSec,
      });
      provider = prov;
      if (job.status === "failed") {
        shots.push({ index: i, subject: s.subject, presets: s.presets, status: "failed", error: job.error });
        continue;
      }
      if (opts.wait !== false) {
        const done = await waitFor(prov, job.id);
        shots.push({
          index: i,
          subject: s.subject,
          presets: s.presets,
          status: done.status === "succeeded" ? "succeeded" : "failed",
          output: done.output,
          error: done.error,
        });
        log(`  ${done.status}${done.output?.[0] ? " " + done.output[0] : ""}`);
      } else {
        shots.push({ index: i, subject: s.subject, presets: s.presets, status: "succeeded", output: [job.id] });
        log(`  queued job ${job.id}`);
      }
    } catch (e: any) {
      shots.push({ index: i, subject: s.subject, presets: s.presets, status: "failed", error: e.message });
      log(`  failed: ${e.message}`);
    }
  }

  return { title: sb.title, model: sb.model, provider, shots };
}
