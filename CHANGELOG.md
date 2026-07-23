# Changelog

All notable changes to openfield are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Cinema Studio expanded: 11 camera bodies, 10 lenses, 8 focal lengths, 6
  apertures, 7 shot sizes, and a new camera-angle group.
- Preset library grown to 61 across 7 categories (added mood + transition packs).
- Recipes — one-click template gallery (8 built-in), CLI `--recipe`, UI tab.
- Operations: image start-frames, video upscale, lipsync, and video-to-video
  restyle, as catalog models with CLI verbs (`image` / `enhance` / `lipsync` /
  `restyle`).
- Video stitching (`openfield stitch`, `auto --stitch`) via ffmpeg.
- UI: all-category animated preset gallery with category filters; Cinema Studio
  angle control; Recipes tab that loads a full look into the Studio.
- Landing page + docs (mcp, soul-id, orchestrator, cinema-studio, operations,
  recipes, desktop).

- Provider adapters: `fal`, `replicate`, `custom` (self-hosted). BYOK.
- Canonical model catalog with multi-route fallback (Seedance, Kling, Veo, Wan,
  Hunyuan, LTX, Minimax Hailuo).
- Router that picks the first configured route for a model.
- Preset library (47+): camera, lens, lighting, style, vfx packs.
- `compose()` prompt composer with stackable presets and `{subject}` resolution.
- CLI: `models`, `presets`, `compose`, `generate`, `status`.
- MCP server exposing presets, models, compose, and generate as tools.
- Soul ID — reference-image character consistency threaded through providers.
- Orchestrator — function-calling LLM that turns a brief into a shot list and
  generates each shot (OpenRouter-compatible, free-tier friendly).
- Cross-platform desktop app (macOS + Windows).
- Full OSS scaffolding: tests (vitest), lint (eslint), format (prettier), CI.

## [0.1.0] - 2026-07-23

- Initial public scaffold.
