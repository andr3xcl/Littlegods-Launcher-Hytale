import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  nativeImage,
  Tray,
  Menu,
  protocol,
  dialog,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { META_DIRECTORY } from "./utils/const";
import { logger } from "./utils/logger";

import { cancelBuildDownload, installGame } from "./utils/game/install";
import { checkNixInstalled, installNix, uninstallNix } from "./utils/game/nix";
import { genUUID } from "./utils/game/uuid";
import { checkGameInstallation } from "./utils/game/check";
import { launchGame } from "./utils/game/launch";
import {
  connectRPC,
  disconnectRPC,
  setChoosingVersionActivity,
  setPlayingActivity,
} from "./utils/discord";
import { readInstallManifest } from "./utils/game/manifest";
import {
  listInstalledVersions,
  deleteInstalledVersion,
  InstalledBuildInfo,
} from "./utils/game/installed";

import {
  getLatestDir,
  getPreReleaseBuildDir,
  getPreReleaseChannelDir,
  getReleaseBuildDir,
  getReleaseChannelDir,
  migrateLegacyChannelInstallIfNeeded,
} from "./utils/game/paths";
import {
  checkOnlinePatchNeeded,
  disableOnlinePatch,
  enableOnlinePatch,
  fixClientToUnpatched,
  getOnlinePatchHealth,
  getOnlinePatchState,
} from "./utils/game/onlinePatch";
import {
  listInstalledMods,
  downloadMod,
  toggleMod,
  uninstallMod,
  ModInfo,
} from "./utils/game/mods";
import { getHytaleNews, getHytaleNewsBody } from "./utils/news";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

protocol.registerSchemesAsPrivileged([
  { scheme: "media", privileges: { secure: true, bypassCSP: true, allowServiceWorkers: true, supportFetchAPI: true, stream: true } }
]);

app.on("ready", () => {
  app.setAppUserModelId("com.littlegods.launcher");

  logger.info(`LittleGods Launcher is starting...
    App Version: ${app.getVersion()}
    Platform: ${os.type()} ${os.release()}
    Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
    Electron: ${process.versions.electron}, Node: ${process.versions.node}, Chromium: ${process.versions.chrome}
  `);
});

app.on("before-quit", () => {
  isQuitting = true;
  try {
    void disconnectRPC();
  } catch {
    
  }
});

app.on("will-quit", () => {
  logger.info("Closing LittleGods Launcher");
});

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayUnavailable = false;
let isQuitting = false;
let backgroundTimeout: NodeJS.Timeout | null = null;
let isBackgroundMode = false;
let networkBlockerInstalled = false;
let isGameRunning = false;


const onlinePatchInFlight = new Set<string>();

const onlinePatchKey = (gameDir: string, version: GameVersion) =>
  `${gameDir}::${version.type}::${version.build_index}`;

const destroyTray = () => {
  if (!tray) return;
  try {
    tray.destroy();
  } catch (err) {
    logger.error("An error occurred while destroying tray", err);
  }
  tray = null;
};

const installBackgroundNetworkBlocker = (w: BrowserWindow) => {
  if (networkBlockerInstalled) return;
  networkBlockerInstalled = true;

  const ses = w.webContents.session;
  ses.webRequest.onBeforeRequest((details, callback) => {
    
    if (VITE_DEV_SERVER_URL) return callback({ cancel: false });

    if (!isBackgroundMode) return callback({ cancel: false });

    const url = details.url || "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return callback({ cancel: true });
    }

    return callback({ cancel: false });
  });
};

function resolveAppIcon() {
  const iconFile = path.join(
    process.env.APP_ROOT,
    "build",
    process.platform === "win32" ? "icon.ico" : "icon.png",
  );

  return nativeImage.createFromPath(iconFile);
}

const restoreFromBackground = () => {
  if (!win) return;

  isBackgroundMode = false;

  try {
    if (win.isMinimized()) win.restore();
  } catch {
    
  }

  win.webContents.setBackgroundThrottling(false);
  win.setSkipTaskbar(false);
  win.show();
  win.focus();

  
};

