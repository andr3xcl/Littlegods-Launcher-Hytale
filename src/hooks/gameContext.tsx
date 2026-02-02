import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { getGameVersions } from "../utils/game";

interface GameContextType {
  gameDir: string | null;
  versionType: VersionType;
  setVersionType: (t: VersionType) => void;
  availableVersions: GameVersion[];
  setAvailableVersions: (versions: GameVersion[]) => void;
  selectedVersion: number;
  setSelectedVersion: (idx: number) => void;
  updateAvailable: boolean;
  updateDismissed: boolean;
  dismissUpdateForNow: () => void;
  restoreUpdatePrompt: () => void;
  installing: boolean;
  installProgress: InstallProgress;
  installingVersion: GameVersion | null;
  cancelBuildDownload: () => void;
  cancelingBuildDownload: boolean;
  patchingOnline: boolean;
  patchProgress: InstallProgress;
  pendingOnlinePatch: boolean;
  checkingUpdates: boolean;
  launching: boolean;
  gameLaunched: boolean;
  installGame: (version: GameVersion) => void;
  launchGame: (version: GameVersion, username: string, uuid?: string) => void;
  checkForUpdates: (reason?: "startup" | "manual") => Promise<void>;
  startPendingOnlinePatch: () => void;
}

export const GameContext = createContext<GameContextType | null>(null);

