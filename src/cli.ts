#!/usr/bin/env node
import "dotenv/config";
import { CATALOG } from "./providers/catalog.js";
import { PRESETS, searchPresets } from "./presets/index.js";
import { compose } from "./compose.js";
import { generate, waitFor, pollOnce, configuredProviders, pickRoute } from "./router.js";
import {
  listCharacters,
  getCharacter,
  upsertCharacter,
  removeCharacter,
  identityPhrase,
} from "./soul.js";

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
function has(name: string): boolean {
  return args.includes(`--${name}`);
}
// Cinema Studio flags: --body --lens --focal --aperture --shot
function readCinema(): Record<string, string> | undefined {
  const sel: Record<string, string> = {};
  for (const g of ["body", "lens", "focal", "aperture", "shot", "angle"]) {
    const v = flag(g);
    if (v) sel[g] = v;
  }
  return Object.keys(sel).length ? sel : undefined;
}

async function main() {
  switch (cmd) {
    case "models": {
      console.log("Models (route picked by which key you have):\n");
      for (const m of CATALOG) {
        const routes = m.routes.map((r) => r.provider).join(", ");
        console.log(`  ${m.id.padEnd(18)} ${m.label}  [${routes}]`);
      }
      console.log(`\nConfigured providers: ${configuredProviders().join(", ") || "none — set a key"}`);
      break;
    }

    case "presets": {
      const q = args[1];
      const list = q ? searchPresets(q) : PRESETS;
      console.log(`${list.length} preset(s):\n`);
      for (const p of list) {
        console.log(`  ${p.id.padEnd(16)} [${p.category}] ${p.desc}`);
      }
      break;
    }

    case "recipes": {
      const { RECIPES } = await import("./recipes.js");
      console.log(`${RECIPES.length} recipes:\n`);
      for (const r of RECIPES) console.log(`  ${r.id.padEnd(18)} ${r.label} — ${r.desc}`);
      console.log('\nuse: openfield generate --recipe cinematic-trailer --subject "..." --wait');
      break;
    }

    case "cinema": {
      const { CINEMA_GROUPS } = await import("./cinema.js");
      for (const [group, opts] of Object.entries(CINEMA_GROUPS)) {
        console.log(`\n${group.toUpperCase()}`);
        for (const o of opts) console.log(`  ${o.id.padEnd(14)} ${o.label}`);
      }
      console.log('\nuse: openfield generate --subject "..." --body arri-alexa --focal f85 --shot cu');
      break;
    }

    case "compose": {
      const subject = flag("subject") ?? args[1];
      if (!subject) return fail("need --subject \"...\"");
      const presets = (flag("presets") ?? "").split(",").filter(Boolean);
      const c = compose({ subject, presets, cinema: readCinema() });
      console.log("PROMPT:\n" + c.prompt);
      if (Object.keys(c.params).length) console.log("\nPARAMS:\n" + JSON.stringify(c.params, null, 2));
      break;
    }

    case "generate": {
      // Optional recipe supplies defaults for model/presets/cinema/subject.
      let recipe;
      if (flag("recipe")) {
        const { findRecipe } = await import("./recipes.js");
        recipe = findRecipe(flag("recipe")!);
        if (!recipe) return fail(`unknown recipe: ${flag("recipe")}. Run 'openfield recipes'.`);
      }
      const subject = flag("subject") ?? args[1] ?? recipe?.subjectHint;
      const model = flag("model") ?? recipe?.model ?? "seedance-2.0";
      if (!subject) return fail('need --subject "..."');
      const flagPresets = (flag("presets") ?? "").split(",").filter(Boolean);
      const presets = flagPresets.length ? flagPresets : recipe?.presets ?? [];
      const route = pickRoute(model);
      if (!route) return fail(`no configured key for ${model}. Run 'openfield models'.`);

      const cinema = readCinema() ?? recipe?.cinema;
      const c = compose({ subject, presets, cinema });
      console.log(`model=${model} via ${route.provider}`);
      console.log(`prompt: ${c.prompt}\n`);

      const { job, provider } = await generate({
        subject,
        presets,
        model,
        cinema,
        character: flag("character"),
        location: flag("location"),
        project: flag("project"),
        image: flag("image"),
        audio: flag("audio"),
        video: flag("video"),
        durationSec: flag("duration") ? Number(flag("duration")) : undefined,
        aspectRatio: flag("aspect"),
        resolution: flag("resolution"),
      });
      if (job.status === "failed") return fail(job.error ?? "create failed");
      console.log(`job ${job.id} queued on ${provider}`);

      if (has("wait")) {
        console.log("waiting...");
        const done = await waitFor(provider, job.id);
        if (done.status === "succeeded") console.log("done:\n" + (done.output ?? []).join("\n"));
        else fail(done.error ?? "generation failed");
      } else {
        console.log(`poll: openfield status --provider ${provider} --job ${job.id}`);
      }
      break;
    }

    case "image":
    case "enhance":
    case "lipsync":
    case "restyle": {
      // Operation verbs — Higgsfield parity (image start-frames, upscale, speak, v2v).
      const opModel = { image: "image", enhance: "upscale", lipsync: "lipsync", restyle: "restyle" }[cmd]!;
      if (!pickRoute(opModel)) return fail(`no configured key for ${opModel}. Run 'openfield models'.`);
      const { job, provider } = await generate({
        subject: flag("subject") ?? args[1] ?? "",
        presets: [],
        model: opModel,
        image: flag("image"),
        audio: flag("audio"),
        video: flag("video"),
      });
      if (job.status === "failed") return fail(job.error ?? "op failed");
      console.log(`${cmd} queued on ${provider}, job ${job.id}`);
      if (has("wait")) {
        const done = await waitFor(provider, job.id);
        console.log(done.status === "succeeded" ? "done:\n" + (done.output ?? []).join("\n") : "failed: " + done.error);
      } else console.log(`poll: openfield status --provider ${provider} --job ${job.id}`);
      break;
    }

    case "status": {
      const provider = flag("provider");
      const job = flag("job");
      if (!provider || !job) return fail("need --provider and --job");
      const j = await pollOnce(provider, job);
      console.log(`status: ${j.status}`);
      if (j.output?.length) console.log(j.output.join("\n"));
      if (j.error) console.log("error: " + j.error);
      break;
    }

    case "stitch": {
      const urls = args.slice(1).filter((a) => !a.startsWith("--") && !/^(film\.mp4)$/.test(a) && a !== flag("out"));
      if (!urls.length) return fail('need clip urls/paths: openfield stitch <url1> <url2> ... --out film.mp4');
      const out = flag("out") ?? "openfield.mp4";
      const { stitch } = await import("./stitch.js");
      try {
        await stitch(urls, out, { onProgress: (m) => console.log(m) });
        console.log(`stitched ${urls.length} clips → ${out}`);
      } catch (e: any) {
        return fail(e.message);
      }
      break;
    }

    case "ui": {
      const port = flag("port") ? Number(flag("port")) : 4317;
      const { startServer } = await import("./server.js");
      const { url } = await startServer(port);
      console.log(`openfield UI running at ${url}`);
      console.log("Ctrl+C to stop.");
      // keep process alive
      await new Promise(() => {});
      break;
    }

    case "shotlist":
    case "sl": {
      const d = await import("./director/index.js");
      const sub = args[1];
      const pid = args[2];
      if (!pid) return fail("usage: openfield shotlist <compile|show|scene|html> <projectId> ...");
      if (sub === "compile") {
        const { llmConfigured } = await import("./orchestrator/index.js");
        if (!llmConfigured()) return fail("no LLM key. Set OPENROUTER_API_KEY (Hermes/free tier).");
        const script = flag("script") ?? (flag("script-file") ? (await import("node:fs")).readFileSync(flag("script-file")!, "utf8") : undefined);
        if (!script) return fail('need --script "..." or --script-file <path>');
        console.log("directing…");
        const sb = await d.compileShotlist(pid, { script, notes: flag("notes"), musicHandle: flag("music"), targetRuntimeS: flag("runtime") ? Number(flag("runtime")) : undefined });
        console.log(`"${sb.project_title}" — ${sb.scenes.length} scenes\n`);
        sb.scenes.forEach((s) => console.log(`  ${s.code.padEnd(4)} ${s.title}${s.element_handles.length ? "  [" + s.element_handles.map((h) => "@" + h).join(" ") + "]" : ""}`));
      } else if (sub === "show") {
        const sb = d.getShotlist(pid);
        if (!sb) return fail("no shotlist. compile first.");
        console.log("STYLE PREFIX:\n" + sb.style_prefix + "\n");
        sb.scenes.forEach((s) => console.log(`\n=== ${s.code} · ${s.title} ===\n` + d.compileScene(pid, sb, s).prompt));
      } else if (sub === "scene") {
        const sb = d.getShotlist(pid);
        const s = sb?.scenes.find((x) => x.code === args[3]);
        if (!sb || !s) return fail("scene not found");
        const r = d.compileScene(pid, sb, s);
        console.log(r.prompt);
        if (r.missing.length) console.log("\n⚠ unlocked: " + r.missing.map((m) => "@" + m).join(", "));
      } else if (sub === "html") {
        const sb = d.getShotlist(pid);
        if (!sb) return fail("no shotlist. compile first.");
        const out = flag("out") ?? "shotlist.html";
        (await import("node:fs")).writeFileSync(out, d.exportShotlistHtml(pid, sb));
        console.log(`wrote ${out}`);
      } else {
        console.log("shotlist commands: compile | show | scene <code> | html");
      }
      break;
    }

    case "project":
    case "proj": {
      const proj = await import("./projects.js");
      const sub = args[1];
      if (sub === "new") {
        const name = flag("name") ?? args[2];
        if (!name) return fail('need a name: openfield project new "Headphones Spot"');
        const p = proj.createProject({
          name,
          aspectRatio: flag("aspect"),
          targetRuntimeS: flag("runtime") ? Number(flag("runtime")) : undefined,
          createdAt: new Date().toISOString(),
        });
        console.log(`created project ${p.id} — ${p.name} (${p.aspectRatio}, ${p.targetRuntimeS}s)`);
      } else if (sub === "rm") {
        return console.log(proj.removeProject(args[2] ?? "") ? "removed" : "not found");
      } else {
        const ps = proj.listProjects();
        if (!ps.length) return console.log('no projects. new: openfield project new "My Spot"');
        for (const p of ps) console.log(`  ${p.id.padEnd(24)} ${p.name} (${p.aspectRatio}, ${p.targetRuntimeS}s)`);
      }
      break;
    }

    case "element":
    case "el": {
      const el = await import("./elements.js");
      const sub = args[1];
      const pid = args[2];
      if (sub === "add") {
        const handle = args[3];
        if (!pid || !handle) return fail("usage: openfield element add <projectId> <handle> --type character --desc \"...\"");
        const e = el.upsertElement(pid, {
          handle,
          type: (flag("type") ?? "prop") as any,
          displayName: flag("name"),
          description: flag("desc"),
          aliases: flag("alias") ? [flag("alias")!] : undefined,
          parentHandle: flag("parent"),
        });
        console.log(`@${e.handle} [${e.type}] added to ${pid}`);
      } else if (sub === "ver") {
        const handle = args[3];
        const file = flag("file");
        if (!pid || !handle || !file) return fail("usage: openfield element ver <projectId> <handle> --file <path>");
        const { readFileSync } = await import("node:fs");
        const v = el.addVersion(pid, handle, readFileSync(file), { ext: el.extFromName(file), source: "uploaded" });
        console.log(`@${handle} v${v.versionNo} <- ${file}`);
      } else if (sub === "lock") {
        const e = el.lockElement(pid, args[3] ?? "");
        console.log(`@${e.handle} locked (v${e.currentVersion})`);
      } else if (sub === "variant") {
        const e = el.forkVariant(pid, args[3] ?? "", args[4] ?? "", flag("desc"));
        console.log(`@${e.handle} forked from @${e.parentHandle}`);
      } else {
        if (!pid) return fail("usage: openfield element list <projectId>");
        const es = el.listElements(pid);
        if (!es.length) return console.log("no elements. add: openfield element add <projectId> <handle> --type character");
        for (const e of es) console.log(`  @${e.handle.padEnd(16)} [${e.type}] ${e.status}${e.currentVersion ? " v" + e.currentVersion : ""} — ${e.description || ""}`);
      }
      break;
    }

    case "location":
    case "loc": {
      const { listLocations, getLocation, upsertLocation, removeLocation, locationPhrase } = await import("./locations.js");
      const sub = args[1];
      if (sub === "add") {
        const id = args[2];
        if (!id) return fail('need id: openfield location add <id> --name "..." --desc "..."');
        const l = upsertLocation({ id, name: flag("name") ?? id, description: flag("desc") ?? "" });
        console.log(`saved ${l.id}: ${l.name}`);
        console.log(`phrase: ${locationPhrase(l)}`);
      } else if (sub === "show") {
        const l = getLocation(args[2] ?? "");
        if (!l) return fail("not found");
        console.log(JSON.stringify(l, null, 2));
      } else if (sub === "rm") {
        return console.log(removeLocation(args[2] ?? "") ? "removed" : "not found");
      } else {
        const ls = listLocations();
        if (!ls.length) return console.log('no locations. add: openfield location add mars --name "Mars" --desc "..."');
        for (const l of ls) console.log(`  ${l.id.padEnd(14)} ${l.name}`);
      }
      break;
    }

    case "auto":
    case "direct": {
      const brief = flag("brief") ?? args[1];
      if (!brief) return fail('need a brief: openfield auto "a 3-shot ad for a coffee brand"');
      const { llmConfigured, planStoryboard, agentDirect, runStoryboard, llmConfig } = await import("./orchestrator/index.js");
      if (!llmConfigured()) return fail("no LLM key. Set OPENROUTER_API_KEY (free tier) or OPENFIELD_LLM_KEY.");
      const character = flag("character");
      // Real Hermes agent loop by default; --simple uses the one-shot planner.
      console.log(`directing with ${llmConfig().model}...`);
      let sb;
      if (has("simple")) {
        sb = await planStoryboard(brief, character);
      } else {
        const r = await agentDirect(brief, { character, onStep: (m) => console.log("  ▸ " + m) });
        sb = r.storyboard;
        console.log(`  (agent used ${r.steps} steps)`);
      }
      if (flag("model")) sb.model = flag("model")!;
      console.log(`\n"${sb.title}" — ${sb.shots.length} shots on ${sb.model}`);
      sb.shots.forEach((s, i) =>
        console.log(`  ${i + 1}. ${s.subject}${s.presets.length ? ` [${s.presets.join(", ")}]` : ""}`),
      );
      if (has("dry")) break;
      console.log("\ngenerating...");
      const result = await runStoryboard(sb, {
        character,
        wait: has("wait"),
        onProgress: (m) => console.log(m),
      });
      const ok = result.shots.filter((s) => s.status === "succeeded").length;
      console.log(`\ndone: ${ok}/${result.shots.length} shots ok`);
      const clips: string[] = [];
      for (const s of result.shots) {
        if (s.output?.length) { console.log(`  shot ${s.index + 1}: ${s.output.join(" ")}`); clips.push(s.output[0]); }
        if (s.error) console.log(`  shot ${s.index + 1} error: ${s.error}`);
      }
      if (has("stitch") && has("wait") && clips.length > 1) {
        const out = flag("out") ?? "openfield.mp4";
        const { stitch } = await import("./stitch.js");
        console.log("\nstitching...");
        try {
          await stitch(clips, out, { onProgress: (m) => console.log("  " + m) });
          console.log(`film → ${out}`);
        } catch (e: any) {
          console.log("stitch skipped: " + e.message);
        }
      } else if (has("stitch") && !has("wait")) {
        console.log("(add --wait so shots finish before stitching)");
      }
      break;
    }

    case "soul": {
      const sub = args[1];
      if (sub === "list") {
        const chars = listCharacters();
        if (!chars.length) return console.log("no characters. add one: openfield soul add <id> --name \"...\" --ref <url>");
        for (const c of chars) console.log(`  ${c.id.padEnd(14)} ${c.name}  (${c.refs.length} ref)`);
      } else if (sub === "add") {
        const id = args[2];
        if (!id) return fail('need id: openfield soul add <id> --name "..." --ref <url> [--ref <url>] [--traits "..."]');
        const refs = args.reduce<string[]>((acc, a, i) => (a === "--ref" && args[i + 1] ? [...acc, args[i + 1]] : acc), []);
        const c = upsertCharacter({
          id,
          name: flag("name") ?? id,
          refs,
          traits: flag("traits"),
          notes: flag("notes"),
        });
        console.log(`saved ${c.id}: ${c.name} (${c.refs.length} ref)`);
        console.log(`identity: ${identityPhrase(c)}`);
      } else if (sub === "show") {
        const c = getCharacter(args[2] ?? "");
        if (!c) return fail("not found");
        console.log(JSON.stringify(c, null, 2));
        console.log("\nidentity: " + identityPhrase(c));
      } else if (sub === "rm") {
        return console.log(removeCharacter(args[2] ?? "") ? "removed" : "not found");
      } else {
        console.log("soul commands: list | add <id> --name --ref | show <id> | rm <id>");
      }
      break;
    }

    default:
      console.log(`openfield — open-source Higgsfield. BYO keys, free preset library.

Usage:
  openfield models                       list models + which providers reach them
  openfield presets [query]              list/search the free preset library
  openfield cinema                       list Cinema Studio options (body/lens/focal…)
  openfield compose --subject "..." --presets dolly-in,orbit
                                         preview the composed prompt (no API call)
  openfield generate --subject "..." --model seedance-2.0 --presets orbit --wait
  openfield generate --subject "..." --character nova --presets orbit --wait
  openfield status --provider fal --job <id>
  openfield ui [--port 4317]              local web app (mac + windows)
  openfield soul add nova --name "Nova" --ref <img-url> --traits "red bob, freckles"
  openfield soul list | show <id> | rm <id>
  openfield auto "a 3-shot moody ad for a coffee brand" --model wan-2.2 --wait
  openfield auto "..." --character nova --dry     # just plan, no generation
  openfield auto "..." --model wan-2.2 --wait --stitch --out film.mp4
  openfield stitch <clip-url> <clip-url> --out film.mp4    # ffmpeg concat
  openfield image   --subject "..." --wait        # generate a start frame
  openfield enhance --video <url> --wait          # upscale a clip
  openfield lipsync --video <url> --audio <url> --wait
  openfield restyle --video <url> --subject "..." --wait

Keys (bring your own):
  video:  FAL_KEY, REPLICATE_API_TOKEN, OPENFIELD_CUSTOM_URL
  auto:   OPENROUTER_API_KEY (free tier) or OPENFIELD_LLM_KEY`);
  }
}

function fail(msg: string) {
  console.error("error: " + msg);
  process.exitCode = 1;
}

main().catch((e) => fail(e.message));
