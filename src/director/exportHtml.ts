// Self-contained shotlist.html (BACKLOT DOC 07 §7.1) — a checkbox per scene
// (persisted in localStorage), a copy button per compiled prompt, and the
// collapsible global style prefix. Drops into any external generator.

import type { Shotlist } from "./compile.js";
import { compileScene } from "./compile.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportShotlistHtml(projectId: string, sb: Shotlist): string {
  const scenes = sb.scenes
    .map((sc) => {
      const { prompt, missing } = compileScene(projectId, sb, sc);
      const warn = missing.length ? `<div class="warn">⚠ unlocked: ${missing.map((m) => "@" + m).join(", ")}</div>` : "";
      return `<section class="scene">
      <label class="hd"><input type="checkbox" data-code="${esc(sc.code)}" /> <b>${esc(sc.code)}</b> · ${esc(sc.title)}</label>
      <div class="log">${esc(sc.logline)}</div>
      ${warn}
      <div class="handles">${sc.element_handles.map((h) => `<span class="chip">@${esc(h)}</span>`).join("")}</div>
      <button class="copy" data-i="${esc(sc.code)}">Copy prompt</button>
      <pre id="p-${esc(sc.code)}">${esc(prompt)}</pre>
    </section>`;
    })
    .join("\n");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sb.project_title)} — shotlist</title>
<style>
  :root{--bg:#0a0b0d;--panel:#141417;--line:#26262c;--text:#ece6da;--dim:#8b877c;--amber:#ff9a5a;--teal:#46d6c9;--mono:ui-monospace,Menlo,monospace}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 system-ui,sans-serif;padding:28px;max-width:900px;margin:0 auto}
  h1{font-size:26px}
  .prefix{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;margin:16px 0}
  .prefix pre,pre{white-space:pre-wrap;font-family:var(--mono);font-size:12.5px;color:var(--text);margin:0}
  summary{cursor:pointer;color:var(--teal);font-family:var(--mono);font-size:12px}
  .scene{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;margin:12px 0}
  .hd{font-size:16px;display:flex;gap:10px;align-items:center}
  .log{color:var(--dim);margin:6px 0}
  .handles{margin:8px 0}
  .chip{font-family:var(--mono);font-size:11px;border:1px solid var(--line);border-radius:999px;padding:3px 9px;color:var(--amber);margin-right:5px}
  .warn{color:#ff6b6b;font-family:var(--mono);font-size:12px;margin:4px 0}
  button.copy{background:var(--amber);color:#1a0f06;border:0;border-radius:7px;padding:7px 12px;font-family:var(--mono);font-size:12px;cursor:pointer;margin:6px 0}
  pre{background:#000;border:1px solid var(--line);border-radius:8px;padding:12px;overflow-x:auto;margin-top:8px}
  .done{opacity:.5}
</style></head><body>
<h1>${esc(sb.project_title)}</h1>
<details class="prefix" open><summary>Global Style Prefix</summary><pre>${esc(sb.style_prefix)}</pre></details>
${scenes}
<script>
  const KEY="shotlist:${esc(projectId)}";
  const done=JSON.parse(localStorage.getItem(KEY)||"{}");
  document.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.checked=!!done[cb.dataset.code]; cb.closest('.scene').classList.toggle('done',cb.checked);
    cb.onchange=()=>{done[cb.dataset.code]=cb.checked;localStorage.setItem(KEY,JSON.stringify(done));cb.closest('.scene').classList.toggle('done',cb.checked)};
  });
  document.querySelectorAll('button.copy').forEach(b=>b.onclick=()=>{
    const t=document.getElementById('p-'+b.dataset.i).textContent;
    navigator.clipboard.writeText(t); b.textContent='Copied ✓'; setTimeout(()=>b.textContent='Copy prompt',1200);
  });
</script></body></html>`;
}
