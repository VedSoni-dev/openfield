# Desktop app (macOS + Windows)

openfield ships two ways to get the GUI. Both render the exact same interface.

## 1. Local web app — zero install beyond Node

Runs identically on macOS, Windows, and Linux (pure Node `http` + vanilla JS, no
bundler):

```bash
npm run build   # first time, compiles + copies the UI
openfield ui    # → http://localhost:4317
```

Open the printed URL. Tabs: **Studio** (compose + generate), **Presets**,
**Soul ID**, **Director** (brief → storyboard → shots).

## 2. Native desktop app — Electron shell

A real windowed app with installers, wrapping the same server in-process.

```bash
npm run build              # build the core first (from repo root)
cd app
npm install                # electron + electron-builder
npm start                  # run the app in dev
```

Build installers:

```bash
npm run dist:mac           # → app/release/*.dmg, *.zip
npm run dist:win           # → app/release/*.exe (NSIS + portable)
npm run dist               # current platform
```

macOS builds are cross-compilable from macOS; Windows `.exe` builds run on
Windows or via CI (see `.github/workflows`). Both targets are configured in
`app/package.json` under `build`.

## Keys

The desktop app reads the same environment variables as the CLI
(`FAL_KEY`, `REPLICATE_API_TOKEN`, `OPENROUTER_API_KEY`, …). Set them in your
shell before launching, or in a `.env` at the repo root.
