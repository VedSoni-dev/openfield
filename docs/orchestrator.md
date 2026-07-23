# Orchestrator — the open Hermes

Higgsfield's *Hermes* is a fine-tuned Nous Hermes 3 that function-calls over ~40
tools to run a whole production. openfield runs the **actual Nous Hermes 3**
model in a genuine multi-tool agent loop — same brain, open tools.

## The agent (default)

`agentDirect()` runs Hermes 3 (`nousresearch/hermes-3-llama-3.1-70b` by default)
in a real function-calling loop over openfield's own tools:

| Tool | What the agent does with it |
|------|------------------------------|
| `search_presets` | discover preset ids by keyword |
| `list_cinema` | inspect Cinema Studio option ids |
| `list_characters` | find Soul ID characters to feature |
| `set_project` | choose the title + video model |
| `add_shot` | append a directed shot (subject, presets, per-shot cinema) |
| `finalize` | end the loop |

The model iterates — searching, then building the shot list one `add_shot` at a
time — until it calls `finalize`. Every id it emits is validated against the
catalog before anything reaches a provider. The CLI and Director UI show the full
tool trace so you can watch it direct.

Override the model with `OPENFIELD_LLM_MODEL` (any OpenAI-compatible endpoint via
`OPENFIELD_LLM_BASE`). Pass `--simple` / `simple:true` to use the lighter
one-shot planner instead.

## How a run flows

1. **Direct.** The Hermes agent assembles the storyboard through the tool loop.
2. **Sanitize.** Unknown preset/model/cinema ids are dropped or fall back to a
   real catalog entry, so a hallucination never reaches a provider.
3. **Run.** Each shot goes through the normal router → your configured provider,
   with per-shot cinema and Soul ID character threading.

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
