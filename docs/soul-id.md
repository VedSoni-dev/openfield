# Soul ID — character consistency

Lock the same character across every shot. Higgsfield charges for this; openfield
stores it locally and threads it into whatever model you run.

## How it works

A character = a handle + display name + reference image(s) + optional look traits.
Stored as JSON in `~/.openfield/characters.json` (override with `OPENFIELD_HOME`).

At generation time, `--character <id>`:

1. weaves a **stable identity phrase** into the prompt
   (`"Nova, the same consistent character, red bob, freckles, identical face and
   appearance across every shot"`), and
2. passes the **reference images** to the provider as a subject reference
   (fal: `reference_image_urls`, replicate: `reference_images`), and uses the
   first ref as the start frame when you don't supply your own `--image`.

Consistency quality depends on the backend model's reference support — Seedance,
Kling, and Veo honor subject references; open models vary. openfield hands the
references over; the model does the locking.

## Use

```bash
# define once
openfield soul add nova \
  --name "Nova" \
  --ref https://example.com/nova-front.png \
  --ref https://example.com/nova-side.png \
  --traits "red bob, freckles, green flight jacket"

openfield soul list
openfield soul show nova

# then reuse across shots
openfield generate --subject "sipping coffee at a Paris cafe" --character nova --presets dolly-in --wait
openfield generate --subject "running through neon rain" --character nova --presets tracking,neon-noir --wait
```

Same via MCP: `save_character` then `generate_video(character="nova", ...)`.
