# openfield MCP server

Generate video from inside any MCP client (Claude Code, Claude Desktop, Cursor…).
This is Higgsfield's "generate from Claude" wedge — open, BYOK.

## Tools

| Tool | What it does |
|------|--------------|
| `list_presets` | Browse the preset library, filter by category or query |
| `list_models` | List models + which provider keys reach them |
| `compose_prompt` | Preview the composed prompt (no API call, no credits) |
| `generate_video` | Compose + route to your configured provider, returns a job id |
| `check_status` | Poll a job, get the output video url when done |

## Wire into Claude Code

Add to `.mcp.json` in your project (or `~/.claude.json`):

```json
{
  "mcpServers": {
    "openfield": {
      "command": "npx",
      "args": ["-y", "openfield-mcp"],
      "env": {
        "FAL_KEY": "your-fal-key"
      }
    }
  }
}
```

Or, from a local clone:

```json
{
  "mcpServers": {
    "openfield": {
      "command": "node",
      "args": ["/absolute/path/to/openfield/dist/mcp.js"],
      "env": { "FAL_KEY": "your-fal-key" }
    }
  }
}
```

(Run `npm run build` first for the `dist/` path.)

## Wire into Claude Desktop

Same block, in `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/`,
Windows: `%APPDATA%\Claude\`).

## Then ask

> "Compose a prompt for a lone astronaut with the orbit and neon-noir presets, then generate it on wan-2.2 and poll until done."

The model calls `compose_prompt` → `generate_video` → `check_status` for you.
