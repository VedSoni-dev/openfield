// Renders site/demo.gif — openfield's prompt-first Studio in the Film Lab look.
// Pure Node: @napi-rs/canvas draws each frame, gifenc encodes. No browser.
import { createCanvas } from "@napi-rs/canvas";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const W = 900, H = 566;
const C = {
  ink: "#0a0b0d", ink2: "#101215", panel: "#14171b", panel2: "#191c21",
  line: "#23262c", line2: "#2d3138", paper: "#ece6da", dim: "#8b877c",
  dim2: "#5b5850", amber: "#ff9a5a", amberSoft: "#ffbc8a", teal: "#46d6c9", ok: "#5fd08a",
};
const SANS = "Segoe UI, Arial, sans-serif";
const MONO = "Consolas, monospace";
const SERIF = "Georgia, serif";
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function pill(x, y, text, val, set) {
  ctx.font = `12px ${MONO}`;
  const label = `${text}: `;
  const w = 14 + ctx.measureText(label + val).width + 14;
  ctx.fillStyle = set ? "rgba(255,154,90,0.10)" : C.ink2;
  ctx.strokeStyle = set ? C.amber : C.line; rr(x, y, w, 30, 15); ctx.fill(); ctx.stroke();
  // teal accent dot
  ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(x + 13, y + 15, 2.5, 0, 7); ctx.fill();
  ctx.fillStyle = set ? C.paper : C.dim; ctx.fillText(label, x + 22, y + 20);
  const lw = ctx.measureText(label).width;
  ctx.fillStyle = set ? C.amber : C.dim; ctx.fillText(val, x + 22 + lw, y + 20);
  return w;
}
function brackets(x, y, w, h, len = 14, col = C.line2) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  for (const [px, py, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(px, py + sy * len); ctx.lineTo(px, py); ctx.lineTo(px + sx * len, py); ctx.stroke();
  }
}
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

const SUBJECT = "a lone astronaut walks across a red dune at dusk";

