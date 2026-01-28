import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import stream from "node:stream";
import { promisify } from "util";
import { BrowserWindow } from "electron";
import {
  migrateLegacyChannelInstallIfNeeded,
  resolveClientPath,
  resolveExistingInstallDir,
  resolveServerPath,
} from "./paths";

const pipeline = promisify(stream.pipeline);

const FETCH_TIMEOUT_MS = 45_000;

type AggregateProgress = {
  total?: number;
  current: number;
};

const PATCH_ROOT_DIRNAME = ".littlegods-online-patch";
const PATCH_STATE_FILENAME = "state.json";

const normalizeHash = (h: string) => h.trim().toUpperCase();

const withCacheBuster = (url: string, cacheKey: string) => {
  try {
    const u = new URL(url);
    u.searchParams.set("cb", cacheKey);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}cb=${encodeURIComponent(cacheKey)}`;
  }
};

const headContentLength = async (url: string): Promise<number | undefined> => {
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    if (!res.ok) return undefined;
    const contentLength = res.headers.get("content-length");
    if (!contentLength) return undefined;
    const n = parseInt(contentLength, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
};

const sha256File = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const input = fs.createReadStream(filePath);
    input.on("error", reject);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("end", () => resolve(hash.digest("hex")));
  });
};

const getClientPath = (gameDir: string, version: GameVersion) => {
  migrateLegacyChannelInstallIfNeeded(gameDir, version.type);
  const installDir = resolveExistingInstallDir(gameDir, version);
  return resolveClientPath(installDir);
};

const getPatchPaths = (clientPath: string) => {
  const clientDir = path.dirname(clientPath);
  const exeName = path.basename(clientPath);

  const root = path.join(clientDir, PATCH_ROOT_DIRNAME);
  const originalDir = path.join(root, "original");
  const patchedDir = path.join(root, "patched");

  const originalPath = path.join(originalDir, exeName);
  const patchedPath = path.join(patchedDir, exeName);
  const statePath = path.join(root, PATCH_STATE_FILENAME);
  const tempDownloadPath = path.join(
    root,
    `temp_patch_download_${Date.now()}_${exeName}`,
  );

  return {
    root,
    originalDir,
    patchedDir,
    originalPath,
    patchedPath,
    statePath,
    tempDownloadPath,
  };
};

const ensureDirs = (dirs: string[]) => {
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
};

const moveReplace = (from: string, to: string) => {
  ensureDirs([path.dirname(to)]);

  try {
    if (fs.existsSync(to)) fs.unlinkSync(to);
  } catch {
    
  }

  try {
    fs.renameSync(from, to);
    return;
  } catch {
    
    fs.copyFileSync(from, to);
    try {
      fs.unlinkSync(from);
    } catch {
      
    }
  }
};

const unlinkIfExists = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    
  }
};

const copyReplace = (from: string, to: string) => {
  ensureDirs([path.dirname(to)]);
  unlinkIfExists(to);
  fs.copyFileSync(from, to);
};

type PatchStateFile = {
  enabled: boolean;
  patch_hash?: string;
  patch_url?: string;
  original_url?: string;
  patch_note?: string;
  updatedAt: number;
};

const readPatchState = (statePath: string): PatchStateFile | null => {
  try {
    if (!fs.existsSync(statePath)) return null;
    const raw = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.enabled !== "boolean") return null;
    return parsed as PatchStateFile;
  } catch {
    return null;
  }
};

const writePatchState = (statePath: string, next: PatchStateFile) => {
  try {
    ensureDirs([path.dirname(statePath)]);
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2), "utf8");
  } catch {
    
  }
};

const downloadFileWithProgress = async (
  url: string,
  outPath: string,
  win: BrowserWindow,
  progressChannel:
    | "install-progress"
    | "online-patch-progress"
    | "online-unpatch-progress",
  phase: "online-patch" | "online-unpatch" = "online-patch",
  aggregate?: AggregateProgress,
) => {
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(url, { signal: controller.signal }).finally(
    () => {
      clearTimeout(timeout);
    },
  );

  if (!response.ok)
    throw new Error(`Failed to download file (${response.status})`);
  if (!response.body) throw new Error("No response body");

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    contentType.includes("text/html") ||
    contentType.includes("application/xhtml+xml")
  ) {
    let snippet = "";
    try {
      snippet = (await response.clone().text()).slice(0, 200);
    } catch {
      
    }

    throw new Error(
      `Download returned HTML instead of a binary. This usually means a CDN cache or error page was served. URL: ${url}` +
      (snippet ? ` (starts with: ${JSON.stringify(snippet)})` : ""),
    );
  }

  const contentLength = response.headers.get("content-length");
  const fileTotalLength = contentLength ? parseInt(contentLength, 10) : 0;
  const totalLength =
    typeof aggregate?.total === "number" && aggregate.total > 0
      ? aggregate.total
      : fileTotalLength;
  let downloadedLength = 0;

  const progressStream = new stream.PassThrough();
  progressStream.on("data", (chunk) => {
    downloadedLength += chunk.length;

    if (aggregate) aggregate.current += chunk.length;

    const percent =
      totalLength > 0
        ? Math.round(
          ((aggregate ? aggregate.current : downloadedLength) / totalLength) *
          100,
        )
        : -1;

    win.webContents.send(progressChannel, {
      phase,
      percent,
      total: totalLength > 0 ? totalLength : undefined,
      current: aggregate ? aggregate.current : downloadedLength,
    });
  });

  
  win.webContents.send(progressChannel, {
    phase,
    percent: totalLength > 0 ? 0 : -1,
    total: totalLength > 0 ? totalLength : undefined,
    current: aggregate ? aggregate.current : 0,
  });

  await pipeline(
    
    stream.Readable.fromWeb(response.body),
    progressStream,
    fs.createWriteStream(outPath),
  );

  const finalPercent =
    totalLength > 0
      ? Math.round(
        ((aggregate ? aggregate.current : downloadedLength) / totalLength) *
        100,
      )
      : -1;
  win.webContents.send(progressChannel, {
    phase,
    percent: aggregate ? finalPercent : 100,
    total: totalLength > 0 ? totalLength : undefined,
    current: aggregate ? aggregate.current : downloadedLength,
  });
};



export const getClientPatchState = (
  gameDir: string,
  version: GameVersion,
): {
  supported: boolean;
  available: boolean;
  enabled: boolean;
  downloaded: boolean;
} => {
  const supported =
    process.platform === "win32" ||
    process.platform === "linux" ||
    process.platform === "darwin";
  const available = !!(version.patch_url && version.patch_hash);
  if (!supported || !available)
    return { supported, available, enabled: false, downloaded: false };

  const clientPath = getClientPath(gameDir, version);
  if (!fs.existsSync(clientPath))
    return { supported, available, enabled: false, downloaded: false };

  const { statePath, patchedPath, originalPath } = getPatchPaths(clientPath);
  const state = readPatchState(statePath);

  
  let clientIsPatched = false;
  try {
    const currentHash = crypto.createHash("sha256");
    const input = fs.createReadStream(clientPath);
    input.on("data", (chunk) => currentHash.update(chunk));
    
    
    input.on("error", () => undefined);
    
    clientIsPatched = false;
  } catch {
    clientIsPatched = false;
  }

  
  
  let enabled = !!state?.enabled;
  if (!enabled && clientIsPatched && fs.existsSync(patchedPath)) {
    enabled = true;
    writePatchState(statePath, {
      enabled: true,
      patch_hash: version.patch_hash,
      patch_url: version.patch_url,
      original_url: version.original_url ?? state?.original_url,
      patch_note: version.patch_note,
      updatedAt: Date.now(),
    });
  }

  
  if (!state && clientIsPatched) enabled = true;

  
  void originalPath;

  return {
    supported,
    available,
    enabled,
    downloaded: fs.existsSync(patchedPath),
  };
};

export const getClientPatchHealth = async (
  gameDir: string,
  version: GameVersion,
): Promise<{
  supported: boolean;
  available: boolean;
  enabled: boolean;
  clientIsPatched: boolean;
  needsFixClient: boolean;
  patchOutdated: boolean;
}> => {
  const supported =
    process.platform === "win32" ||
    process.platform === "linux" ||
    process.platform === "darwin";
  const available = !!(version.patch_url && version.patch_hash);
  if (!supported || !available) {
    return {
      supported,
      available,
      enabled: false,
      clientIsPatched: false,
      needsFixClient: false,
      patchOutdated: false,
    };
  }

  const clientPath = getClientPath(gameDir, version);
  if (!fs.existsSync(clientPath)) {
    return {
      supported,
      available,
      enabled: false,
      clientIsPatched: false,
      needsFixClient: false,
      patchOutdated: false,
    };
  }

  const { statePath, patchedPath } = getPatchPaths(clientPath);
  const state = readPatchState(statePath);

  
  let enabled = typeof state?.enabled === "boolean" ? state.enabled : false;

  const detectHash = state?.patch_hash || version.patch_hash;
  let clientIsPatched = false;
  try {
    const currentHash = await sha256File(clientPath);
    clientIsPatched =
      !!detectHash && normalizeHash(currentHash) === normalizeHash(detectHash);
  } catch {
    clientIsPatched = false;
  }

  
  if (!enabled && clientIsPatched && fs.existsSync(patchedPath)) {
    enabled = true;
    writePatchState(statePath, {
      enabled: true,
      patch_hash: detectHash ?? version.patch_hash,
      patch_url: version.patch_url,
      original_url: version.original_url ?? state?.original_url,
      patch_note: version.patch_note,
      updatedAt: Date.now(),
    });
  }

  
  if (!state && clientIsPatched) enabled = true;

  
  const needsFixClient = state?.enabled === false && clientIsPatched;

  const patchOutdated =
    !!enabled &&
    !!state?.patch_hash &&
    !!version.patch_hash &&
    normalizeHash(state.patch_hash) !== normalizeHash(version.patch_hash);

  return {
    supported,
    available,
    enabled,
    clientIsPatched,
    needsFixClient,
    patchOutdated,
  };
};

export const fixClientToUnpatched = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel: "online-unpatch-progress" = "online-unpatch-progress",
): Promise<"fixed" | "not-needed" | "skipped"> => {
  const expectedPatchHash = version.patch_hash;
  if (!expectedPatchHash) return "skipped";

  const clientPath = getClientPath(gameDir, version);
  if (!fs.existsSync(clientPath)) return "skipped";

  
  try {
    const currentHash = await sha256File(clientPath);
    const isPatchedNow =
      normalizeHash(currentHash) === normalizeHash(expectedPatchHash);
    if (!isPatchedNow) return "not-needed";
  } catch {
    return "skipped";
  }

  const originalUrl = version.original_url;
  if (!originalUrl) {
    throw new Error("Missing original_url for this build. Cannot fix client.");
  }

  const paths = getPatchPaths(clientPath);
  ensureDirs([paths.root, paths.originalDir, paths.patchedDir]);

  
  const tempOriginal = path.join(
    paths.root,
    `temp_original_${Date.now()}_${path.basename(clientPath)}`,
  );
  await downloadFileWithProgress(
    withCacheBuster(originalUrl, `orig-${Date.now()}`),
    tempOriginal,
    win,
    progressChannel,
    "online-unpatch",
  );

  
  const downloadedHash = await sha256File(tempOriginal);
  if (normalizeHash(downloadedHash) === normalizeHash(expectedPatchHash)) {
    unlinkIfExists(tempOriginal);
    throw new Error(
      "Original download matches patch hash; refusing to fix client.",
    );
  }

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: -1,
  });

  
  
  
  
  const tempCurrent = path.join(
    paths.root,
    `temp_current_${Date.now()}_${path.basename(clientPath)}`,
  );
  moveReplace(clientPath, tempCurrent);

  
  if (!fs.existsSync(paths.patchedPath)) {
    copyReplace(tempCurrent, paths.patchedPath);
  }

  
  if (!fs.existsSync(paths.originalPath)) {
    copyReplace(tempOriginal, paths.originalPath);
  }

  moveReplace(tempOriginal, clientPath);
  unlinkIfExists(tempCurrent);

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: 100,
  });

  writePatchState(paths.statePath, {
    enabled: false,
    patch_hash: expectedPatchHash,
    patch_url: version.patch_url,
    original_url: originalUrl,
    patch_note: version.patch_note,
    updatedAt: Date.now(),
  });

  return "fixed";
};

export const enableClientPatch = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel:
    | "install-progress"
    | "online-patch-progress" = "online-patch-progress",
  aggregate?: AggregateProgress,
): Promise<"enabled" | "already-enabled" | "skipped"> => {
  const url = version.patch_url;
  const expectedHash = version.patch_hash;
  if (!url || !expectedHash) return "skipped";

  const clientPath = getClientPath(gameDir, version);
  if (!fs.existsSync(clientPath)) return "skipped";

  const paths = getPatchPaths(clientPath);
  ensureDirs([paths.root, paths.originalDir, paths.patchedDir]);

  const existing = readPatchState(paths.statePath);

  
  if (existing?.enabled) {
    try {
      const currentHash = await sha256File(clientPath);
      if (normalizeHash(currentHash) === normalizeHash(expectedHash))
        return "already-enabled";
    } catch {
      
    }
    
  }

  
  let patchedOk = false;
  if (fs.existsSync(paths.patchedPath)) {
    
    if (
      existing?.patch_hash &&
      normalizeHash(existing.patch_hash) !== normalizeHash(expectedHash)
    ) {
      patchedOk = false;
    } else {
      try {
        const cachedHash = await sha256File(paths.patchedPath);
        patchedOk = normalizeHash(cachedHash) === normalizeHash(expectedHash);
      } catch {
        patchedOk = false;
      }
    }
  }

  if (!patchedOk) {
    try {
      if (fs.existsSync(paths.patchedPath)) fs.unlinkSync(paths.patchedPath);
    } catch {
      
    }

    await downloadFileWithProgress(
      withCacheBuster(url, `patch-${normalizeHash(expectedHash)}`),
      paths.tempDownloadPath,
      win,
      progressChannel,
      "online-patch",
      aggregate,
    );

    const downloadedHash = await sha256File(paths.tempDownloadPath);
    const got = normalizeHash(downloadedHash);
    const expected = normalizeHash(expectedHash);
    if (got !== expected) {
      try {
        fs.unlinkSync(paths.tempDownloadPath);
      } catch {
        
      }
      throw new Error(
        `Patch hash mismatch (SHA256). Expected ${expected}, got ${got}.`,
      );
    }

    moveReplace(paths.tempDownloadPath, paths.patchedPath);
  }

  
  
  
  
  win.webContents.send(progressChannel, { phase: "online-patch", percent: -1 });

  
  if (!fs.existsSync(paths.originalPath)) {
    
    
    let currentIsPatched = false;
    try {
      const currentHash = await sha256File(clientPath);
      currentIsPatched =
        normalizeHash(currentHash) === normalizeHash(expectedHash);
    } catch {
      currentIsPatched = false;
    }

    if (currentIsPatched) {
      const originalUrl = version.original_url || existing?.original_url;
      if (!originalUrl) {
        throw new Error(
          "Cannot preserve original: client is already patched and original_url is missing.",
        );
      }

      const tempOriginal = path.join(
        paths.root,
        `temp_original_${Date.now()}_${path.basename(clientPath)}`,
      );
      await downloadFileWithProgress(
        withCacheBuster(originalUrl, `orig-${Date.now()}`),
        tempOriginal,
        win,
        progressChannel,
        "online-patch",
        aggregate,
      );

      const downloadedHash = await sha256File(tempOriginal);
      if (normalizeHash(downloadedHash) === normalizeHash(expectedHash)) {
        unlinkIfExists(tempOriginal);
        throw new Error(
          "Original download matches patch hash; refusing to preserve.",
        );
      }

      moveReplace(tempOriginal, paths.originalPath);
    } else {
      moveReplace(clientPath, paths.originalPath);
    }
  } else {
    
    const tempCurrent = path.join(
      paths.root,
      `temp_current_${Date.now()}_${path.basename(clientPath)}`,
    );
    moveReplace(clientPath, tempCurrent);
    unlinkIfExists(tempCurrent);
  }

  copyReplace(paths.patchedPath, clientPath);
  win.webContents.send(progressChannel, {
    phase: "online-patch",
    percent: 100,
  });

  writePatchState(paths.statePath, {
    enabled: true,
    patch_hash: expectedHash,
    patch_url: url,
    original_url: version.original_url,
    patch_note: version.patch_note,
    updatedAt: Date.now(),
  });

  return "enabled";
};

export const disableClientPatch = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel: "online-unpatch-progress" = "online-unpatch-progress",
): Promise<"disabled" | "already-disabled" | "skipped"> => {
  const url = version.patch_url;
  const expectedHash = version.patch_hash;
  if (!url || !expectedHash) return "skipped";

  const clientPath = getClientPath(gameDir, version);
  if (!fs.existsSync(clientPath)) return "skipped";

  const paths = getPatchPaths(clientPath);
  ensureDirs([paths.root, paths.originalDir, paths.patchedDir]);

  const existing = readPatchState(paths.statePath);

  
  
  let clientIsPatched = false;
  try {
    const currentHash = await sha256File(clientPath);
    const storedHash = existing?.patch_hash;
    clientIsPatched =
      normalizeHash(currentHash) === normalizeHash(expectedHash) ||
      (!!storedHash &&
        normalizeHash(currentHash) === normalizeHash(storedHash));
  } catch {
    clientIsPatched = false;
  }

  if (!existing?.enabled && !clientIsPatched) return "already-disabled";

  if (!fs.existsSync(paths.originalPath)) {
    const originalUrl = version.original_url || existing?.original_url;
    if (!originalUrl) {
      throw new Error(
        "Original client backup not found. Reinstall the game to restore it.",
      );
    }

    
    const tempOriginal = path.join(
      paths.root,
      `temp_original_${Date.now()}_${path.basename(clientPath)}`,
    );
    await downloadFileWithProgress(
      withCacheBuster(originalUrl, `orig-${Date.now()}`),
      tempOriginal,
      win,
      progressChannel,
      "online-unpatch",
    );

    
    try {
      const downloadedHash = await sha256File(tempOriginal);
      if (normalizeHash(downloadedHash) === normalizeHash(expectedHash)) {
        unlinkIfExists(tempOriginal);
        throw new Error(
          "Original download matches patch hash; refusing to restore.",
        );
      }
    } catch (e) {
      if (e instanceof Error) throw e;
      
    }

    moveReplace(tempOriginal, paths.originalPath);
  }

  
  try {
    const originalHash = await sha256File(paths.originalPath);
    if (normalizeHash(originalHash) === normalizeHash(expectedHash)) {
      const originalUrl = version.original_url || existing?.original_url;
      if (!originalUrl) {
        throw new Error(
          "Original backup is invalid and original_url is missing.",
        );
      }

      const tempOriginal = path.join(
        paths.root,
        `temp_original_${Date.now()}_${path.basename(clientPath)}`,
      );
      await downloadFileWithProgress(
        withCacheBuster(originalUrl, `orig-${Date.now()}`),
        tempOriginal,
        win,
        progressChannel,
        "online-unpatch",
      );

      const downloadedHash = await sha256File(tempOriginal);
      if (normalizeHash(downloadedHash) === normalizeHash(expectedHash)) {
        unlinkIfExists(tempOriginal);
        throw new Error(
          "Original download matches patch hash; refusing to restore.",
        );
      }

      moveReplace(tempOriginal, paths.originalPath);
    }
  } catch (e) {
    if (e instanceof Error) throw e;
    
  }

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: -1,
  });

  
  
  
  
  const tempCurrent = path.join(
    paths.root,
    `temp_current_${Date.now()}_${path.basename(clientPath)}`,
  );
  moveReplace(clientPath, tempCurrent);
  copyReplace(tempCurrent, paths.patchedPath);
  copyReplace(paths.originalPath, clientPath);
  unlinkIfExists(tempCurrent);

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: 100,
  });

  writePatchState(paths.statePath, {
    enabled: false,
    patch_hash: expectedHash,
    patch_url: url,
    original_url: version.original_url || existing?.original_url,
    patch_note: version.patch_note,
    updatedAt: Date.now(),
  });

  
  try {
    const afterHash = await sha256File(clientPath);
    if (normalizeHash(afterHash) === normalizeHash(expectedHash)) {
      throw new Error(
        "Unpatch completed but client hash is still patched. Use Fix Client.",
      );
    }
  } catch (e) {
    if (e instanceof Error) throw e;
  }

  
  try {
    if (fs.existsSync(paths.root)) {
      fs.rmSync(paths.root, { recursive: true, force: true });
    }
  } catch (err) {
    
    console.warn("Failed to remove patch directory:", err);
  }

  return "disabled";
};

export const checkClientPatchNeeded = async (
  gameDir: string,
  version: GameVersion,
): Promise<"needs" | "up-to-date" | "skipped"> => {
  const expectedHash = version.patch_hash;
  if (!version.patch_url || !expectedHash) return "skipped";

  const clientPath = getClientPath(gameDir, version);
  if (!fs.existsSync(clientPath)) return "skipped";

  try {
    const currentHash = await sha256File(clientPath).catch(() => null);
    if (!currentHash) return "needs";
    if (normalizeHash(currentHash) === normalizeHash(expectedHash))
      return "up-to-date";
    return "needs";
  } catch {
    return "needs";
  }
};



const getServerPath = (gameDir: string, version: GameVersion) => {
  migrateLegacyChannelInstallIfNeeded(gameDir, version.type);
  const installDir = resolveExistingInstallDir(gameDir, version);
  return resolveServerPath(installDir);
};

export const getServerPatchState = (
  gameDir: string,
  version: GameVersion,
): {
  supported: boolean;
  available: boolean;
  enabled: boolean;
  downloaded: boolean;
} => {
  const supported =
    process.platform === "win32" ||
    process.platform === "linux" ||
    process.platform === "darwin";
  const available = !!(version.server_url && version.unserver_url);
  if (!supported || !available)
    return { supported, available, enabled: false, downloaded: false };

  const serverPath = getServerPath(gameDir, version);
  if (!fs.existsSync(serverPath))
    return { supported, available, enabled: false, downloaded: false };

  const { statePath, patchedPath, originalPath } = getPatchPaths(serverPath);
  const state = readPatchState(statePath);

  let enabled = !!state?.enabled;
  if (!enabled && fs.existsSync(patchedPath)) {
    enabled = true;
    writePatchState(statePath, {
      enabled: true,
      patch_hash: version.patch_hash ?? state?.patch_hash,
      patch_url: version.server_url,
      original_url: version.unserver_url ?? state?.original_url,
      patch_note: state?.patch_note,
      updatedAt: Date.now(),
    });
  }

  void originalPath;

  return {
    supported,
    available,
    enabled,
    downloaded: fs.existsSync(patchedPath),
  };
};

export const getServerPatchHealth = async (
  gameDir: string,
  version: GameVersion,
): Promise<{
  supported: boolean;
  available: boolean;
  enabled: boolean;
  serverIsPatched: boolean;
  needsFixServer: boolean;
}> => {
  const supported =
    process.platform === "win32" ||
    process.platform === "linux" ||
    process.platform === "darwin";
  const available = !!(version.server_url && version.unserver_url);
  if (!supported || !available) {
    return {
      supported,
      available,
      enabled: false,
      serverIsPatched: false,
      needsFixServer: false,
    };
  }

  const serverPath = getServerPath(gameDir, version);
  if (!fs.existsSync(serverPath)) {
    return {
      supported,
      available,
      enabled: false,
      serverIsPatched: false,
      needsFixServer: false,
    };
  }

  const { statePath, patchedPath } = getPatchPaths(serverPath);
  const state = readPatchState(statePath);

  let enabled = typeof state?.enabled === "boolean" ? state.enabled : false;

  
  let serverIsPatched = enabled;
  if (!enabled && fs.existsSync(patchedPath)) {
    enabled = true;
    serverIsPatched = true;
    writePatchState(statePath, {
      enabled: true,
      patch_hash: version.patch_hash ?? state?.patch_hash,
      patch_url: version.server_url,
      original_url: version.unserver_url ?? state?.original_url,
      patch_note: state?.patch_note,
      updatedAt: Date.now(),
    });
  }

  const needsFixServer = state?.enabled === false && serverIsPatched;

  return {
    supported,
    available,
    enabled,
    serverIsPatched,
    needsFixServer,
  };
};

export const fixServerToUnpatched = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel: "online-unpatch-progress" = "online-unpatch-progress",
): Promise<"fixed" | "not-needed" | "skipped"> => {
  
  const serverPath = getServerPath(gameDir, version);
  if (!fs.existsSync(serverPath)) return "skipped";

  
  const health = await getServerPatchHealth(gameDir, version);
  if (!health.needsFixServer) return "not-needed";

  const originalUrl = version.unserver_url;
  if (!originalUrl) {
    throw new Error(
      "Missing unserver_url (original) for this build. Cannot fix server.",
    );
  }

  const paths = getPatchPaths(serverPath);
  ensureDirs([paths.root, paths.originalDir, paths.patchedDir]);

  
  const tempOriginal = path.join(
    paths.root,
    `temp_original_fix_${Date.now()}_${path.basename(serverPath)}`,
  );

  await downloadFileWithProgress(
    withCacheBuster(originalUrl, `orig-fix-${Date.now()}`),
    tempOriginal,
    win,
    progressChannel,
    "online-unpatch",
  );

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: -1,
  });

  
  const tempCurrent = path.join(
    paths.root,
    `temp_current_broken_${Date.now()}_${path.basename(serverPath)}`,
  );

  moveReplace(serverPath, tempCurrent);

  
  
  
  if (!fs.existsSync(paths.originalPath)) {
    copyReplace(tempOriginal, paths.originalPath);
  }

  moveReplace(tempOriginal, serverPath);
  unlinkIfExists(tempCurrent);

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: 100,
  });

  
  writePatchState(paths.statePath, {
    enabled: false,
    patch_url: version.server_url,
    original_url: originalUrl,
    updatedAt: Date.now(),
  });

  return "fixed";
};

export const enableServerPatch = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel:
    | "install-progress"
    | "online-patch-progress" = "online-patch-progress",
  aggregate?: AggregateProgress,
): Promise<"enabled" | "already-enabled" | "skipped"> => {
  
  const url = version.server_url;
  const originalUrl = version.unserver_url;
  if (!url || !originalUrl) return "skipped";

  const serverPath = getServerPath(gameDir, version);
  if (!fs.existsSync(serverPath)) return "skipped";

  const paths = getPatchPaths(serverPath);
  ensureDirs([paths.root, paths.originalDir, paths.patchedDir]);

  const existing = readPatchState(paths.statePath);

  const expectedKey = version.patch_hash ? normalizeHash(version.patch_hash) : undefined;

  if (existing?.enabled) {
    
    
    if (!expectedKey) return "already-enabled";
    if (existing.patch_hash && normalizeHash(existing.patch_hash) === expectedKey)
      return "already-enabled";
    
  }

  
  let patchedOk = false;
  if (fs.existsSync(paths.patchedPath)) {
    if (!expectedKey) {
      patchedOk = true;
    } else if (!existing?.patch_hash) {
      patchedOk = false;
    } else {
      patchedOk = normalizeHash(existing.patch_hash) === expectedKey;
    }
  }

  if (!patchedOk) {
    
    try {
      if (fs.existsSync(paths.patchedPath)) fs.unlinkSync(paths.patchedPath);
    } catch {
      
    }

    await downloadFileWithProgress(
      withCacheBuster(url, `server-patch-${expectedKey ?? Date.now().toString()}`),
      paths.tempDownloadPath,
      win,
      progressChannel,
      "online-patch",
      aggregate,
    );

    moveReplace(paths.tempDownloadPath, paths.patchedPath);
  }

  win.webContents.send(progressChannel, { phase: "online-patch", percent: -1 });

  
  if (!fs.existsSync(paths.originalPath)) {
    moveReplace(serverPath, paths.originalPath);
  } else {
    const tempCurrent = path.join(
      paths.root,
      `temp_current_${Date.now()}_${path.basename(serverPath)}`,
    );
    moveReplace(serverPath, tempCurrent);
    unlinkIfExists(tempCurrent);
  }

  copyReplace(paths.patchedPath, serverPath);
  win.webContents.send(progressChannel, {
    phase: "online-patch",
    percent: 100,
  });

  writePatchState(paths.statePath, {
    enabled: true,
    patch_hash: version.patch_hash,
    patch_url: url,
    original_url: originalUrl,
    updatedAt: Date.now(),
  });

  return "enabled";
};

export const disableServerPatch = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel: "online-unpatch-progress" = "online-unpatch-progress",
): Promise<"disabled" | "already-disabled" | "skipped"> => {
  const url = version.server_url;
  const originalUrl = version.unserver_url;
  if (!url || !originalUrl) return "skipped";

  const serverPath = getServerPath(gameDir, version);
  if (!fs.existsSync(serverPath)) return "skipped";

  const paths = getPatchPaths(serverPath);
  ensureDirs([paths.root, paths.originalDir, paths.patchedDir]);

  const existing = readPatchState(paths.statePath);

  
  const looksPatched = !!existing?.enabled || fs.existsSync(paths.patchedPath);
  if (!looksPatched) return "already-disabled";

  if (!fs.existsSync(paths.originalPath)) {
    
    const tempOriginal = path.join(
      paths.root,
      `temp_original_${Date.now()}_${path.basename(serverPath)}`,
    );
    await downloadFileWithProgress(
      withCacheBuster(originalUrl, `orig-${Date.now()}`),
      tempOriginal,
      win,
      progressChannel,
      "online-unpatch",
    );

    moveReplace(tempOriginal, paths.originalPath);
  }

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: -1,
  });

  
  const tempCurrent = path.join(
    paths.root,
    `temp_current_${Date.now()}_${path.basename(serverPath)}`,
  );
  moveReplace(serverPath, tempCurrent);
  copyReplace(tempCurrent, paths.patchedPath);
  copyReplace(paths.originalPath, serverPath);
  unlinkIfExists(tempCurrent);

  win.webContents.send(progressChannel, {
    phase: "online-unpatch",
    percent: 100,
  });

  writePatchState(paths.statePath, {
    enabled: false,
    patch_hash: version.patch_hash,
    patch_url: url,
    original_url: originalUrl,
    updatedAt: Date.now(),
  });

  return "disabled";
};

export const checkServerPatchNeeded = async (
  gameDir: string,
  version: GameVersion,
): Promise<"needs" | "up-to-date" | "skipped"> => {
  if (!version.server_url || !version.unserver_url) return "skipped";

  const serverPath = getServerPath(gameDir, version);
  if (!fs.existsSync(serverPath)) return "skipped";

  const { statePath } = getPatchPaths(serverPath);
  const state = readPatchState(statePath);

  const expectedKey = version.patch_hash ? normalizeHash(version.patch_hash) : undefined;

  
  if (
    state?.enabled &&
    state.patch_url === version.server_url &&
    (!expectedKey ||
      (state.patch_hash && normalizeHash(state.patch_hash) === expectedKey))
  ) {
    return "up-to-date";
  }

  return "needs";
};



export const enableOnlinePatch = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel:
    | "install-progress"
    | "online-patch-progress" = "online-patch-progress",
): Promise<"enabled" | "already-enabled" | "skipped"> => {
  
  
  const wantsServer = !!(version.server_url && version.unserver_url);

  const preflightClientNeedsDownload = async (): Promise<boolean> => {
    const url = version.patch_url;
    const expectedHash = version.patch_hash;
    if (!url || !expectedHash) return false;

    const clientPath = getClientPath(gameDir, version);
    if (!fs.existsSync(clientPath)) return false;

    const paths = getPatchPaths(clientPath);
    const existing = readPatchState(paths.statePath);
    if (!fs.existsSync(paths.patchedPath)) return true;

    if (
      existing?.patch_hash &&
      normalizeHash(existing.patch_hash) !== normalizeHash(expectedHash)
    ) {
      return true;
    }

    try {
      const cachedHash = await sha256File(paths.patchedPath);
      return normalizeHash(cachedHash) !== normalizeHash(expectedHash);
    } catch {
      return true;
    }
  };

  const preflightServerNeedsDownload = async (): Promise<boolean> => {
    if (!wantsServer) return false;

    const serverPath = getServerPath(gameDir, version);
    if (!fs.existsSync(serverPath)) return false;

    const paths = getPatchPaths(serverPath);
    const existing = readPatchState(paths.statePath);
    if (!fs.existsSync(paths.patchedPath)) return true;

    const expectedKey = version.patch_hash
      ? normalizeHash(version.patch_hash)
      : undefined;

    
    if (expectedKey) {
      if (!existing?.patch_hash) return true;
      if (normalizeHash(existing.patch_hash) !== expectedKey) return true;
    }

    return false;
  };

  const needsClientDownload = await preflightClientNeedsDownload();
  const needsServerDownload = await preflightServerNeedsDownload();

  let aggregate: AggregateProgress | undefined;
  if (needsClientDownload || needsServerDownload) {
    
    const sizes = await Promise.all([
      needsClientDownload && version.patch_url
        ? headContentLength(withCacheBuster(version.patch_url, "patch-head"))
        : Promise.resolve(undefined),
      needsServerDownload && version.server_url
        ? headContentLength(withCacheBuster(version.server_url, "server-head"))
        : Promise.resolve(undefined),
    ]);

    const required: Array<number | undefined> = [];
    if (needsClientDownload) required.push(sizes[0]);
    if (needsServerDownload) required.push(sizes[1]);

    let allKnown = true;
    let total = 0;
    for (const n of required) {
      if (typeof n !== "number" || !(n > 0)) {
        allKnown = false;
        continue;
      }
      total += n;
    }

    
    aggregate = { total: allKnown && total > 0 ? total : undefined, current: 0 };
  }

  
  const clientResult = await enableClientPatch(
    gameDir,
    version,
    win,
    progressChannel,
    aggregate,
  );

  
  if (wantsServer) {
    await enableServerPatch(gameDir, version, win, progressChannel, aggregate);
  }

  return clientResult;
};

export const disableOnlinePatch = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel: "online-unpatch-progress" = "online-unpatch-progress",
): Promise<"disabled" | "already-disabled" | "skipped"> => {
  
  const clientResult = await disableClientPatch(
    gameDir,
    version,
    win,
    progressChannel,
  );

  
  if (version.server_url && version.unserver_url) {
    await disableServerPatch(gameDir, version, win, progressChannel);
  }

  return clientResult;
};

export const getOnlinePatchState = (
  gameDir: string,
  version: GameVersion,
): {
  supported: boolean;
  available: boolean;
  enabled: boolean;
  downloaded: boolean;
} => {
  const clientState = getClientPatchState(gameDir, version);
  

  
  
  
  

  return {
    supported: clientState.supported,
    available: clientState.available,
    enabled: clientState.enabled,
    downloaded: clientState.downloaded,
  };
};

export const getOnlinePatchHealth = async (
  gameDir: string,
  version: GameVersion,
): Promise<{
  supported: boolean;
  available: boolean;
  enabled: boolean;
  clientIsPatched: boolean;
  serverIsPatched: boolean;
  needsFixClient: boolean;
  needsFixServer: boolean;
  needsFix: boolean; 
  patchOutdated: boolean;
}> => {
  const clientHealth = await getClientPatchHealth(gameDir, version);
  const serverHealth = await getServerPatchHealth(gameDir, version);

  return {
    supported: clientHealth.supported,
    available: clientHealth.available,
    enabled: clientHealth.enabled,

    
    clientIsPatched: clientHealth.clientIsPatched,
    serverIsPatched: serverHealth.serverIsPatched,
    needsFixClient: clientHealth.needsFixClient,
    needsFixServer: serverHealth.needsFixServer,

    
    needsFix: clientHealth.needsFixClient || serverHealth.needsFixServer,
    patchOutdated: clientHealth.patchOutdated, 
  };
};

export const checkOnlinePatchNeeded = async (
  gameDir: string,
  version: GameVersion,
): Promise<"needs" | "up-to-date" | "skipped"> => {
  const clientCheck = await checkClientPatchNeeded(gameDir, version);

  
  if (clientCheck === "needs") return "needs";
  if (clientCheck === "skipped") return "skipped";

  
  const serverCheck = await checkServerPatchNeeded(gameDir, version);

  if (serverCheck === "needs") return "needs";

  return "up-to-date";
};

export const fixOnlinePatch = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
  progressChannel: "online-unpatch-progress" = "online-unpatch-progress",
): Promise<"fixed" | "not-needed" | "skipped"> => {
  
  const clientResult = await fixClientToUnpatched(
    gameDir,
    version,
    win,
    progressChannel,
  );

  
  
  
  const serverResult = await fixServerToUnpatched(
    gameDir,
    version,
    win,
    progressChannel,
  );

  if (clientResult === "fixed" || serverResult === "fixed") {
    return "fixed";
  }

  if (clientResult === "skipped" && serverResult === "skipped") {
    return "skipped";
  }

  return "not-needed";
};
