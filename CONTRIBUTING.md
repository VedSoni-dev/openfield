# Contributing to openfield

Thanks for helping open-source the cinematic AI-video stack. Contributions of all sizes welcome — especially **new presets** and **new provider adapters**.

## Setup

```bash
git clone https://github.com/VedSoni-dev/openfield
cd openfield
npm install
cp .env.example .env   # add at least one key if you want to run generations
npm run check          # typecheck + lint + test — must pass before you PR
```

Node ≥ 20 required.

## Ways to contribute

### Add a preset (easiest, highest value)

Presets live in [`src/presets/`](src/presets/), one file per category (`camera`, `lens`, `lighting`, `style`, `vfx`). Add an entry to the right array:

```ts
{
  id: "vertigo",                          // unique kebab-case
  label: "Vertigo / Dolly Zoom",
  category: "camera",
  desc: "Zoom in while dollying out — the Hitchcock effect.",
  template: "a dolly zoom on {subject}, background warping as the lens zooms in while the camera pulls back",
  params: { camera_motion: "dolly_zoom" }, // optional structured params
  tags: ["hitchcock", "zolly", "warp"],
}
```

Rules:

- **Model-agnostic prose.** Write plain cinematography language every video model understands. No provider-specific tokens.
- `{subject}` is replaced by the composer — use it where the subject belongs, or omit it for pure look/grade presets.
- Keep `id` unique (a test enforces this).

### Add a provider adapter

Implement the `Provider` interface in [`src/providers/types.ts`](src/providers/types.ts), drop the file in `src/providers/`, register it in [`src/router.ts`](src/router.ts), and add routes to [`src/providers/catalog.ts`](src/providers/catalog.ts). BYOK: read your key from `process.env`, never proxy it.

### Add a model

Add a row to `CATALOG` in [`src/providers/catalog.ts`](src/providers/catalog.ts) with one or more provider routes. The router auto-picks the first route whose key is configured.

## Standards

- Run `npm run check` before opening a PR.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…).
- New logic gets a test in `test/`.
- Keep provider keys out of code and git — only `.env` / CI secrets.

## PRs

Small and focused beats large and sprawling. Describe what and why. Link any related issue.
