// Renders site/demo.gif — a synthetic openfield Studio demo in the Film Lab look.
// Pure Node: @napi-rs/canvas draws each frame, gifenc encodes. No browser.
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const W = 860, H = 484;
const C = {
  ink: "#0a0b0d", ink2: "#101215", panel: "#14171b", panel2: "#191c21",
  line: "#23262c", line2: "#2d3138", paper: "#ece6da", dim: "#8b877c",
  dim2: "#5b5850", amber: "#ff9a5a", amberSoft: "#ffbc8a", teal: "#46d6c9", ok: "#5fd08a",
};
// Windows ships these; fall back to generic families if a name is missing.
const SANS = "Segoe UI, Arial, sans-serif";
const MONO = "Consolas, monospace";
const SERIF = "Georgia, serif";

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function brackets(x, y, w, h, len = 14, col = C.line2) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  const p = [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]];
  for (const [px, py, sx, sy] of p) {
    ctx.beginPath();
    ctx.moveTo(px, py + sy * len); ctx.lineTo(px, py); ctx.lineTo(px + sx * len, py);
    ctx.stroke();
  }
}
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// --- timeline (frame indexed) ---
const SUBJECT = "a lone astronaut on a red dune at dusk";
const CHIPS = [
  { label: "Dolly In", on: 0 }, { label: "Orbit", on: 20 }, { label: "Crane", on: 0 },
  { label: "Neon Noir", on: 24 }, { label: "85mm", on: 27 }, { label: "35mm Film", on: 0 },
];
const PROMPT = "…the camera orbits the subject, 180° arc · neon magenta & cyan glow · 85mm shallow depth";

