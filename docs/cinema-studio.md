# Cinema Studio

Higgsfield's flagship: pick real glass before you shoot. openfield rebuilds it as
plain data — a camera body, lens, focal length, aperture, and shot size that
compose into glass-accurate direction plus structured params.

## Groups

| Group | Examples |
|-------|----------|
| **body** | ARRI Alexa 35, RED Komodo, Sony Venice 2, 35mm film, 16mm film |
| **lens** | Master Prime, Cooke S4, Anamorphic, Vintage glass |
| **focal** | 14 / 24 / 35 / 50 / 85 / 135 mm |
| **aperture** | f/1.4 · f/2.8 · f/5.6 · f/11 |
| **shot** | ECU · CU · Medium · Wide · Extreme wide |

`openfield cinema` lists every option id.

## Use

### CLI

```bash
openfield compose --subject "a wolf on a cliff" \
  --body film-35 --focal f135 --aperture f28 --shot cu

openfield generate --subject "..." --model wan-2.2 \
  --body arri-alexa --lens anamorphic --focal f85 --wait
```

### UI

Studio tab → the **◎ Cinema Studio** panel → five dropdowns. The selection folds
into the composed prompt alongside your presets.

## How it composes

Selections append after the subject and presets, ordered shot → focal → aperture
→ lens → body, and their structured params (`focal_length_mm`, `aperture`,
`aspect_ratio`) merge into the request. Example:

```
… close-up shot, 85mm short telephoto, flattering compression, shallow depth,
wide open at f/1.4, creamy bokeh, shot on an ARRI Alexa 35, rich filmic latitude
```

Add or edit options in [`src/cinema.ts`](../src/cinema.ts).
