# Operations — everything Higgsfield does beyond text-to-video

openfield routes more than plain generation. Each operation is a catalog model
with its own `kind`, reached through your provider keys like any other model.

| Op | Model id | Inputs | CLI |
|----|----------|--------|-----|
| Start-frame image | `image` | prompt | `openfield image --subject "..." --wait` |
| Upscale / enhance | `upscale` | video | `openfield enhance --video <url> --wait` |
| LipSync / Speak | `lipsync` | video + audio | `openfield lipsync --video <url> --audio <url> --wait` |
| Restyle (v2v) | `restyle` | video + prompt | `openfield restyle --video <url> --subject "..." --wait` |

They also work through `generate --model <id>` with `--image` / `--audio` /
`--video` flags, and through the MCP `generate_video` tool.

## Typical flow

```bash
# 1. make a start frame
openfield image --subject "a neon-lit android portrait, front view" --wait
# 2. animate it (image-to-video with that frame)
openfield generate --subject "the android turns to camera and smiles" \
  --model kling-2.5 --image <frame-url> --wait
# 3. give it a talking mouth
openfield lipsync --video <clip-url> --audio <voice-url> --wait
# 4. upscale for delivery
openfield enhance --video <lipsynced-url> --wait
```

Model slugs live in [`src/providers/catalog.ts`](../src/providers/catalog.ts) —
swap them for whichever fal/Replicate endpoints you prefer.
