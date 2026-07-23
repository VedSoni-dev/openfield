# Orchestrator — the open Hermes

Higgsfield's *Hermes* is a fine-tuned Nous Hermes 3 that function-calls over ~40
tools to run a whole production (script → character → shots → video). openfield's
orchestrator is the same idea, model-agnostic and free-tier friendly.

## How it works

1. **Plan.** The LLM is given the full preset + model catalog and calls one
   function, `storyboard`, whose arguments are the shot list. Single-tool
   function calling — robust even on small free models.
2. **Sanitize.** Unknown preset/model ids are dropped or fall back to a real
   catalog entry, so a hallucinated id never reaches a provider.
3. **Run.** Each shot goes through the normal router → your configured provider,
   with Soul ID character threading if you pass `--character`.

## Setup

Any OpenAI-compatible endpoint. Defaults to OpenRouter's free tier so you don't
need a paid key:

```bash
# .env
OPENROUTER_API_KEY=sk-or-...
# optional overrides:
# OPENFIELD_LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free
# OPENFIELD_LLM_BASE=https://openrouter.ai/api/v1
```

Point `OPENFIELD_LLM_BASE` at OpenAI, Together, a local Ollama
(`http://localhost:11434/v1`), etc. to use those instead.

## Use

```bash
# just plan (no video, no credits)
openfield auto "a moody 3-shot ad for a specialty coffee brand" --dry

# plan + generate every shot on a chosen model, waiting for each
openfield auto "a moody 3-shot ad for a specialty coffee brand" --model wan-2.2 --wait

# same character in every shot
openfield auto "Nova explores a neon city at night, 4 shots" --character nova --wait
```

Via MCP: the `direct_video` tool does the same (`dryRun: true` to only plan).
