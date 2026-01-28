import { BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import stream from "stream";
const pipeline = promisify(stream.pipeline);
import { spawn } from "child_process";
import readline from "node:readline";
import { installButler } from "./butler";
import { installJRE } from "./jre";
import { checkGameInstallation } from "./check";
import { readInstallManifest, writeInstallManifest } from "./manifest";
import { logger } from "../logger";

import {
  getLatestDir,
  getReleaseBuildDir,
  migrateLegacyChannelInstallIfNeeded,
  resolveClientPath,
  resolveInstallDir,
} from "./paths";



class UserCancelledError extends Error {
  constructor() {
    super("user_cancelled");
    this.name = "UserCancelledError";
  }
}

type PwrDownloadState = {
  controller: AbortController;
  tempPath: string;
};

const pwrDownloadsInFlight = new Map<string, PwrDownloadState>();

const installKey = (gameDir: string, version: GameVersion) =>
  `${gameDir}::${version.type}::${version.build_index}`;

export const cancelBuildDownload = (
  gameDir: string,
  version: GameVersion,
): boolean => {
  const key = installKey(gameDir, version);
  const st = pwrDownloadsInFlight.get(key);
  if (!st) return false;

  try {
    st.controller.abort();
  } catch {
    
  }

  
  try {
    if (fs.existsSync(st.tempPath)) fs.unlinkSync(st.tempPath);
  } catch {
    
  }

  return true;
};

const ensureExecutable = (filePath: string) => {
  if (process.platform === "win32") return;
  try {
    const st = fs.statSync(filePath);
    if ((st.mode & 0o100) === 0) {
      fs.chmodSync(filePath, 0o755);
    }
  } catch {
    
  }
};

const ensureClientExecutable = (installDir: string) => {
  try {
    const clientPath = resolveClientPath(installDir);
    ensureExecutable(clientPath);
  } catch {
    
  }
};



const downloadPWR = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
) => {
  const tempPWRPath = path.join(gameDir, `temp_${version.build_index}.pwr`);
  const key = installKey(gameDir, version);
  const controller = new AbortController();

  
  pwrDownloadsInFlight.set(key, { controller, tempPath: tempPWRPath });

  try {
    logger.info(
      `Starting PWR download for version ${version.build_name} from ${version.url}`,
    );
    const response = await fetch(version.url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`Failed to download: ${response.statusText}`);
    if (!response.body) throw new Error("No response body");

    const contentLength = response.headers.get("content-length");
    const totalLength = contentLength ? parseInt(contentLength, 10) : undefined;
    let downloadedLength = 0;

    logger.info(
      `PWR size: ${totalLength ? (totalLength / 1024 / 1024).toFixed(2) + " MB" : "unknown"}`,
    );

    
    win.webContents.send("install-progress", {
      phase: "pwr-download",
      percent: totalLength ? 0 : -1,
      total: totalLength,
      current: 0,
    });

    const progressStream = new stream.PassThrough();
    progressStream.on("data", (chunk) => {
      downloadedLength += chunk.length;

      const percent =
        typeof totalLength === "number" && totalLength > 0
          ? Math.round((downloadedLength / totalLength) * 100)
          : -1;

      win.webContents.send("install-progress", {
        phase: "pwr-download",
        percent,
        total: totalLength,
        current: downloadedLength,
      });
    });

    await pipeline(
      
      stream.Readable.fromWeb(response.body),
      progressStream,
      fs.createWriteStream(tempPWRPath),
    );

    logger.info(`PWR download completed: ${tempPWRPath}`);

    win.webContents.send("install-progress", {
      phase: "pwr-download",
      percent: 100,
      total: totalLength,
      current: totalLength, 
    });

    return tempPWRPath;
  } catch (error) {
    
    if (
      controller.signal.aborted ||
      (error && typeof error === "object" && (error as any).name === "AbortError")
    ) {
      try {
        if (fs.existsSync(tempPWRPath)) fs.unlinkSync(tempPWRPath);
      } catch {
        
      }
      throw new UserCancelledError();
    }

    logger.error(
      `Failed to download PWR for version ${version.build_name}:`,
      error,
    );
    return null;
  } finally {
    pwrDownloadsInFlight.delete(key);
  }
};

