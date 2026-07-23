// Electron desktop shell. Starts the in-process openfield server and points a
// native window at it. Same UI as `openfield ui`, wrapped as a mac + windows app.
import { app, BrowserWindow, shell } from "electron";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { existsSync } from "node:fs";

let server;

// dev: ../dist ; packaged: <resources>/app/dist
async function loadServer() {
  const devPath = new URL("../dist/server.js", import.meta.url);
  const packagedPath = pathToFileURL(join(process.resourcesPath || "", "app", "dist", "server.js"));
  const url = existsSync(new URL("../dist/server.js", import.meta.url)) ? devPath : packagedPath;
  return import(url.href);
}

async function createWindow() {
  const { startServer } = await loadServer();
  const { url, close } = await startServer(Number(process.env.OPENFIELD_PORT) || 4317);
  server = close;

  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: "#0c0d10",
    title: "openfield",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // open external links (generated video urls) in the system browser
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\/(?!localhost)/.test(target)) {
      shell.openExternal(target);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  win.loadURL(url);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
