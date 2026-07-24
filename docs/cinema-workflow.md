# The Cinema Studio workflow

This is the real Higgsfield Cinema Studio workflow — the three-stage,
one-shot-commercial pipeline — rebuilt free and file-based. No Postgres, no
auth, no billing: everything lives under `~/.openfield/` and runs from
`npm install`. You bring your own model keys.

**The principle: consistency is won at asset-locking, not in the video model.**
Lock every recurring element as a canonical reference first; then every shot
that `@`-mentions it gets that exact reference image *attached* to the model
call, with a legend telling the model what each image is.

## The golden path

```bash
# 1. a project
openfield project new "Headphones Spot" --runtime 55

# 2. elements — the @handle registry (character, product, location, prop, schematic)
openfield element add headphones-spot hero       --type character --desc "lean man, late 20s, reddish-brown curls"
openfield element add headphones-spot headphones  --type product   --desc "cream ANC, tan cushions, orange ring"
openfield element add headphones-spot kitchen     --type location   --desc "sage-green country kitchen, 3/4 angle"

# 3. attach a reference image to each, then LOCK it (locked = immutable canon)
openfield element ver  headphones-spot hero --file ./sheets/hero.png
openfield element lock headphones-spot hero
#   variants for state changes — swap references, never ask the model to change mid-clip:
openfield element variant headphones-spot s_hero s_hero_wet --desc "post-run: damp hair, sweat-darkened kit"
#   schematics pin spatial layout a prose prompt can't hold:
openfield element schematic headphones-spot street

# 4. the Director compiles a shotlist (needs OPENROUTER_API_KEY — runs Nous Hermes 3 / any LLM)
openfield shotlist compile headphones-spot --script "$(cat script.txt)" --music music_track
openfield shotlist show headphones-spot            # style prefix + every compiled scene prompt
openfield shotlist html headphones-spot --out shotlist.html

# 5. takes — generate, rate, select (needs a video key: FAL_KEY / REPLICATE_API_TOKEN)
openfield take gen    headphones-spot 1a --count 3 --model seedance-2.0 --wait
openfield take rate   headphones-spot 1a 2 5
openfield take select headphones-spot 1a 2         # one selected take per scene

# 6. assemble + export
openfield assemble headphones-spot --out spot.mp4          # ffmpeg stringout of selects
openfield export fcpxml headphones-spot --out spot.fcpxml  # opens in Final Cut Pro, markers per clip
openfield export csv    headphones-spot --out manifest.csv
```

Everything above is also available in the desktop/web UI and over the REST API
(`/api/projects`, `/api/elements`, `/api/director/*`, `/api/takes/*`,
`/api/assemble/*`, `/api/export/*`) and much of it via MCP.

## How the reference attachment works

When a shot names `@hero @headphones @kitchen`, openfield:

1. resolves each handle (and aliases) to its **locked** element version,
2. orders them by role priority (character > product > prop > location >
   schematic), caps at 10, resolves local files to data URIs,
3. prepends a **reference legend** — `References: Image 1 = @hero (character
   sheet). Image 2 = @headphones (product sheet)…` — so the model binds each
   attached image,
4. submits prompt + attached images to your configured provider.

That attachment is the difference between a cosmetic `@`-mention and real
character/product/location consistency across every cut.

## What we deliberately skipped (vs the full BACKLOT spec)

Hosted-product infrastructure — Postgres, Redis, auth, Stripe credits, cloud
storage, moderation pipeline. openfield keeps the **capabilities** free and
local; the enterprise/hosted layer is out of scope for the open tool.