export const GameContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [gameDir, setGameDir] = useState<string | null>(null);

  const [versionType, setVersionType] = useState<VersionType>("release");
  const [releaseVersions, setReleaseVersions] = useState<GameVersion[]>([]);
  const [preReleaseVersions, setPreReleaseVersions] = useState<GameVersion[]>(
    [],
  );
  const releaseVersionsRef = useRef<GameVersion[]>([]);
  const preReleaseVersionsRef = useRef<GameVersion[]>([]);
  const [selectedIndexByType, setSelectedIndexByType] = useState<
    Record<VersionType, number>
  >({ release: 0, "pre-release": 0 });

  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [installing, setInstalling] = useState(false);
  const [installingVersion, setInstallingVersion] = useState<GameVersion | null>(
    null,
  );
  const [cancelingBuildDownload, setCancelingBuildDownload] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress>({
    phase: "download",
    percent: 0,
    total: 0,
    current: 0,
  });
  const [patchingOnline, setPatchingOnline] = useState(false);
  const [patchProgress, setPatchProgress] = useState<InstallProgress>({
    phase: "online-patch",
    percent: -1,
  });
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [gameLaunched, setGameLaunched] = useState(false);

  useEffect(() => {
    releaseVersionsRef.current = releaseVersions;
  }, [releaseVersions]);

  useEffect(() => {
    preReleaseVersionsRef.current = preReleaseVersions;
  }, [preReleaseVersions]);

  const availableVersions =
    versionType === "release" ? releaseVersions : preReleaseVersions;
  const selectedVersion = selectedIndexByType[versionType] ?? 0;

  const setSelectedVersion = useCallback(
    (idx: number) => {
      setSelectedIndexByType((prev) => ({ ...prev, [versionType]: idx }));
    },
    [versionType],
  );

  const setAvailableVersions = useCallback(
    (versions: GameVersion[]) => {
      if (versionType === "release") {
        setReleaseVersions(versions);
      } else {
        setPreReleaseVersions(versions);
      }
    },
    [versionType]
  );


  const dismissUpdateForNow = useCallback(() => {
    setUpdateDismissed(true);

    
    if (versionType !== "release") setVersionType("release");

    const installed = releaseVersions
      .filter((v) => v.installed)
      .sort((a, b) => b.build_index - a.build_index);
    const newestInstalled = installed.length ? installed[0] : null;
    if (!newestInstalled) return;
    const idx = releaseVersions.findIndex(
      (v) =>
        v.build_index === newestInstalled.build_index && v.type === "release",
    );
    if (idx !== -1) {
      setSelectedIndexByType((prev) => ({ ...prev, release: idx }));
    }
  }, [releaseVersions, versionType]);

  const restoreUpdatePrompt = useCallback(() => {
    setUpdateDismissed(false);
  }, []);

  const installGame = useCallback(
    (version: GameVersion) => {
      if (!gameDir) return;
      
      
      setInstallingVersion(version);
      setCancelingBuildDownload(false);
      window.ipcRenderer.send("install-game", gameDir, version);
    },
    [gameDir],
  );

  const cancelBuildDownload = useCallback(() => {
    if (!gameDir) return;
    if (!installingVersion) return;

    
    setCancelingBuildDownload(true);
    window.ipcRenderer.send(
      "cancel-build-download",
      gameDir,
      installingVersion,
    );
  }, [gameDir, installingVersion]);

  const launchGame = useCallback(
    (version: GameVersion, username: string, uuid?: string) => {
      if (!gameDir || !version.installed) return;
      setLaunching(true);

      
      try {
        localStorage.setItem(
          `selectedVersion:${version.type}`,
          version.build_index.toString(),
        );
      } catch {
        
      }

      
      window.ipcRenderer.once("launched", () => {
        setLaunching(false);
        setGameLaunched(true);
      });
      window.ipcRenderer.once("launch-finished", () => {
        setLaunching(false);
        setGameLaunched(false);
      });
      window.ipcRenderer.once("launch-error", (_: any, error?: string) => {
        setLaunching(false);
        setGameLaunched(false);
        if (error) {
          console.error("Launch error:", error);
          alert(`Launch failed: ${error}`);
        } else {
          alert("Launch failed: Unknown error");
        }
      });

      const uuidArg = uuid?.trim() || null;

      const linuxForcePipeWire = localStorage.getItem("linuxForcePipeWire") !== "false";
      const linuxUseNixShell = localStorage.getItem("linuxUseNixShell") === "true";

      window.ipcRenderer.send(
        "launch-game",
        gameDir,
        version,
        username,
        uuidArg,
        { linuxForcePipeWire, linuxUseNixShell }
      );
    },
    [gameDir],
  );

  const checkForUpdates = useCallback(
    async (reason: "startup" | "manual" = "startup") => {
      if (!gameDir) return;
      setCheckingUpdates(true);

      
      if (reason === "manual") {
        window.ipcRenderer.send("updater:check");
      }

      try {
        const installed = (await window.ipcRenderer.invoke(
          "list-installed-versions",
          gameDir,
        )) as Array<{
          type: VersionType;
          build_index: number;
          isLatest?: boolean;
        }>;

        const releaseInstalledSet = new Set<number>();
        const preReleaseInstalledSet = new Set<number>();
        for (const item of installed) {
          if (item.type === "release") {
            releaseInstalledSet.add(item.build_index);
          } else {
            preReleaseInstalledSet.add(item.build_index);
          }
        }

        const isInstalled = (t: VersionType, idx: number) =>
          t === "release"
            ? releaseInstalledSet.has(idx)
            : preReleaseInstalledSet.has(idx);

        const [remoteRelease, remotePre] = await Promise.all([
          getGameVersions("release"),
          getGameVersions("pre-release"),
        ]);

        
        const releaseBase = remoteRelease.length
          ? remoteRelease
          : releaseVersionsRef.current;
        const preBase = remotePre.length
          ? remotePre
          : preReleaseVersionsRef.current;

        
        const mergeInstalled = (base: GameVersion[], type: VersionType) => {
          const next = base.map((v) => ({
            ...v,
            installed: isInstalled(type, v.build_index),
          }));

          
          for (const item of installed) {
            if (item.type !== type) continue;
            if (next.some(v => v.build_index === item.build_index)) continue;

            
            next.push({
              type: type,
              build_index: item.build_index,
              build_name: `Build-${item.build_index}`,
              url: "", 
              installed: true,
              isLatest: false,
            });
          }

          return next.sort((a, b) => b.build_index - a.build_index);
        };

        const nextRelease = mergeInstalled(releaseBase, "release");
        const nextPre = mergeInstalled(preBase, "pre-release");

        setReleaseVersions(nextRelease);
        setPreReleaseVersions(nextPre);

        const newestInstalledRelease = nextRelease
          .filter((v) => v.installed)
          .reduce<GameVersion | undefined>((best, v) => {
            if (!best) return v;
            return v.build_index > best.build_index ? v : best;
          }, undefined);

        const latestRelease =
          nextRelease.find((v) => v.isLatest) ?? nextRelease[0];
        const hasUpdate =
          !!newestInstalledRelease &&
          !!latestRelease &&
          latestRelease.build_index > newestInstalledRelease.build_index;
        setUpdateAvailable(hasUpdate);

        
        
        
        
        const pickIndex = (
          list: GameVersion[],
          t: VersionType,
          newestInstalled?: GameVersion,
        ) => {
          const raw = localStorage.getItem(`selectedVersion:${t}`);
          const savedBuild = raw ? Number(raw) : NaN;
          if (Number.isFinite(savedBuild)) {
            const idx = list.findIndex((v) => v.build_index === savedBuild);
            if (idx !== -1) return idx;
          }

          if (newestInstalled) {
            const idx = list.findIndex(
              (v) => v.build_index === newestInstalled.build_index,
            );
            if (idx !== -1) return idx;
          }

          return list.length ? 0 : 0;
        };

        const newestInstalledPre = nextPre
          .filter((v) => v.installed)
          .reduce<GameVersion | undefined>((best, v) => {
            if (!best) return v;
            return v.build_index > best.build_index ? v : best;
          }, undefined);

        const releaseIdx = pickIndex(
          nextRelease,
          "release",
          newestInstalledRelease,
        );
        const preIdx = pickIndex(nextPre, "pre-release", newestInstalledPre);

        setSelectedIndexByType((prev) => ({
          ...prev,
          release: releaseIdx,
          "pre-release": preIdx,
        }));

        
        if (nextRelease.length) setVersionType((prev) => prev || "release");
      } finally {
        setCheckingUpdates(false);
      }
    },
    [gameDir],
  );

  useEffect(() => {
    if (!window.config) return;

    const bounceTimeout = 200;
    let lastUpdateProgress: number;
    const lastProgressRef = { current: null as InstallProgress | null };

    window.ipcRenderer.on(
      "install-progress",
      (_, progress: InstallProgress) => {
        const now = Date.now();
        const last = lastProgressRef.current;

        
        const phaseChanged = !last || last.phase !== progress.phase;
        const allowThrough =
          phaseChanged ||
          progress.percent === -1 ||
          progress.percent === 100 ||
          !lastUpdateProgress ||
          now - lastUpdateProgress >= bounceTimeout;

        if (!allowThrough) return;

        lastUpdateProgress = now;
        lastProgressRef.current = progress;
        setInstallProgress(progress);
      },
    );

    
    
    window.ipcRenderer.on(
      "online-patch-progress",
      (_, progress: InstallProgress) => {
        setPatchingOnline(true);
        setPatchProgress(progress);
      },
    );
    window.ipcRenderer.on("online-patch-finished", () => {
      setPatchingOnline(false);
    });
    window.ipcRenderer.on(
      "online-unpatch-progress",
      (_, progress: InstallProgress) => {
        setPatchingOnline(true);
        setPatchProgress(progress);
      },
    );
    window.ipcRenderer.on("online-unpatch-finished", () => {
      setPatchingOnline(false);
    });
    window.ipcRenderer.on("online-unpatch-error", (_, error: string) => {
      setPatchingOnline(false);
      console.error("Online unpatch error:", error);
      alert(`Disable patch failed: ${error}`);
    });
    window.ipcRenderer.on("online-patch-error", (_, error: string) => {
      setPatchingOnline(false);
      console.error("Online patch error:", error);
      alert(`Online patch failed: ${error}`);
    });
    window.ipcRenderer.on("install-started", () => {
      setInstalling(true);
      setCancelingBuildDownload(false);
    });
    window.ipcRenderer.on("install-finished", (_, version) => {
      setInstalling(false);
      setInstallingVersion(null);
      setCancelingBuildDownload(false);

      
      try {
        localStorage.setItem(
          `selectedVersion:${version.type}`,
          String(version.build_index),
        );
      } catch {
        
      }

      const applyInstalled = (list: GameVersion[]) => {
        const next = list.map((v) =>
          v.type === version.type && v.build_index === version.build_index
            ? { ...v, installed: true }
            : v,
        );

        
        if (
          !next.some(
            (v) =>
              v.type === version.type && v.build_index === version.build_index,
          )
        ) {
          next.unshift({
            ...version,
            installed: true,
          });
        }

        
        next.sort((a, b) => b.build_index - a.build_index);
        return next;
      };

      if (version.type === "release") {
        setReleaseVersions((prev) => {
          const next = applyInstalled(prev);
          const idx = next.findIndex(
            (v) => v.build_index === version.build_index,
          );
          if (idx !== -1) {
            setSelectedIndexByType((p) => ({ ...p, release: idx }));
          }
          return next;
        });
      } else {
        setPreReleaseVersions((prev) => {
          const next = applyInstalled(prev);
          const idx = next.findIndex(
            (v) => v.build_index === version.build_index,
          );
          if (idx !== -1) {
            setSelectedIndexByType((p) => ({ ...p, "pre-release": idx }));
          }
          return next;
        });
      }

      
      void checkForUpdates("manual");
    });
    window.ipcRenderer.on("install-error", (_, error) => {
      setInstalling(false);
      setInstallingVersion(null);
      setCancelingBuildDownload(false);
      alert(`Installation failed: ${error}`);
    });

    window.ipcRenderer.on("install-cancelled", () => {
      
      setInstalling(false);
      setInstallingVersion(null);
      setCancelingBuildDownload(false);
    });

    window.ipcRenderer.on("install-cancel-not-possible", () => {
      
      setCancelingBuildDownload(false);
    });

    (async () => {
      const defaultGameDirectory =
        await window.config.getDefaultGameDirectory();

      setGameDir(defaultGameDirectory);
    })();
  }, []);

  useEffect(() => {
    if (!gameDir) return;
    
    checkForUpdates("startup");
  }, [gameDir, checkForUpdates]);

  useEffect(() => {
    if (!availableVersions.length) return;
    const selected = availableVersions[selectedVersion];
    if (!selected) return;
    localStorage.setItem(
      `selectedVersion:${versionType}`,
      selected.build_index.toString(),
    );
  }, [selectedVersion, availableVersions]);

  return (
    <GameContext.Provider
      value={{
        gameDir,
        versionType,
        setVersionType,
        availableVersions,
        setAvailableVersions,
        selectedVersion,
        setSelectedVersion,
        updateAvailable,
        updateDismissed,
        dismissUpdateForNow,
        restoreUpdatePrompt,
        installing,
        installProgress,
        installingVersion,
        cancelBuildDownload,
        cancelingBuildDownload,
        patchingOnline,
        patchProgress,
        pendingOnlinePatch: false,
        checkingUpdates,
        launching,
        gameLaunched,
        installGame,
        launchGame,
        checkForUpdates,
        startPendingOnlinePatch: () => { },
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context)
    throw new Error("useGameContext must be used within a GameContextProvider");
  return context;
};