function frame(f) {
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "middle";
  // top bar
  ctx.fillStyle = C.ink2; ctx.fillRect(0, 0, W, 44);
  ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(0, 44.5); ctx.lineTo(W, 44.5); ctx.stroke();
  ctx.fillStyle = f % 20 < 12 ? C.amber : "rgba(255,154,90,0.3)"; ctx.beginPath(); ctx.arc(26, 22, 4, 0, 7); ctx.fill();
  ctx.font = `19px ${SERIF}`; ctx.fillStyle = C.paper; ctx.fillText("open", 40, 23);
  const ow = ctx.measureText("open").width;
  ctx.font = `italic 19px ${SERIF}`; ctx.fillStyle = C.amber; ctx.fillText("field", 40 + ow, 23);
  const fw = ctx.measureText("field").width;
  ctx.font = `10px ${MONO}`; ctx.fillStyle = C.dim2; ctx.fillText("STUDIO", 40 + ow + fw + 14, 24);
  ctx.font = `11px ${MONO}`; ctx.fillStyle = C.ok; ctx.textAlign = "right"; ctx.fillText("● fal", W - 24, 22); ctx.textAlign = "left";
  const tabs = ["Studio", "Recipes", "Presets", "Soul ID", "Director"]; let tx = W - 372;
  for (const t of tabs) { ctx.fillStyle = t === "Studio" ? C.amber : C.dim; ctx.fillText(t, tx, 22); tx += ctx.measureText(t).width + 18; }

  const M = 26;
  // hero preview
  const hy = 60, hh = 176;
  const hg = ctx.createRadialGradient(W * 0.35, hy + 20, 30, W * 0.5, hy + hh, W * 0.7);
  hg.addColorStop(0, "#1a1e24"); hg.addColorStop(1, "#0b0d10");
  ctx.fillStyle = hg; rr(M, hy, W - 2 * M, hh, 14); ctx.fill();
  ctx.strokeStyle = C.line; ctx.stroke();
  brackets(M + 10, hy + 10, W - 2 * M - 20, hh - 20, 14, C.line2);
  ctx.font = `10px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("openfield · cinema studio", M + 18, hy + 22);

  const gen = clamp01((f - 40) / 16);
  if (gen > 0) {
    const cxp = W / 2, cyp = hy + hh / 2 + 6;
    const wash = ctx.createRadialGradient(cxp - 50, cyp - 30, 10, cxp, cyp, 320);
    wash.addColorStop(0, `rgba(255,80,160,${0.26 * gen})`); wash.addColorStop(1, `rgba(70,214,201,${0.13 * gen})`);
    ctx.save(); rr(M + 2, hy + 2, W - 2 * M - 4, hh - 4, 12); ctx.clip(); ctx.fillStyle = wash; ctx.fillRect(0, hy, W, hh); ctx.restore();
    const ang = easeOut(gen) * Math.PI;
    const ox = cxp + Math.cos(ang) * 90, oy = cyp + Math.sin(ang) * 30;
    const grd = ctx.createRadialGradient(ox, oy, 2, ox, oy, 26);
    grd.addColorStop(0, C.amber); grd.addColorStop(1, "rgba(255,154,90,0)");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(ox, oy, 26, 0, 7); ctx.fill();
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(ox, oy, 8, 0, 7); ctx.fill();
    ctx.font = `10px ${MONO}`; ctx.fillStyle = gen >= 1 ? C.ok : C.amber; ctx.fillText(gen >= 1 ? "● latest render" : "● rolling", M + 18, hy + hh - 18);
  } else {
    ctx.font = `24px ${SERIF}`; ctx.fillStyle = C.dim; ctx.textAlign = "center";
    ctx.fillText("Direct anything you imagine", W / 2, hy + hh / 2 - 6);
    ctx.font = `12px ${MONO}`; ctx.fillStyle = C.dim2; ctx.fillText("describe a scene · pick your look · generate", W / 2, hy + hh / 2 + 20);
    ctx.textAlign = "left";
  }

  // generation bar
  const by = hy + hh + 14, bw = W - 2 * M, bh = 168;
  ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; rr(M, by, bw, bh, 16); ctx.fill(); ctx.stroke();
  // pills (light up over time)
  let px = M + 16; const py = by + 14;
  px += pill(px, py, "Genre", f >= 22 ? "Action" : "General", f >= 22) + 8;
  px += pill(px, py, "Style", f >= 26 ? "Neon Noir" : "Auto", f >= 26) + 8;
  px += pill(px, py, "Camera", f >= 30 ? "Custom" : "Auto", f >= 30) + 8;
  pill(px, py, "Character", "None", false);
  // prompt
  const typed = SUBJECT.slice(0, Math.max(0, Math.min(SUBJECT.length, Math.round((f - 2) / 16 * SUBJECT.length))));
  ctx.font = `16px ${SANS}`; ctx.fillStyle = C.paper; ctx.fillText(typed, M + 18, by + 68);
  if (f < 20 && f % 8 < 4) { const cw = ctx.measureText(typed).width; ctx.fillStyle = C.amber; ctx.fillRect(M + 18 + cw + 1, by + 60, 1.5, 18); }
  if (!typed) { ctx.fillStyle = C.dim2; ctx.fillText("Describe your scene — use @ to add a character", M + 18, by + 68); }
  // generate button
  const pressing = f >= 38 && f < 42;
  const gbw = 128, gbx = M + bw - gbw - 16, gby = by + 52;
  ctx.fillStyle = pressing ? C.amberSoft : C.amber; rr(gbx, gby, gbw, 40, 10); ctx.fill();
  ctx.fillStyle = "#1a0f06"; ctx.beginPath(); ctx.moveTo(gbx + 20, gby + 14); ctx.lineTo(gbx + 20, gby + 26); ctx.lineTo(gbx + 30, gby + 20); ctx.closePath(); ctx.fill();
  ctx.font = `600 14px ${MONO}`; ctx.fillText("Generate", gbx + 38, gby + 21);
  // control row
  const cy2 = by + 118; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(M + 14, cy2 - 12); ctx.lineTo(M + bw - 14, cy2 - 12); ctx.stroke();
  ctx.font = `12px ${MONO}`;
  const ctrl = (x, label, on) => {
    const w = ctx.measureText(label).width + 22;
    ctx.fillStyle = C.ink2; ctx.strokeStyle = on ? C.teal : C.line; rr(x, cy2, w, 28, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = on ? C.teal : C.dim; ctx.fillText(label, x + 11, cy2 + 15); return w + 8;
  };
  let cxx = M + 16;
  // image/video seg
  ctx.fillStyle = C.ink2; ctx.strokeStyle = C.line; rr(cxx, cy2, 116, 28, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.dim; ctx.fillText("Image", cxx + 14, cy2 + 15);
  ctx.fillStyle = C.panel2; rr(cxx + 58, cy2, 58, 28, 8); ctx.fill(); ctx.fillStyle = C.amber; ctx.fillText("Video", cxx + 70, cy2 + 15);
  cxx += 124;
  cxx += ctrl(cxx, "Seedance 2.0 ▾", false);
  cxx += ctrl(cxx, "16:9 ▾", false);
  cxx += ctrl(cxx, "1080p ▾", false);
  cxx += ctrl(cxx, "8s ▾", false);
  cxx += ctrl(cxx, "♪ Audio", f >= 34);

  // gallery card (appears after generate)
  if (f >= 44) {
    const gy = by + bh + 14;
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("THIS SESSION · 1 GENERATION", M, gy);
    const cw = (bw - 12) / 2;
    ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; rr(M, gy + 12, cw, 66, 10); ctx.fill(); ctx.stroke();
    const st = gen >= 1 ? "succeeded" : "queued"; const sc = gen >= 1 ? C.ok : C.dim;
    ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(M + 20, gy + 30, 4, 0, 7); ctx.fill();
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.paper; ctx.fillText(st, M + 30, gy + 30);
    ctx.textAlign = "right"; ctx.fillStyle = C.dim; ctx.fillText("seedance-2.0", M + cw - 14, gy + 30); ctx.textAlign = "left";
    ctx.font = `12px ${SANS}`; ctx.fillStyle = C.paper;
    ctx.fillText(SUBJECT.slice(0, 46) + "…", M + 16, gy + 54);
    if (gen >= 1) { ctx.font = `11px ${MONO}`; ctx.fillStyle = C.teal; ctx.fillText("▶ open output", M + 16, gy + 68); }
  }
}

const FRAMES = 60;
const gif = GIFEncoder();
for (let f = 0; f < FRAMES; f++) {
  frame(f);
  const { data } = ctx.getImageData(0, 0, W, H);
  const palette = quantize(data, 256);
  const index = applyPalette(data, palette);
  gif.writeFrame(index, W, H, { palette, delay: f >= FRAMES - 6 ? 900 : f < 20 ? 55 : 80 });
}
gif.finish();
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "site", "demo.gif");
writeFileSync(out, gif.bytes());
console.log("wrote", out, (gif.bytes().length / 1024).toFixed(0) + "KB");
if (process.env.DUMP) { frame(Number(process.env.DUMP)); writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "site", "_frame.png"), canvas.toBuffer("image/png")); }
