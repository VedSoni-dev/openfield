# Changelog

All notable changes to openfield are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
