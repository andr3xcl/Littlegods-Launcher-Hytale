import { BrowserWindow } from "electron";
import { checkGameInstallation } from "./check";
import { join, dirname } from "path";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import { genUUID } from "./uuid";
import { installGame } from "./install";
import { logger } from "../logger";
import { getOnlinePatchState } from "./onlinePatch";
import { fetchAuthTokens } from "./auth";
import { resolveExistingInstallDir } from "./paths";
import { getNixShellPath, getNixBinDirs } from "./nix";

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

const isWaylandSession = (): boolean => {
  return (
    process.platform === "linux" &&
    (process.env.XDG_SESSION_TYPE === "wayland" ||
      process.env.WAYLAND_DISPLAY !== undefined ||
      process.env.DISPLAY === undefined)
  );
};

export const launchGame = async (
  baseDir: string,
  version: GameVersion,
  username: string,
  win: BrowserWindow,
  retryCount: number = 0,
  customUUID: string | null = null,
  callbacks?: {
    onGameSpawned?: () => void;
    onGameExited?: (info: {
      code: number | null;
      signal: NodeJS.Signals | null;
    }) => void;
  },
  options?: { linuxForcePipeWire: boolean; linuxUseNixShell: boolean },
) => {
  if (retryCount > 1) {
    const msg = "Failed to launch game (max retries reached)";
    logger.error(msg);
    win.webContents.send("launch-error", msg);
    return;
  }

  logger.info(
    `Starting launch process for ${version.type} ${version.build_name} for user ${username}`,
  );

  const needsServer = process.platform !== "darwin";

  let { client, server, jre } = checkGameInstallation(baseDir, version);
  if (!client || !jre || (needsServer && !server)) {
    logger.info("Game components missing, starting installation:", {
      client,
      server,
      jre,
    });
    const installResult = await installGame(baseDir, version, win);
    if (!installResult) {
      const msg = "Game installation failed";
      logger.error(msg);
      win.webContents.send("launch-error", msg);
      return;
    }

    
    ({ client, server, jre } = checkGameInstallation(baseDir, version));
    if (!client || !jre || (needsServer && !server)) {
      const msg = "Game installation incomplete (missing files after install)";
      logger.error(msg, { client, server, jre });
      win.webContents.send("launch-error", msg);
      return;
    }
    logger.info("Game installation successful and verified.");
  } else {
    logger.info("Game installation verified.");
  }

  const userDir = join(baseDir, "UserData");
  if (!fs.existsSync(userDir)) {
    logger.info(`Creating UserData directory at ${userDir}`);
    fs.mkdirSync(userDir, { recursive: true });
  }

  const normalizeUuid = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const compact = trimmed.replace(/-/g, "");
    if (/^[0-9a-fA-F]{32}$/.test(compact)) {
      const lower = compact.toLowerCase();
      return `${lower.slice(0, 8)}-${lower.slice(8, 12)}-${lower.slice(12, 16)}-${lower.slice(16, 20)}-${lower.slice(20)}`;
    }

    if (
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        trimmed,
      )
    ) {
      return trimmed.toLowerCase();
    }

    return null;
  };

  const uuidToUse = customUUID ? normalizeUuid(customUUID) : null;
  const finalUuid = uuidToUse ?? genUUID(username);

  logger.info(
    `Using UUID: ${finalUuid} (${customUUID ? "custom" : "generated"})`,
  );

  const modsDir = join(baseDir, "UserData", "Mods");
  if (!fs.existsSync(modsDir)) {
    logger.info(`Creating Mods directory at ${modsDir}`);
    fs.mkdirSync(modsDir, { recursive: true });
  }

  const args = [
    "--app-dir",
    resolveExistingInstallDir(baseDir, version),
    "--user-dir",
    userDir,
    "--java-exec",
    jre,
    "--uuid",
    finalUuid,
    "--name",
    username,
  ];

  const patchEnabled = getOnlinePatchState(baseDir, version).enabled;
  const hasProperPatchFlag = typeof version.proper_patch === "boolean";

  
  
  
  
  
  const useAuthenticated =
    patchEnabled &&
    ((hasProperPatchFlag && version.proper_patch === false) ||
      (!hasProperPatchFlag && process.platform !== "win32"));
  

  if (useAuthenticated) {
    logger.info(
      "Online patch enabled, using authenticated mode (tokens provided)",
    );
    args.push("--auth-mode", "authenticated");

    try {
      const authTokens = await fetchAuthTokens(username, finalUuid);
      args.push("--identity-token", authTokens.identityToken);
      args.push("--session-token", authTokens.sessionToken);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Authentication failed (unknown error)";
      logger.error("Authentication failed:", e);
      win.webContents.send("launch-error", msg);
      return;
    }
  } else {
    logger.info("Using offline mode (no tokens)");
    args.push("--auth-mode", "offline");
  }

  logger.info("Launch arguments:", args);

  const spawnClient = (attempt: number) => {
    logger.info(`Spawning client (attempt ${attempt + 1})...`);
    try {
      const env = { ...process.env };

      if (isWaylandSession()) {
        console.log(
          "Wayland session detected, setting SDL_VIDEODRIVER=wayland",
        );
        env.SDL_VIDEODRIVER = "wayland";
      }

      if (process.platform === "linux") {
        
        

        
        
        const clientDir = dirname(client);
        env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH
          ? `${clientDir}:${env.LD_LIBRARY_PATH}`
          : clientDir;

        
        if (options?.linuxForcePipeWire !== false) {
          if (!env.SDL_AUDIODRIVER) env.SDL_AUDIODRIVER = "pipewire";
        }

        
        if (!env.XDG_RUNTIME_DIR) {
          try {
            const uid = os.userInfo().uid;
            env.XDG_RUNTIME_DIR = `/run/user/${uid}`;
          } catch {
            
          }
        }

        
        if (!env.DISPLAY) env.DISPLAY = ":0";

        logger.info("Linux compatibility environment applied", {
          SDL_AUDIODRIVER: env.SDL_AUDIODRIVER,
          XDG_RUNTIME_DIR: env.XDG_RUNTIME_DIR,
          DISPLAY: env.DISPLAY,
        });
      }

      let spawnCmd = client;
      let spawnArgs = args;

      if (process.platform === "linux") {
        const shellNixPath = join(process.env.APP_ROOT || ".", "shell.nix");
        const nixShellPath = getNixShellPath();

        
        if (fs.existsSync(shellNixPath) && nixShellPath) {
          logger.info("Wrapping launch with nix-shell using", shellNixPath);

          
          const nixBinDirs = getNixBinDirs();
          if (nixBinDirs.length > 0) {
            const extraPath = nixBinDirs.join(":");
            env.PATH = env.PATH ? `${extraPath}:${env.PATH}` : extraPath;
            logger.info("Injected Nix paths into PATH environment", { PATH: env.PATH });
          }

          const fullCmd = `"${client}" ${args.map((a) => `"${a}"`).join(" ")}`;
          spawnCmd = nixShellPath;
          spawnArgs = [shellNixPath, "--run", fullCmd];
        } else {
          if (options?.linuxUseNixShell && !nixShellPath) {
            logger.warn("Nix-shell requested but nix-shell binary not found on the system.");
          } else if (fs.existsSync(shellNixPath) && !nixShellPath) {
            logger.info("shell.nix found but Nix is not installed. Launching normally.");
          }
        }
      }

      const child = spawn(spawnCmd, spawnArgs, {
        windowsHide: true,
        shell: false, 
        cwd: dirname(client),
        
        
        detached: process.platform !== "darwin",
        stdio: "ignore",
        env: env,
      });

      
      
      child.unref();

      child.on("spawn", () => {
        logger.info("Game process spawned successfully.");
        callbacks?.onGameSpawned?.();
        win.webContents.send("launched");
      });

      child.on("error", (error: NodeJS.ErrnoException) => {
        
        if (error?.code === "EACCES" && attempt === 0) {
          logger.warn(
            "Launch EACCES: attempting to chmod +x and retry",
            client,
          );
          ensureExecutable(client);
          spawnClient(1);
          return;
        }

        logger.error(`Error launching game: ${error.message}`, error);
        win.webContents.send("launch-error", error.message);
      });

      let finished = false;
      const onFinish = (code: number | null, signal: NodeJS.Signals | null) => {
        if (finished) return;
        finished = true;

        if (code && code !== 0) {
          logger.error(
            `Game exited with code ${code}${signal ? ` (signal ${signal})` : ""}`,
          );
        } else {
          logger.info(
            `Game exited smoothly (code ${code}${signal ? `, signal ${signal}` : ""})`,
          );
        }

        callbacks?.onGameExited?.({ code, signal });
        try {
          win.webContents.send("launch-finished", { code, signal });
        } catch {
          
        }
      };

      
      child.once("exit", onFinish);
      child.once("close", onFinish);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error launching game (catch): ${msg}`, error);
      win.webContents.send("launch-error", msg);
    }
  };

  
  ensureExecutable(client);
  spawnClient(0);
};
