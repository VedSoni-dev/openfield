# Recipes — the template gallery

Higgsfield sells a gallery of ready-made looks. openfield ships them as data:
each recipe bundles a model, stacked presets, and a Cinema Studio selection for
a common use case. Apply one, drop in your subject, generate.

## Built-in recipes

| Recipe | For |
|--------|-----|
| Cinematic Trailer | epic crane + anamorphic + teal/orange |
| Product Hero Ad | slow orbit, macro, clean high-key |
| UGC Selfie Ad | handheld phone look for social |
| Fashion Film | slow-mo tracking, 85mm, moody |
| Real-Estate Walkthrough | FPV glide, wide, bright |
| Music Video | snorricam, neon noir, whip-pans |
| Anime Action | crash-zoom speed lines, anime style |
| Food Close-Up | macro, shallow, warm practical light |

`openfield recipes` lists them.

## Use

### CLI

```bash
openfield generate --recipe cinematic-trailer --subject "a knight on a ridge" --wait
# override anything: --model, --presets, --body/--focal/… all win over the recipe
```

Omit `--subject` and the recipe's own placeholder subject is used.

### UI

Recipes tab → click a card → it loads into the Studio (model, presets, Cinema
Studio, and a starter subject) ready to tweak and shoot.

Add your own in [`src/recipes.ts`](../src/recipes.ts) — a test validates that
every preset / model / cinema id a recipe references actually exists.