const ensureTray = () => {
  if (tray) return tray;
  if (trayUnavailable) return null;

  const icon = resolveAppIcon();
  
  const trayIcon = icon ?? nativeImage.createEmpty();

  try {
    tray = new Tray(trayIcon);
    tray.setToolTip("LittleGods Launcher");
  } catch (e) {
    trayUnavailable = true;
    tray = null;
    console.warn("Tray not available on this system:", e);
    return null;
  }

  const menu = Menu.buildFromTemplate([
    {
      label: "Show LittleGods Launcher",
      click: () => restoreFromBackground(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", () => restoreFromBackground());

  return tray;
};

const moveToBackground = () => {
  if (!win) return;

  isBackgroundMode = true;

  const t = ensureTray();
  if (t) {
    
    win.setSkipTaskbar(true);
    win.hide();
  } else {
    
    
    win.setSkipTaskbar(false);
    win.minimize();
  }

  
  win.webContents.setBackgroundThrottling(true);

  
  
};

function createWindow() {
  const icon = resolveAppIcon();

  win = new BrowserWindow({
    width: 1026,
    height: 640,
    frame: false,
    titleBarStyle: "hidden",
    resizable: false,
    backgroundColor: "#00000000",
    icon: icon ?? undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  installBackgroundNetworkBlocker(win);

  
  
  
  win.on("close", (e) => {
    if (isQuitting) return;

    if (isGameRunning) {
      e.preventDefault();
      moveToBackground();
      return;
    }

    
    if (process.platform === "darwin") {
      isQuitting = true;
      app.quit();
    }
  });

  win.on("focus", () => win?.webContents.send("window-focus"));
  win.on("blur", () => win?.webContents.send("window-blur"));
  win.on("minimize", () => win?.webContents.send("window-minimize"));
  win.on("restore", () => win?.webContents.send("window-restore"));
  win.on("hide", () => win?.webContents.send("window-hide"));
  win.on("show", () => win?.webContents.send("window-show"));

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.whenReady().then(() => {
  protocol.handle("media", async (request) => {
    try {
      const url = request.url.slice(8); 
      const urlPath = decodeURIComponent(url);

      
      
      if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
        logger.info(`[MediaProtocol] Proxying remote: ${urlPath}`);
        const remoteResponse = await fetch(urlPath, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!remoteResponse.ok) {
          logger.error(`[MediaProtocol] Remote fetch failed (${remoteResponse.status}): ${urlPath}`);
          return new Response("Failed to fetch remote media", { status: remoteResponse.status });
        }

        const data = await remoteResponse.arrayBuffer();
        const contentType = remoteResponse.headers.get("Content-Type") || "application/octet-stream";

        return new Response(data, {
          headers: { "Content-Type": contentType }
        });
      }

      
      const normalizedPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      const appRoot = process.env.APP_ROOT || app.getAppPath();
      const filePath = path.isAbsolute(urlPath) && fs.existsSync(urlPath)
        ? urlPath
        : path.join(appRoot, normalizedPath);

      logger.info(`[MediaProtocol] Requesting local: ${request.url} -> Resolved: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        logger.error(`[MediaProtocol] File not found: ${filePath}`);
        return new Response('File not found', { status: 404 });
      }

      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      return new Response(data as any, {
        headers: { 'Content-Type': mimeType }
      });
    } catch (error) {
      logger.error('Failed to load media file:', error);
      return new Response('Internal error', { status: 500 });
    }
  });

  createWindow();

  if (!VITE_DEV_SERVER_URL) {
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("minimize-window", () => {
  win?.minimize();
});
ipcMain.on("close-window", () => {
  win?.close();
});

ipcMain.on("ready", (_, { enableRPC }) => {
  if (enableRPC) {
    connectRPC();
    try {
      setChoosingVersionActivity();
    } catch {
      
    }
  }
});
ipcMain.on("rpc:enable", (_, enable) => {
  if (enable) {
    connectRPC();
    try {
      setChoosingVersionActivity();
    } catch {
      
    }
  } else {
    disconnectRPC();
  }
});

ipcMain.handle(
  "online-patch:check",
  async (_, gameDir: string, version: GameVersion) => {
    return await checkOnlinePatchNeeded(gameDir, version);
  },
);

ipcMain.handle(
  "online-patch:state",
  async (_, gameDir: string, version: GameVersion) => {
    return getOnlinePatchState(gameDir, version);
  },
);

ipcMain.handle(
  "online-patch:health",
  async (_, gameDir: string, version: GameVersion) => {
    return await getOnlinePatchHealth(gameDir, version);
  },
);

ipcMain.handle("fetch:json", async (_, url: string, options?: any) => {
  try {
    logger.info(`Fetching JSON from: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); 

    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text();
      logger.error(`Fetch failed (${res.status}): ${errorText}`);
      return { _error: true, status: res.status, error: errorText };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.error("Request timeout:", url);
      return { _error: true, error: "Connection timeout - please check your internet connection" };
    }
    logger.error("Error fetching JSON:", err);
    return { _error: true, error: String(err) };
  }
});
ipcMain.handle("fetch:head", async (_, url, ...args) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); 

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      ...args
    });
    clearTimeout(timeout);

    return response.status;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.error("Request timeout (HEAD):", url);
    } else {
      logger.error("Error in fetch:head:", err);
    }
    return 0; 
  }
});

ipcMain.handle("get-default-game-directory", () => {
  try {
    if (process.platform === "linux") {
      const xdgBase =
        process.env["XDG_DATA_HOME"] &&
          path.isAbsolute(process.env["XDG_DATA_HOME"]!)
          ? process.env["XDG_DATA_HOME"]!
          : path.join(os.homedir(), ".local", "share");
      const newPath = path.join(xdgBase, "littlegods-launcher", "Hytale");
      const legacyPath = path.join(META_DIRECTORY, "Hytale");
      if (fs.existsSync(legacyPath) && !fs.existsSync(newPath))
        return legacyPath;
      return newPath;
    }
  } catch { }
  return path.join(META_DIRECTORY, "Hytale");
});

ipcMain.handle("open-folder", async (_, folderPath: string) => {
  try {
    if (typeof folderPath !== "string" || !folderPath) {
      throw new Error("Invalid folder path");
    }

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const normalizedPath =
      process.platform === "win32"
        ? folderPath.replace(/\
        : folderPath;

    const result = await shell.openPath(normalizedPath);
    
    return { ok: result === "", error: result || null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
});

ipcMain.handle("open-external", async (_, url: string) => {
  try {
    if (typeof url !== "string" || !url) {
      throw new Error("Invalid url");
    }

    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      throw new Error("Only https links are allowed");
    }

    const hostname = parsed.hostname.toLowerCase();
    const allowedHosts = new Set([
      "discord.com",
      "www.discord.com",
      "discord.gg",
      "www.discord.gg",
      "dsc.gg",
      "hytale.com",
      "www.hytale.com",
      "curseforge.com",
      "www.curseforge.com",
    ]);
    if (!allowedHosts.has(hostname)) {
      throw new Error("Blocked external link");
    }

    await shell.openExternal(parsed.toString());
    return { ok: true, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
});

ipcMain.handle(
  "check-game-installation",
  (_, baseDir: string, version: GameVersion) => {
    return checkGameInstallation(baseDir, version);
  },
);

ipcMain.handle(
  "get-installed-build",
  (_, baseDir: string, versionType: GameVersion["type"]) => {
    try {
      migrateLegacyChannelInstallIfNeeded(baseDir, versionType);

      if (versionType === "release") {
        const latestDir = getLatestDir(baseDir);
        const latest = readInstallManifest(latestDir);
        if (latest?.build_index) return latest.build_index;
      }

      const channelDir =
        versionType === "release"
          ? getReleaseChannelDir(baseDir)
          : getPreReleaseChannelDir(baseDir);
      if (!fs.existsSync(channelDir)) return null;

      const builds = fs
        .readdirSync(channelDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^build-\d+$/.test(d.name))
        .map((d) => Number(d.name.replace("build-", "")))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);

      if (!builds.length) return null;
      const idx = builds[builds.length - 1];
      const installDir =
        versionType === "release"
          ? getReleaseBuildDir(baseDir, idx)
          : getPreReleaseBuildDir(baseDir, idx);
      const manifest = readInstallManifest(installDir);
      return manifest?.build_index ?? idx;
    } catch {
      return null;
    }
  },
);

ipcMain.handle("list-installed-versions", (_, baseDir: string) => {
  return listInstalledVersions(baseDir);
});


const getHytaleUserDataDir = () => {
  const base = app.getPath("userData");

  
  const metaPath = path.join(base, "meta", "Hytale", "UserData");
  if (fs.existsSync(metaPath)) return metaPath;

  
  if (process.platform === "linux") {
    const xdgBase = process.env["XDG_DATA_HOME"] && path.isAbsolute(process.env["XDG_DATA_HOME"]!)
      ? process.env["XDG_DATA_HOME"]!
      : path.join(os.homedir(), ".local", "share");
    const localSharePath = path.join(xdgBase, "littlegods-launcher", "Hytale", "UserData");
    if (fs.existsSync(localSharePath)) return localSharePath;
  }

  
  return metaPath;
};

ipcMain.handle("servers:list", async () => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const serverListPath = path.join(userDataDir, "ServerList.json");

    if (!fs.existsSync(serverListPath)) return [];

    const raw = await fs.promises.readFile(serverListPath, "utf-8");
    const data = JSON.parse(raw);
    const servers = data.SavedServers || [];

    
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let needsHeal = false;

    const healedServers = servers.map((s: any) => {
      if (!s.Id || !guidRegex.test(s.Id)) {
        logger.warn(`Found malformed server ID: "${s.Id}". Healing it with a new GUID.`);
        needsHeal = true;
        return { ...s, Id: crypto.randomUUID() };
      }
      return s;
    });

    if (needsHeal) {
      const updatedData = { SavedServers: healedServers };
      await fs.promises.writeFile(serverListPath, JSON.stringify(updatedData, null, 2), "utf-8");
      logger.info("ServerList.json healed and saved.");
    }

    return healedServers;
  } catch (err) {
    logger.error("Failed to read ServerList.json", err);
    return [];
  }
});

ipcMain.handle("servers:save", async (_, servers: any[]) => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const serverListPath = path.join(userDataDir, "ServerList.json");

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    const data = { SavedServers: servers };
    await fs.promises.writeFile(serverListPath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    logger.error("Failed to save ServerList.json", err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("game-settings:get", async () => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const settingsPath = path.join(userDataDir, "Settings.json");
    if (!fs.existsSync(settingsPath)) return null;

    const raw = await fs.promises.readFile(settingsPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    logger.error("Failed to read Settings.json", err);
    return null;
  }
});

ipcMain.handle("game-settings:save", async (_, data: any) => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const settingsPath = path.join(userDataDir, "Settings.json");
    await fs.promises.writeFile(settingsPath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    logger.error("Failed to save Settings.json", err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("saves:list", async () => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const savesPath = path.join(userDataDir, "Saves");

    if (!fs.existsSync(savesPath)) return [];

    const dirs = fs.readdirSync(savesPath).filter(f => fs.statSync(path.join(savesPath, f)).isDirectory());
    return dirs.map(name => ({
      name,
      path: path.join(savesPath, name)
    }));
  } catch (err) {
    logger.error("Failed to list saves", err);
    return [];
  }
});

ipcMain.handle("saves:read-config", async (_, saveName: string) => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const configPath = path.join(userDataDir, "Saves", saveName, "config.json");

    if (!fs.existsSync(configPath)) return { mods: [] };

    const raw = await fs.promises.readFile(configPath, "utf-8");
    const data = JSON.parse(raw);
    const enabledMods = Object.entries(data.Mods || {})
      .filter(([_, val]: [string, any]) => val.Enabled === true)
      .map(([key, _]) => key);

    return { mods: enabledMods };
  } catch (err) {
    logger.error(`Failed to read config.json for save ${saveName}`, err);
    return { mods: [] };
  }
});

ipcMain.handle("saves:save-config", async (_, saveName: string, config: { mods: string[] }) => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const configPath = path.join(userDataDir, "Saves", saveName, "config.json");

    const newConfig: any = { Mods: {} };
    config.mods.forEach(modName => {
      newConfig.Mods[modName] = { Enabled: true };
    });

    await fs.promises.writeFile(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    logger.error(`Failed to save config.json for save ${saveName}`, err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("saves:read-warps", async (_, saveName: string) => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const warpsPath = path.join(userDataDir, "Saves", saveName, "universe", "warps.json");

    if (!fs.existsSync(warpsPath)) return [];

    const raw = await fs.promises.readFile(warpsPath, "utf-8");
    const data = JSON.parse(raw);
    const warps = (data.Warps || []).map((w: any) => ({
      name: w.Id || "Unknown",
      x: w.X || 0,
      y: w.Y || 0,
      z: w.Z || 0
    }));
    return warps;
  } catch (err) {
    logger.error(`Failed to read warps.json for save ${saveName}`, err);
    return [];
  }
});

ipcMain.handle("mods:list-available-to-saves", async () => {
  try {
    const userDataDir = getHytaleUserDataDir();
    const modsPath = path.join(userDataDir, "Mods");

    if (!fs.existsSync(modsPath)) return [];

    const files = await fs.promises.readdir(modsPath);
    
    
    return files.filter(f => f.endsWith(".jar") || f.endsWith(".zip"));
  } catch (err) {
    logger.error("Failed to list available mods", err);
    return [];
  }
});

ipcMain.handle("mods:list-installed", (_, baseDir: string) => {
  return listInstalledMods(baseDir);
});

ipcMain.handle("mods:download", async (e, baseDir: string, mod: ModInfo) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return { success: false, error: "Window not found" };
  return await downloadMod(baseDir, mod, win);
});

ipcMain.handle("news:get", async () => {
  return await getHytaleNews();
});

ipcMain.handle("news:get-body", async (_, slug: string) => {
  return await getHytaleNewsBody(slug);
});

ipcMain.handle("news:translate", async (_, text: string, targetLang: string, isHtml = false) => {
  try {
    const url = `https://translate.googleapis.com/translate_a/t?client=gtx&sl=en&tl=${targetLang}&v=1.0${isHtml ? '&format=html' : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `q=${encodeURIComponent(text)}`
    });
    if (!res.ok) {
      logger.error(`[Translate] HTTP Error: ${res.status}`);
      return text;
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : text;
  } catch (err) {
    logger.error("[Translate] Failed:", err);
    return text;
  }
});

ipcMain.handle(
  "mods:toggle",
  (_, baseDir: string, modId: string, enabled: boolean) => {
    return toggleMod(baseDir, modId, enabled);
  },
);

ipcMain.handle("mods:uninstall", (_, baseDir: string, modId: string) => {
  return uninstallMod(baseDir, modId);
});



ipcMain.handle(
  "delete-installed-version",
  (_, baseDir: string, info: InstalledBuildInfo) => {
    try {
      deleteInstalledVersion(baseDir, info);
      return { success: true };
    } catch (e) {
      logger.error("Failed to delete version", e);
    }
  },
);

ipcMain.handle("uuid:gen-v5", (_, username: string) => {
  return genUUID(username);
});

ipcMain.handle("nix:check", () => {
  return checkNixInstalled();
});

ipcMain.handle("nix:install", async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return false;
  return await installNix(win);
});

ipcMain.handle("nix:uninstall", async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return false;
  return await uninstallNix(win);
});



ipcMain.on("install-game", (e, gameDir: string, version: GameVersion) => {
  if (!fs.existsSync(gameDir)) {
    fs.mkdirSync(gameDir, { recursive: true });
  }

  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) {
    installGame(gameDir, version, win);
  }
});

ipcMain.on(
  "cancel-build-download",
  (e, gameDir: string, version: GameVersion) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;

    
    const ok = cancelBuildDownload(gameDir, version);
    if (!ok) {
      
      win.webContents.send("install-cancel-not-possible");
    }
  },
);

ipcMain.on(
  "launch-game",
  (
    e,
    gameDir: string,
    version: GameVersion,
    username: string,
    customUUID?: string | null,
    options?: { linuxForcePipeWire: boolean; linuxUseNixShell: boolean },
  ) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) {
      
      if (backgroundTimeout) {
        clearTimeout(backgroundTimeout);
        backgroundTimeout = null;
      }

      launchGame(gameDir, version, username, win, 0, customUUID ?? null, {
        onGameSpawned: () => {
          logger.info(`Game spawned: ${version.type} ${version.build_name}`);
          isGameRunning = true;
          try {
            setPlayingActivity(version);
          } catch {
            
          }

          
          
          backgroundTimeout = setTimeout(() => {
            moveToBackground();
            backgroundTimeout = null;
          }, 3000);
        },
        onGameExited: () => {
          isGameRunning = false;
          if (backgroundTimeout) {
            clearTimeout(backgroundTimeout);
            backgroundTimeout = null;
          }
          restoreFromBackground();

          
          destroyTray();

          try {
            setChoosingVersionActivity();
          } catch {
            
          }
        },
      }, options);
    }
  },
);

ipcMain.on(
  "online-patch:enable",
  async (e, gameDir: string, version: GameVersion) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;

    const key = onlinePatchKey(gameDir, version);
    if (onlinePatchInFlight.has(key)) {
      win.webContents.send(
        "online-patch-error",
        "Patch operation already in progress. Please wait.",
      );
      return;
    }
    onlinePatchInFlight.add(key);

    
    win.webContents.send("online-patch-progress", {
      phase: "online-patch",
      percent: -1,
    });

    try {
      const result = await enableOnlinePatch(
        gameDir,
        version,
        win,
        "online-patch-progress",
      );
      win.webContents.send("online-patch-finished", result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      win.webContents.send("online-patch-error", msg);
    } finally {
      onlinePatchInFlight.delete(key);
    }
  },
);

ipcMain.on(
  "online-patch:disable",
  async (e, gameDir: string, version: GameVersion) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;

    const key = onlinePatchKey(gameDir, version);
    if (onlinePatchInFlight.has(key)) {
      win.webContents.send(
        "online-unpatch-error",
        "Patch operation already in progress. Please wait.",
      );
      return;
    }
    onlinePatchInFlight.add(key);

    win.webContents.send("online-unpatch-progress", {
      phase: "online-unpatch",
      percent: -1,
    });

    try {
      const result = await disableOnlinePatch(
        gameDir,
        version,
        win,
        "online-unpatch-progress",
      );
      win.webContents.send("online-unpatch-finished", result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      win.webContents.send("online-unpatch-error", msg);
    } finally {
      onlinePatchInFlight.delete(key);
    }
  },
);

ipcMain.handle("screenshots:select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle("screenshots:list", async (_, folderPath: string) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return [];
    }

    const files = fs.readdirSync(folderPath);
    const images = files
      .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
      .map((file) => {
        const fullPath = path.join(folderPath, file);
        const stats = fs.statSync(fullPath);
        const data = fs.readFileSync(fullPath);
        const base64 = data.toString('base64');
        const ext = path.extname(file).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp';

        return {
          name: file,
          url: `data:${mimeType};base64,${base64}`,
          ctime: stats.ctimeMs,
        };
      })
      .sort((a, b) => b.ctime - a.ctime);

    return images;
  } catch (err) {
    logger.error("Failed to list screenshots", err);
    return [];
  }
});

ipcMain.handle("screenshots:open-folder", async (_, folderPath: string) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
  }
});

ipcMain.on(
  "online-patch:fix-client",
  async (e, gameDir: string, version: GameVersion) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;

    const key = onlinePatchKey(gameDir, version);
    if (onlinePatchInFlight.has(key)) {
      win.webContents.send(
        "online-unpatch-error",
        "Patch operation already in progress. Please wait.",
      );
      return;
    }
    onlinePatchInFlight.add(key);

    win.webContents.send("online-unpatch-progress", {
      phase: "online-unpatch",
      percent: -1,
    });

    try {
      const result = await fixClientToUnpatched(
        gameDir,
        version,
        win,
        "online-unpatch-progress",
      );
      win.webContents.send("online-unpatch-finished", result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      win.webContents.send("online-unpatch-error", msg);
    } finally {
      onlinePatchInFlight.delete(key);
    }
  },
);

ipcMain.handle("music:list-files", async () => {
  try {
    const appRoot = process.env.APP_ROOT || app.getAppPath();
    const musicDir = path.join(appRoot, "raw", "music");
    if (!fs.existsSync(musicDir)) return [];

    const files = await fs.promises.readdir(musicDir);
    return files.filter(f => /\.(mp3|ogg|wav)$/i.test(f));
  } catch (err) {
    logger.error("Failed to list music files", err);
    return [];
  }
});