const applyPWR = async (
  pwrPath: string,
  butlerPath: string,
  installDir: string,
  win: BrowserWindow,
) => {
  logger.info(`Applying PWR patch from ${pwrPath} to ${installDir}`);
  const stagingDir = path.join(installDir, "staging-temp");
  if (!fs.existsSync(installDir)) {
    logger.info(`Creating install directory: ${installDir}`);
    fs.mkdirSync(installDir, { recursive: true });
  }
  if (!fs.existsSync(stagingDir)) {
    logger.info(`Creating staging directory: ${stagingDir}`);
    fs.mkdirSync(stagingDir, { recursive: true });
  }

  win.webContents.send("install-progress", {
    phase: "patching",
    percent: -1,
  });

  return new Promise<string>((resolve, reject) => {
    const butlerProcess = spawn(
      butlerPath,
      ["apply", "--json", "--staging-dir", stagingDir, pwrPath, installDir],
      {
        windowsHide: true,
      },
    ).on("error", (error) => {
      logger.error(
        "Butler process failed to start or encountered a critical error:",
        error,
      );
      reject(error);
    });

    
    
    if (butlerProcess.stdout) {
      const rl = readline.createInterface({
        input: butlerProcess.stdout,
        crlfDelay: Infinity,
      });
      rl.on("line", (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const obj = JSON.parse(trimmed);

          
          
          const type = typeof obj?.type === "string" ? obj.type : "";
          const isProgress =
            type.toLowerCase().includes("progress") ||
            typeof obj?.percentage === "number" ||
            typeof obj?.percent === "number";

          if (!isProgress) return;

          let percent: number | undefined;
          if (typeof obj.percentage === "number") percent = obj.percentage;
          else if (typeof obj.percent === "number") percent = obj.percent;
          else if (typeof obj.progress === "number") percent = obj.progress;

          if (typeof percent !== "number" || Number.isNaN(percent)) return;
          
          if (percent > 0 && percent <= 1) percent = percent * 100;
          percent = Math.max(0, Math.min(100, percent));

          win.webContents.send("install-progress", {
            phase: "patching",
            percent: Math.round(percent),
          });
        } catch {
          
        }
      });
      butlerProcess.on("close", () => {
        rl.close();
      });
    }

    butlerProcess.stderr.on("data", (data) => {
      logger.error(`Butler stderr: ${data.toString().trim()}`);
    });

    butlerProcess.on("close", (code) => {
      logger.info(`Butler process exited with code ${code}`);

      
      win.webContents.send("install-progress", {
        phase: "patching",
        percent: 100,
      });

      resolve(installDir);
    });
  });
};

export const installGame = async (
  gameDir: string,
  version: GameVersion,
  win: BrowserWindow,
) => {
  logger.info(
    `Starting game installation for ${version.type} build ${version.build_name} in ${gameDir}`,
  );
  try {
    migrateLegacyChannelInstallIfNeeded(gameDir, version.type);

    
    if (version.type === "release" && version.isLatest) {
      const latestDir = getLatestDir(gameDir);
      if (fs.existsSync(latestDir)) {
        const existing = readInstallManifest(latestDir);
        if (existing && existing.build_index !== version.build_index) {
          logger.info(
            `Retiring existing 'latest' build ${existing.build_index} to release builds.`,
          );
          const targetBuildDir = getReleaseBuildDir(
            gameDir,
            existing.build_index,
          );
          if (fs.existsSync(targetBuildDir)) {
            logger.info(
              `Target build directory ${targetBuildDir} already exists, deleting legacy 'latest'.`,
            );
            
            fs.rmSync(latestDir, { recursive: true, force: true });
          } else {
            logger.info(`Moving 'latest' to ${targetBuildDir}`);
            fs.mkdirSync(path.dirname(targetBuildDir), { recursive: true });
            fs.renameSync(latestDir, targetBuildDir);
          }
        }
      }
    }

    const installDir = resolveInstallDir(gameDir, version);

    const { client, server, jre } = checkGameInstallation(gameDir, version);

    const installedManifest = readInstallManifest(installDir);
    const alreadyOnThisBuild =
      installedManifest?.build_index === version.build_index;

    fs.mkdirSync(gameDir, { recursive: true });
    win.webContents.send("install-started");

    if (!jre) {
      logger.info("JRE not found, installing JRE...");
      const jrePath = await installJRE(gameDir, win);
      if (!jrePath) throw new Error("Failed to install JRE");
      logger.info(`JRE installed at ${jrePath}`);
    }

    
    
    if (!alreadyOnThisBuild) {
      logger.info(
        `New build detected (target: ${version.build_index}, current: ${installedManifest?.build_index ?? "none"}). Starting patch process.`,
      );
      const butlerPath = await installButler();
      if (!butlerPath) throw new Error("Failed to install butler");

      const tempPWRPath = await downloadPWR(gameDir, version, win);
      if (!tempPWRPath) throw new Error("Failed to download PWR");

      const gameFinalDir = await applyPWR(
        tempPWRPath,
        butlerPath,
        installDir,
        win,
      );
      if (!gameFinalDir) throw new Error("Failed to apply PWR");
      logger.info(`PWR patch applied successfully to ${gameFinalDir}`);

      fs.unlinkSync(tempPWRPath);

      
      writeInstallManifest(installDir, version);

      
      ensureClientExecutable(installDir);
      logger.info("Game installation and patching complete.");
    } else {
      
      
      if (!client || !server) {
        logger.warn(
          "Manifest indicates installation, but client or server binaries are missing. Re-patching.",
        );
        const butlerPath = await installButler();
        if (!butlerPath) throw new Error("Failed to install butler");

        const tempPWRPath = await downloadPWR(gameDir, version, win);
        if (!tempPWRPath) throw new Error("Failed to download PWR");

        const gameFinalDir = await applyPWR(
          tempPWRPath,
          butlerPath,
          installDir,
          win,
        );
        if (!gameFinalDir) throw new Error("Failed to apply PWR");
        logger.info(`PWR patch re-applied successfully to ${gameFinalDir}`);
        fs.unlinkSync(tempPWRPath);

        writeInstallManifest(installDir, version);

        ensureClientExecutable(installDir);
        logger.info("Game re-patching complete.");
      } else {
        logger.info("Game already installed and binaries verified.");
      }
    }

    logger.info("Game installation process finished successfully.");

    win.webContents.send("install-finished", version);
    return true;
  } catch (error) {
    if (error instanceof UserCancelledError) {
      logger.info("Install cancelled by user");
      win.webContents.send("install-cancelled");
      return false;
    }

    logger.error("Installation failed with error:", error);
    win.webContents.send(
      "install-error",
      error instanceof Error ? error.message : "Unknown error",
    );
    return false;
  }
};
