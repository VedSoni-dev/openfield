# openfield

Open-source Higgsfield. **Bring your own video-model keys — get the cinematic preset library for free.**

Higgsfield is three things: (1) a router that resells Seedance / Kling / Veo / Wan behind one subscription, (2) a paywalled library of "camera control" presets that is really just prompt engineering, and (3) *Hermes*, an agent (fine-tuned Nous Hermes 3) that orchestrates the whole pipeline. openfield gives you 1 and 2 with **your own keys** and no markup, and leaves 3 pluggable to any function-calling LLM.

## Why

You already pay ByteDance / fal / Replicate for the actual model. Higgsfield charges you again for the buttons on top. The buttons are prompt templates. They live in [`src/presets/`](src/presets/) — MIT, readable, extend them.

## Install

```bash
npm install && npm run build
cp .env.example .env   # add ONE key to start (FAL_KEY is highest leverage)
```

## Use

```bash
openfield models                    # what you can run + which key reaches it
openfield presets [query]           # the free preset library
openfield compose --subject "a lone samurai in the rain" --presets dolly-in,orbit
openfield generate --subject "..." --model seedance-2.0 --presets orbit --wait
openfield status --provider fal --job <id>
```

`compose` makes no API call — inspect the exact prompt before you spend credits.

## Architecture

```
subject + presets ──▶ compose() ──▶ router ──▶ provider adapter ──▶ backend model
                       (free IP)     (pick by    (BYOK)              (Seedance/Kling/
                                      key)                            Veo/Wan/...)
```

- **Providers** ([`src/providers/`](src/providers/)) — `fal`, `replicate`, `custom` (self-host). Each reads its own key; openfield never proxies it. Add one by implementing the `Provider` interface.
- **Catalog** ([`src/providers/catalog.ts`](src/providers/catalog.ts)) — canonical model id ➜ multiple provider routes. Router picks the first route whose key you have.
- **Presets** ([`src/presets/`](src/presets/)) — the giveaway. Camera moves as model-agnostic prompt fragments. Stackable.
- **Compose** ([`src/compose.ts`](src/compose.ts)) — subject + stacked presets ➜ final prompt + params.

## Roadmap

- [ ] Lens / lighting / style / VFX preset packs
- [ ] Character consistency (Soul ID equivalent) via open IP-Adapter / per-subject LoRA
- [ ] MCP server (copy Higgsfield's growth wedge — generate from Claude Code)
- [ ] Hermes-equivalent orchestrator: function-calling LLM chains script ➜ shots ➜ generate ➜ stitch

## License

MIT.
