// Copy non-TS assets (the UI) into dist/ after tsc. Cross-platform, no deps.
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
await mkdir(join(root, "dist", "ui"), { recursive: true });
await cp(join(root, "src", "ui"), join(root, "dist", "ui"), { recursive: true });
console.log("copied src/ui -> dist/ui");