function frame(f) {
  // bg
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  // subtle vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, "rgba(255,154,90,0.04)"); g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // top bar
  ctx.fillStyle = C.ink2; ctx.fillRect(0, 0, W, 46);
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 46.5); ctx.lineTo(W, 46.5); ctx.stroke();
  // rec dot (blink)
  ctx.fillStyle = f % 20 < 12 ? C.amber : "rgba(255,154,90,0.3)";
  ctx.beginPath(); ctx.arc(26, 23, 4, 0, 7); ctx.fill();
  ctx.textBaseline = "middle";
  ctx.font = `20px ${SERIF}`; ctx.fillStyle = C.paper; ctx.fillText("open", 40, 24);
  const ow = ctx.measureText("open").width;
  ctx.fillStyle = C.amber; ctx.font = `italic 20px ${SERIF}`; ctx.fillText("field", 40 + ow, 24);
  ctx.font = `italic 20px ${SERIF}`; const fw = ctx.measureText("field").width;
  ctx.font = `10px ${MONO}`; ctx.fillStyle = C.dim2; ctx.fillText("STUDIO", 40 + ow + fw + 16, 25);
  // status pill
  ctx.font = `11px ${MONO}`; ctx.fillStyle = C.ok; ctx.textAlign = "right";
  ctx.fillText("● fal", W - 24, 24); ctx.textAlign = "left";
  // tabs
  const tabs = ["Studio", "Recipes", "Presets", "Soul ID", "Director"];
  let tx = W - 360;
  ctx.font = `11px ${MONO}`;
  for (const t of tabs) { ctx.fillStyle = t === "Studio" ? C.amber : C.dim; ctx.fillText(t, tx, 24); tx += ctx.measureText(t).width + 18; }

  // left panel
  const LX = 28, LY = 66, LW = 468;
  ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; rr(LX, LY, LW, H - 92, 12); ctx.fill(); ctx.stroke();
  // eyebrow + title
  ctx.font = `10px ${MONO}`; ctx.fillStyle = C.teal; ctx.fillText("C O M P O S E   ·   G E N E R A T E", LX + 22, LY + 26);
  ctx.font = `24px ${SERIF}`; ctx.fillStyle = C.paper; ctx.fillText("Studio", LX + 22, LY + 52);

  // subject label + field
  ctx.font = `10px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("SUBJECT", LX + 22, LY + 80);
  ctx.fillStyle = C.ink2; ctx.strokeStyle = C.line; rr(LX + 22, LY + 90, LW - 44, 40, 8); ctx.fill(); ctx.stroke();
  const typed = SUBJECT.slice(0, Math.max(0, Math.min(SUBJECT.length, Math.round((f - 2) / 14 * SUBJECT.length))));
  ctx.font = `15px ${SANS}`; ctx.fillStyle = C.paper; ctx.fillText(typed, LX + 34, LY + 111);
  if (f < 18 && f % 8 < 4) { const cw = ctx.measureText(typed).width; ctx.fillStyle = C.amber; ctx.fillRect(LX + 34 + cw + 1, LY + 101, 1.5, 20); }

  // presets label + chips
  ctx.font = `10px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("PRESETS", LX + 22, LY + 156);
  let cx = LX + 22, cy = LY + 168;
  ctx.font = `12px ${MONO}`;
  for (const chip of CHIPS) {
    const w = ctx.measureText(chip.label).width + 22;
    if (cx + w > LX + LW - 22) { cx = LX + 22; cy += 34; }
    const active = chip.on && f >= chip.on;
    ctx.fillStyle = active ? "rgba(255,154,90,0.12)" : C.ink2;
    ctx.strokeStyle = active ? C.amber : C.line; rr(cx, cy, w, 26, 13); ctx.fill(); ctx.stroke();
    ctx.fillStyle = active ? C.amber : C.dim; ctx.fillText(chip.label, cx + 11, cy + 14);
    cx += w + 8;
  }

  // generate button
  const genY = LY + H - 92 - 58;
  const pressing = f >= 30 && f < 34;
  ctx.fillStyle = pressing ? C.amberSoft : C.amber; rr(LX + 22, genY, 150, 40, 8); ctx.fill();
  // play triangle (drawn — the ▶ glyph isn't in the mono face)
  ctx.fillStyle = "#1a0f06";
  ctx.beginPath(); ctx.moveTo(LX + 40, genY + 14); ctx.lineTo(LX + 40, genY + 26); ctx.lineTo(LX + 50, genY + 20); ctx.closePath(); ctx.fill();
  ctx.font = `600 14px ${MONO}`; ctx.fillText("Generate", LX + 58, genY + 21);
  // queued pill after press
  if (f >= 34) {
    ctx.fillStyle = "rgba(95,208,138,0.1)"; ctx.strokeStyle = C.ok; rr(LX + 188, genY + 8, 150, 24, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ok; ctx.font = `11px ${MONO}`; ctx.fillText("queued · seedance", LX + 200, genY + 20);
  }

  // right: preview frame
  const RX = 516, RY = 66, RW = 316, RH = H - 92;
  ctx.fillStyle = C.ink2; ctx.strokeStyle = C.line; rr(RX, RY, RW, RH, 12); ctx.fill(); ctx.stroke();
  // shot area
  const sx = RX + 16, sy = RY + 16, sw = RW - 32, sh = 190;
  const rg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
  rg.addColorStop(0, "#1a1e24"); rg.addColorStop(1, "#0c0e11");
  ctx.fillStyle = rg; rr(sx, sy, sw, sh, 8); ctx.fill();
  // grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(sx + sw * i / 3, sy); ctx.lineTo(sx + sw * i / 3, sy + sh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy + sh * i / 3); ctx.lineTo(sx + sw, sy + sh * i / 3); ctx.stroke();
  }
  brackets(sx + 6, sy + 6, sw - 12, sh - 12, 12, C.dim2);
  // generating grade wash + orbiting subject
  const gen = clamp01((f - 34) / 16);
  if (gen > 0) {
    const cxp = sx + sw / 2, cyp = sy + sh / 2;
    // neon wash fading in
    const wash = ctx.createRadialGradient(cxp - 40, cyp - 30, 10, cxp, cyp, sw / 1.5);
    wash.addColorStop(0, `rgba(255,80,160,${0.28 * gen})`); wash.addColorStop(1, `rgba(70,214,201,${0.14 * gen})`);
    ctx.fillStyle = wash; rr(sx, sy, sw, sh, 8); ctx.fill();
    // orbit dot
    const ang = easeOut(gen) * Math.PI;
    const ox = cxp + Math.cos(ang) * 60, oy = cyp + Math.sin(ang) * 26;
    const grd = ctx.createRadialGradient(ox, oy, 2, ox, oy, 22);
    grd.addColorStop(0, C.amber); grd.addColorStop(1, "rgba(255,154,90,0)");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(ox, oy, 22, 0, 7); ctx.fill();
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(ox, oy, 7, 0, 7); ctx.fill();
  }
  const stTxt = gen >= 1 ? "rendered" : gen > 0 ? "rolling" : "ready";
  const stCol = gen >= 1 ? C.ok : gen > 0 ? C.amber : C.dim;
  ctx.fillStyle = stCol; ctx.beginPath(); ctx.arc(sx + 16, sy + sh - 18, 4, 0, 7); ctx.fill();
  ctx.font = `11px ${MONO}`; ctx.fillStyle = C.paper; ctx.fillText(stTxt, sx + 26, sy + sh - 14);

  // cinema studio chips under preview
  ctx.font = `10px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("CINEMA STUDIO", RX + 16, sy + sh + 28);
  const cine = ["ARRI Alexa", "85mm", "f/1.4", "Low"];
  let ccx = RX + 16, ccy = sy + sh + 38;
  ctx.font = `11px ${MONO}`;
  for (const t of cine) {
    const w = ctx.measureText(t).width + 18;
    if (ccx + w > RX + RW - 16) { ccx = RX + 16; ccy += 30; }
    ctx.fillStyle = C.panel2; ctx.strokeStyle = C.line2; rr(ccx, ccy, w, 24, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.teal; ctx.fillText(t, ccx + 9, ccy + 13); ccx += w + 7;
  }

  // prompt strip (composes after chips)
  const pShow = clamp01((f - 24) / 8);
  if (pShow > 0) {
    ctx.globalAlpha = pShow;
    ctx.fillStyle = C.ink2; ctx.strokeStyle = C.line; rr(RX + 16, RY + RH - 78, RW - 32, 62, 8); ctx.fill(); ctx.stroke();
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("COMPOSED PROMPT", RX + 26, RY + RH - 60);
    ctx.fillStyle = C.paper; ctx.font = `11px ${MONO}`;
    wrap(PROMPT, RX + 26, RY + RH - 44, RW - 52, 14);
    ctx.globalAlpha = 1;
  }
}
function wrap(text, x, y, maxW, lh) {
  const words = text.split(" "); let line = "", yy = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w + " "; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}

// --- encode ---
const FRAMES = 62;
const gif = GIFEncoder();
for (let f = 0; f < FRAMES; f++) {
  frame(f);
  const { data } = ctx.getImageData(0, 0, W, H);
  const palette = quantize(data, 256);
  const index = applyPalette(data, palette);
  // hold the final rendered frame a beat, snappy elsewhere
  const delay = f >= FRAMES - 6 ? 900 : f < 18 ? 55 : 80;
  gif.writeFrame(index, W, H, { palette, delay });
}
gif.finish();
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "site", "demo.gif");
writeFileSync(out, gif.bytes());
console.log("wrote", out, (gif.bytes().length / 1024).toFixed(0) + "KB");

// debug: DUMP=<frame> writes a single PNG for visual inspection
if (process.env.DUMP) {
  frame(Number(process.env.DUMP));
  writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "site", "_frame.png"), canvas.toBuffer("image/png"));
  console.log("dumped frame", process.env.DUMP);
}
