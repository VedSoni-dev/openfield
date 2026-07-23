// Zero-dependency local API + static server for the openfield UI.
// Node's built-in http only — so it runs identically on macOS and Windows with
// no bundler. Powers both `openfield ui` and the Electron shell.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PRESETS } from "./presets/index.js";
import { CINEMA_GROUPS } from "./cinema.js";
import { RECIPES } from "./recipes.js";
import { CATALOG } from "./providers/catalog.js";
import { compose } from "./compose.js";
import { generate, pollOnce, configuredProviders, pickRoute } from "./router.js";
import {
  listCharacters,
  upsertCharacter,
  removeCharacter,
  getCharacter,
} from "./soul.js";
import { listLocations, getLocation, upsertLocation, removeLocation, locationPhrase } from "./locations.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI_DIR = join(HERE, "ui");

function json(res: ServerResponse, code: number, body: unknown) {
  const s = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

const CONTENT: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

async function serveStatic(res: ServerResponse, path: string) {
  const file = path === "/" ? "index.html" : path.replace(/^\/+/, "");
  const ext = file.slice(file.lastIndexOf("."));
  try {
    const data = await readFile(join(UI_DIR, file));
    res.writeHead(200, { "Content-Type": CONTENT[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  }
}

async function api(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  const p = url.pathname;
  try {
    if (req.method === "GET" && p === "/api/presets") return json(res, 200, PRESETS), true;
    if (req.method === "GET" && p === "/api/cinema") return json(res, 200, CINEMA_GROUPS), true;
    if (req.method === "GET" && p === "/api/recipes") return json(res, 200, RECIPES), true;
    if (req.method === "GET" && p === "/api/models")
      return json(res, 200, { models: CATALOG, configured: configuredProviders() }), true;
    if (req.method === "GET" && p === "/api/characters") return json(res, 200, listCharacters()), true;
    if (req.method === "GET" && p === "/api/locations") return json(res, 200, listLocations()), true;

    if (req.method === "POST" && p === "/api/compose") {
      const b = await readBody(req);
      const identity = b.character ? getCharacter(b.character) : undefined;
      const loc = b.location ? getLocation(b.location) : undefined;
      const c = compose({
        subject: b.subject ?? "",
        presets: b.presets ?? [],
        cinema: b.cinema,
        identity: identity ? `${identity.name}, the same consistent character` : undefined,
        setting: loc ? locationPhrase(loc) : undefined,
      });
      return json(res, 200, c), true;
    }

    if (req.method === "POST" && p === "/api/locations") {
      const b = await readBody(req);
      return json(res, 200, upsertLocation(b)), true;
    }
    if (req.method === "DELETE" && p === "/api/locations") {
      return json(res, 200, { removed: removeLocation(url.searchParams.get("id") ?? "") }), true;
    }

    if (req.method === "POST" && p === "/api/characters") {
      const b = await readBody(req);
      return json(res, 200, upsertCharacter(b)), true;
    }
    if (req.method === "DELETE" && p === "/api/characters") {
      return json(res, 200, { removed: removeCharacter(url.searchParams.get("id") ?? "") }), true;
    }

    if (req.method === "POST" && p === "/api/generate") {
      const b = await readBody(req);
      if (!pickRoute(b.model ?? "seedance-2.0"))
        return json(res, 400, { error: "no configured key for that model" }), true;
      const out = await generate(b);
      return json(res, 200, out), true;
    }

    if (req.method === "GET" && p === "/api/status") {
      const provider = url.searchParams.get("provider") ?? "";
      const job = url.searchParams.get("job") ?? "";
      return json(res, 200, await pollOnce(provider, job)), true;
    }

    if (req.method === "POST" && p === "/api/auto") {
      const b = await readBody(req);
      const { llmConfigured, agentDirect, planStoryboard, runStoryboard } = await import("./orchestrator/index.js");
      if (!llmConfigured()) return json(res, 400, { error: "no LLM key (OPENROUTER_API_KEY)" }), true;
      const steps: string[] = [];
      const sb = b.simple
        ? await planStoryboard(b.brief, b.character)
        : (await agentDirect(b.brief, { character: b.character, onStep: (m) => steps.push(m) })).storyboard;
      if (b.model) sb.model = b.model;
      if (b.dry) return json(res, 200, { storyboard: sb, steps }), true;
      const result = await runStoryboard(sb, { character: b.character, wait: false });
      return json(res, 200, { storyboard: sb, steps, result }), true;
    }
  } catch (e: any) {
    return json(res, 500, { error: e.message }), true;
  }
  return false;
}

export function startServer(port = 4317): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);
      if (url.pathname.startsWith("/api/")) {
        const handled = await api(req, res, url);
        if (!handled) json(res, 404, { error: "unknown endpoint" });
        return;
      }
      await serveStatic(res, url.pathname);
    });
    server.listen(port, () => resolve({ url: `http://localhost:${port}`, close: () => server.close() }));
  });
}
