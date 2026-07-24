// Assembly & export (BACKLOT DOC 10). The finished film is a stringout of the
// selected takes. We export three ways: a stitched MP4 (ffmpeg), a Final Cut
// Pro FCPXML with per-clip markers, and a manifest CSV.

import { selectedTakes, type Take } from "./takes.js";
import { getShotlist } from "./director/index.js";

const FPS = 24;

function sceneDuration(projectId: string, sceneCode: string): number {
  const sb = getShotlist(projectId);
  return sb?.scenes.find((s) => s.code === sceneCode)?.duration_target_s ?? 15;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fileUrl(u: string): string {
  return /^https?:\/\//.test(u) ? u : "file://" + u.replace(/\\/g, "/");
}

/** Final Cut Pro FCPXML 1.10. Clips in selection order, each carrying a marker
 *  with scene/take/model/seed so the edit is traceable. */
export function exportFCPXML(projectId: string, title = "openfield cut"): string {
  const takes = selectedTakes(projectId);
  const format = `<format id="r0" name="FFVideoFormat1080p24" frameDuration="1/${FPS}s" width="1920" height="1080"/>`;

  const assets: string[] = [];
  const clips: string[] = [];
  let offsetFrames = 0;
  takes.forEach((t, i) => {
    const durFrames = Math.max(1, Math.round(sceneDuration(projectId, t.sceneCode) * FPS));
    const src = t.output?.[0] ?? "";
    const assetId = `a${i + 1}`;
    assets.push(
      `<asset id="${assetId}" name="${esc(t.sceneCode)}_take${t.takeNo}" start="0s" duration="${durFrames}/${FPS}s" hasVideo="1" format="r0" src="${esc(fileUrl(src))}"/>`,
    );
    const marker = `scene ${t.sceneCode} · take ${t.takeNo} · ${t.model}${t.seed != null ? " · seed " + t.seed : ""}`;
    clips.push(
      `        <asset-clip ref="${assetId}" name="${esc(t.sceneCode)}" offset="${offsetFrames}/${FPS}s" duration="${durFrames}/${FPS}s" start="0s">
          <marker start="${offsetFrames}/${FPS}s" duration="1/${FPS}s" value="${esc(marker)}"/>
        </asset-clip>`,
    );
    offsetFrames += durFrames;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    ${format}
    ${assets.join("\n    ")}
  </resources>
  <library>
    <event name="openfield">
      <project name="${esc(title)}">
        <sequence format="r0" duration="${offsetFrames}/${FPS}s" tcStart="0s" tcFormat="NDF">
          <spine>
${clips.join("\n")}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

/** manifest.csv — scene, take, file, seed, model, rating (DOC 10.4). */
export function exportManifestCsv(projectId: string): string {
  const rows = [["scene", "take", "file", "seed", "model", "rating"]];
  for (const t of selectedTakes(projectId)) {
    rows.push([t.sceneCode, String(t.takeNo), t.output?.[0] ?? "", String(t.seed ?? ""), t.model, String(t.rating ?? "")]);
  }
  return rows.map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")).join("\n");
}

/** Stitch the selected takes into one MP4 (needs ffmpeg). */
export async function assembleStringout(
  projectId: string,
  outPath: string,
  onProgress?: (m: string) => void,
): Promise<{ out: string; clips: number }> {
  const clips = selectedTakes(projectId)
    .map((t) => t.output?.[0])
    .filter(Boolean) as string[];
  if (!clips.length) throw new Error("no selected takes to assemble — select a take per scene first");
  const { stitch } = await import("./stitch.js");
  await stitch(clips, outPath, { onProgress });
  return { out: outPath, clips: clips.length };
}

export function assemblySummary(projectId: string): { scene: string; take: number; hasOutput: boolean }[] {
  return selectedTakes(projectId).map((t: Take) => ({ scene: t.sceneCode, take: t.takeNo, hasOutput: !!t.output?.length }));
}
