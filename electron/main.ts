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
import { autoUpdater } from "electron-updater";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
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
import { getHytaleNews } from "./utils/news";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");


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

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.whenReady().then(() => {
  protocol.handle("media", async (request) => {
    try {
      
      const filePath = decodeURIComponent(request.url.slice(8)); 

      
      const data = await fs.promises.readFile(filePath);

      
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      return new Response(data as any, {
        headers: { 'Content-Type': mimeType }
      });
    } catch (error) {
      logger.error('Failed to load media file:', error);
      return new Response('File not found', { status: 404 });
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



autoUpdater.on("checking-for-update", () => {
  win?.webContents.send("updater:status", { phase: "checking" });
});

autoUpdater.on("update-available", (info) => {
  win?.webContents.send("updater:status", { phase: "available", info });
});

autoUpdater.on("update-not-available", () => {
  win?.webContents.send("updater:status", { phase: "not-available" });
});

autoUpdater.on("error", (err) => {
  win?.webContents.send("updater:status", { phase: "error", error: err.message });
});

autoUpdater.on("download-progress", (progressObj) => {
  win?.webContents.send("updater:status", {
    phase: "downloading",
    percent: progressObj.percent,
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total
  });
});

autoUpdater.on("update-downloaded", () => {
  win?.webContents.send("updater:status", { phase: "downloaded" });
});

ipcMain.on("updater:check", () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on("updater:quit-and-install", () => {
  autoUpdater.quitAndInstall();
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
