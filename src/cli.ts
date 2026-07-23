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

    case "compose": {
      const subject = flag("subject") ?? args[1];
      if (!subject) return fail("need --subject \"...\"");
      const presets = (flag("presets") ?? "").split(",").filter(Boolean);
      const c = compose({ subject, presets });
      console.log("PROMPT:\n" + c.prompt);
      if (Object.keys(c.params).length) console.log("\nPARAMS:\n" + JSON.stringify(c.params, null, 2));
      break;
    }

    case "generate": {
      const subject = flag("subject") ?? args[1];
      const model = flag("model") ?? "seedance-2.0";
      if (!subject) return fail('need --subject "..."');
      const presets = (flag("presets") ?? "").split(",").filter(Boolean);
      const route = pickRoute(model);
      if (!route) return fail(`no configured key for ${model}. Run 'openfield models'.`);

      const c = compose({ subject, presets });
      console.log(`model=${model} via ${route.provider}`);
      console.log(`prompt: ${c.prompt}\n`);

      const { job, provider } = await generate({
        subject,
        presets,
        model,
        character: flag("character"),
        image: flag("image"),
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

    case "auto":
    case "direct": {
      const brief = flag("brief") ?? args[1];
      if (!brief) return fail('need a brief: openfield auto "a 3-shot ad for a coffee brand"');
      const { llmConfigured, planStoryboard, runStoryboard } = await import("./orchestrator/index.js");
      if (!llmConfigured()) return fail("no LLM key. Set OPENROUTER_API_KEY (free tier) or OPENFIELD_LLM_KEY.");
      const character = flag("character");
      console.log("planning storyboard...");
      const sb = await planStoryboard(brief, character);
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
      for (const s of result.shots) {
        if (s.output?.length) console.log(`  shot ${s.index + 1}: ${s.output.join(" ")}`);
        if (s.error) console.log(`  shot ${s.index + 1} error: ${s.error}`);
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
  openfield compose --subject "..." --presets dolly-in,orbit
                                         preview the composed prompt (no API call)
  openfield generate --subject "..." --model seedance-2.0 --presets orbit --wait
  openfield generate --subject "..." --character nova --presets orbit --wait
  openfield status --provider fal --job <id>
  openfield soul add nova --name "Nova" --ref <img-url> --traits "red bob, freckles"
  openfield soul list | show <id> | rm <id>
  openfield auto "a 3-shot moody ad for a coffee brand" --model wan-2.2 --wait
  openfield auto "..." --character nova --dry     # just plan, no generation

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
