import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGameContext } from "../hooks/gameContext";
import { useUserContext } from "../hooks/userContext";
import { useI18n } from "../hooks/i18nContext";
import { useMusic } from "../hooks/useMusic";
import { useSoundEffects } from "../hooks/useSoundEffects";
import DragBar from "./DragBar";
import ProgressBar from "./ProgressBar";
import {
  IconChevronDown,
  IconTrash,
  IconSettings,
  IconBrandDiscord,
  IconLogout,
  IconHome,
  IconPhoto,
  IconPuzzle,
  IconDownload,
  IconPlayerPlay,
  IconTerminal2,
  IconServer,
  IconWorld
} from "@tabler/icons-react";
import cn from "../utils/cn";
import ConfirmModal from "./ConfirmModal";
import SettingsModal from "./SettingsModal";
import ConsoleModal from "./ConsoleModal";
import ModsView from "./ModsView";
import ServersView from "./ServersView";
import SavesView from "./SavesView";
import GameSettingsView from "./GameSettingsView";
import ScreenshotsView from "./ScreenshotsView";
import ProfileModal from "./ProfileModal";
import NewsModal from "./NewsModal";
import logo from "../assets/logo.png";

type NewsItem = {
  title: string;
  description: string;
  destUrl: string;
  imageUrl: string;
  slug?: string;
  date?: string;
};

const Launcher: React.FC<{ onLogout?: () => void; isOffline?: boolean }> = ({ onLogout, isOffline }) => {
  const {
    gameDir,
    versionType,
    setVersionType,
    availableVersions,
    selectedVersion,
    setAvailableVersions,
    setSelectedVersion,
    updateAvailable,
    updateDismissed,
    dismissUpdateForNow,
    installing,
    installProgress,
    cancelBuildDownload,
    patchingOnline,
    patchProgress,
    installGame,
    launchGame,
    launching,
    gameLaunched,
  } = useGameContext();
  const { currentProfile } = useUserContext();
  const { t: trans } = useI18n();
  const t = trans.launcher;

  const { isPlaying } = useMusic();
  const { playHoverSound, playLaunchSound, playSelectSound, playErrorSound } = useSoundEffects();

  const username = currentProfile?.username || "Player";

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([
    {
      title: "Hytale Early Access",
      description: "Hytale is now available in Early Access. Join the adventure!",
      destUrl: "https://hytale.com",
      imageUrl: ""
    },
    {
      title: "Latest Updates",
      description: "Check the official website for the latest news and patch notes",
      destUrl: "https://hytale.com/news",
      imageUrl: ""
    }
  ]);

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [patchConfirmOpen, setPatchConfirmOpen] = useState(false);
  const [onlinePatchEnabled, setOnlinePatchEnabled] = useState(false);
  const [needsFixClient, setNeedsFixClient] = useState(false);
  const [patchOutdated, setPatchOutdated] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"home" | "mods" | "servers" | "saves" | "screenshots" | "game-settings">("home");
  const [nixInstalled, setNixInstalled] = useState(true);
  const [installingNix, setInstallingNix] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [nixWarningOpen, setNixWarningOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [newsOpen, setNewsOpen] = useState(false);

  const latestRelease =
    versionType === "release"
      ? (availableVersions.find((v) => v.isLatest) ??
        availableVersions[0] ??
        null)
      : null;

  const selected = availableVersions[selectedVersion];
  const selectedLabel = selected
    ? selected.build_name?.trim() || `Build-${selected.build_index}`
    : "";

  const patchAvailable =
    !!selected &&
    !!selected.installed &&
    !!selected.patch_url &&
    !!selected.patch_hash;

  const onlinePatchHealthSeq = useRef(0);

  const refreshOnlinePatchHealth = useCallback(async () => {
    const seq = ++onlinePatchHealthSeq.current;
    if (!patchAvailable || !gameDir || !selected) {
      setOnlinePatchEnabled(false);
      setNeedsFixClient(false);
      setPatchOutdated(false);
      return;
    }

    const result = await window.ipcRenderer.invoke(
      "online-patch:health",
      gameDir,
      selected,
    );
    if (seq !== onlinePatchHealthSeq.current) return;

    setOnlinePatchEnabled(result.enabled);
    setNeedsFixClient(result.needsFixClient);
    setPatchOutdated(result.patchOutdated);
  }, [patchAvailable, gameDir, selected]);

  useEffect(() => {
    refreshOnlinePatchHealth();
  }, [refreshOnlinePatchHealth]);

  const showUpdate =
    updateAvailable &&
    !updateDismissed &&
    !!latestRelease &&
    !latestRelease.installed;

  useEffect(() => {
    const load = async () => {
      if (isOffline) {
        playErrorSound();
        setNewsItems([{
          title: t.offline_mode,
          description: t.offline_msg,
          destUrl: "",
          imageUrl: ""
        }]);
        return;
      }

      try {
        const items = await window.ipcRenderer.invoke("news:get");
        if (items && items.length > 0) {
          const processedItems = items.map((item: any) => ({
            ...item,
            imageUrl: item.imageUrl ? `media://${encodeURIComponent(item.imageUrl)}` : ""
          }));
          setNewsItems(processedItems);
        }
      } catch (err) {
        console.error("[News] Error loading news:", err);
      }
    };
    load();

    if (window.config.OS === "linux") {
      const checkNix = async () => {
        const installed = await window.ipcRenderer.invoke("nix:check");
        setNixInstalled(installed);
      };
      checkNix();
    }
  }, [isOffline, t]);

  useEffect(() => {
    const onPatched = () => refreshOnlinePatchHealth();
    const onUnpatched = () => refreshOnlinePatchHealth();
    const onNixChanged = (_: any, installed: boolean) => setNixInstalled(installed);
    const onProgress = (_: any, progress: any) => {
      if (progress.phase === "nix-install" || progress.phase === "nix-uninstall") {
        if (progress.message) {
          setLogs(prev => [...prev.slice(-499), `[${new Date().toLocaleTimeString()}] ${progress.message}`]);
        }
      }
    };

    window.ipcRenderer.on("online-patch-finished", onPatched);
    window.ipcRenderer.on("online-unpatch-finished", onUnpatched);
    window.ipcRenderer.on("nix-status-changed", onNixChanged);
    window.ipcRenderer.on("install-progress", onProgress);

    return () => {
      window.ipcRenderer.off("online-patch-finished", onPatched);
      window.ipcRenderer.off("online-unpatch-finished", onUnpatched);
      window.ipcRenderer.off("nix-status-changed", onNixChanged);
      window.ipcRenderer.off("install-progress", onProgress);
    };
  }, [refreshOnlinePatchHealth]);

  const executeLaunch = useCallback(() => {
    if (!selected || !username) return;
    if (!selected.installed) {
      installGame(selected);
    } else {
      launchGame(selected, username, currentProfile?.uuid);
    }
  }, [selected, username, installGame, launchGame, currentProfile]);

  const handleLaunch = useCallback(() => {
    if (!selected || !username) return;
    if (window.config.OS === "linux" && !nixInstalled && selected.installed) {
      setNixWarningOpen(true);
      return;
    }
    executeLaunch();
  }, [selected, username, nixInstalled, executeLaunch]);

  const startOnlinePatch = () => {
    if (!gameDir || !selected) return;
    window.ipcRenderer.send("online-patch:enable", gameDir, selected);
  };

  const disableOnlinePatch = () => {
    if (!gameDir || !selected) return;
    window.ipcRenderer.send("online-patch:disable", gameDir, selected);
  };

  const fixClient = () => {
    if (!gameDir || !selected) return;
    window.ipcRenderer.send("online-patch:fix-client", gameDir, selected);
  };

  const handleInstallNix = async () => {
    setInstallingNix(true);
    try {
      const success = await window.ipcRenderer.invoke("nix:install");
      if (success) {
        setNixInstalled(true);
      } else {
        alert(t.nix_fail);
      }
    } catch (err) {
      console.error("Nix installation error:", err);
    } finally {
      setInstallingNix(false);
    }
  };

  const deleteVersion = async (v: any) => {
    setVersionToDelete(v);
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="w-full h-full min-h-screen flex animate-fadeIn bg-transparent">
      {}
      <div className="w-64 glass-sidebar flex flex-col z-20">
        <div className="p-6 border-b border-white/5 flex flex-col items-center">
          <div className={cn(
            "perspective-1000 group/logo cursor-pointer transition-all duration-500",
            isPlaying && "music-rainbow"
          )}>
            <img
              src={logo}
              alt="LittleGods Logo"
              className="w-20 h-auto mb-2 drop-shadow-2xl transition-all duration-500 ease-out 
                         group-hover/logo:[transform:rotateX(15deg)_rotateY(-15deg)_scale(1.05)] 
                         group-active/logo:[transform:rotateX(25deg)_rotateY(-25deg)_scale(0.95)]"
            />
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Hytale Launcher</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => {
              setActiveTab("home");
              playSelectSound();
            }}
            onMouseEnter={playHoverSound}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "home"
                ? "bg-[var(--color-accent-emphasis)] text-white shadow-md mx-2 border border-white/10"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] hover:translate-x-1"
            )}
          >
            <IconHome size={18} />
            {t.home}
          </button>

          <button
            onClick={() => {
              setActiveTab("mods");
              playSelectSound();
            }}
            onMouseEnter={playHoverSound}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "mods"
                ? "bg-[var(--color-accent-emphasis)] text-white shadow-md mx-2 border border-white/10"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] hover:translate-x-1"
            )}
          >
            <IconPuzzle size={18} />
            {t.mods}
          </button>

          <button
            onClick={() => {
              setActiveTab("servers");
              playSelectSound();
            }}
            onMouseEnter={playHoverSound}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "servers"
                ? "bg-[var(--color-accent-emphasis)] text-white shadow-md mx-2 border border-white/10"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] hover:translate-x-1"
            )}
          >
            <IconServer size={18} />
            {t.servers}
          </button>

          <button
            onClick={() => {
              setActiveTab("saves");
              playSelectSound();
            }}
            onMouseEnter={playHoverSound}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "saves"
                ? "bg-[var(--color-accent-emphasis)] text-white shadow-md mx-2 border border-white/10"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] hover:translate-x-1"
            )}
          >
            <IconWorld size={18} />
            {t.saves}
          </button>

          <button
            onClick={() => {
              setActiveTab("game-settings");
              playSelectSound();
            }}
            onMouseEnter={playHoverSound}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "game-settings"
                ? "bg-[var(--color-accent-emphasis)] text-white shadow-md mx-2 border border-white/10"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] hover:translate-x-1"
            )}
          >
            <IconSettings size={18} />
            {t.game_settings}
          </button>

          <button
            onClick={() => {
              setActiveTab("screenshots");
              playSelectSound();
            }}
            onMouseEnter={playHoverSound}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "screenshots"
                ? "bg-[var(--color-accent-emphasis)] text-white shadow-md mx-2 border border-white/10"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] hover:translate-x-1"
            )}
          >
            <IconPhoto size={18} />
            {trans.screenshots.title}
          </button>
        </nav>

        <div className="p-4 border-t border-[var(--color-border-default)] space-y-1 mt-auto bg-[var(--color-canvas-default)]">
          <div
            onClick={() => { setProfileOpen(true); playSelectSound(); }}
            onMouseEnter={playHoverSound}
            className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-[var(--color-canvas-subtle)] rounded-xl border border-[var(--color-border-muted)] hover:bg-[var(--color-btn-hover-bg)] hover:border-[var(--color-accent-emphasis)]/30 transition-all cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-black/20 border-2 border-[var(--color-accent-emphasis)]/30 group-hover:border-[var(--color-accent-emphasis)] transition-all flex items-center justify-center">
                {currentProfile?.photo ? (
                  <img src={currentProfile.photo} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src="media://raw/icon_profile/default_profile.png" alt="Avatar" className="w-full h-full object-cover opacity-50" />
                )}
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--color-canvas-default)]",
                isOffline ? "bg-[var(--color-fg-muted)]" : "bg-[var(--color-success-fg)] shadow-[0_0_10px_var(--color-success-fg)]"
              )}></div>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-black text-[var(--color-fg-default)] tracking-wider truncate uppercase">{username}</span>
              <span className="text-[8px] font-black text-[var(--color-fg-muted)] uppercase tracking-widest leading-none">
                {isOffline ? "Offline" : "Online"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.config?.openExternal?.("https://dsc.gg/littlegods")}
              onMouseEnter={playHoverSound}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-[8px] font-black uppercase tracking-widest text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-accent-fg)] transition-all no-drag border border-[var(--color-border-muted)]"
            >
              <IconBrandDiscord size={20} />
              Discord
            </button>

            <button
              onClick={() => {
                setSettingsOpen(true);
                playSelectSound();
              }}
              onMouseEnter={playHoverSound}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-[8px] font-black uppercase tracking-widest text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] transition-all border border-[var(--color-border-muted)]"
            >
              <IconSettings size={20} />
              {t.settings}
            </button>
          </div>

          <button
            onClick={() => setShowConsole(true)}
            onMouseEnter={playHoverSound}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-fg-muted)] hover:bg-[var(--color-canvas-subtle)] hover:text-[var(--color-fg-default)] transition-all"
          >
            <IconTerminal2 size={16} />
            {window.config.OS === "linux" ? t.shell_bash : t.shell_generic}
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              onMouseEnter={playHoverSound}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-danger-emphasis)] hover:bg-[var(--color-danger-emphasis)]/10 transition-all"
            >
              <IconLogout size={16} />
              {t.logout}
            </button>
          )}
        </div>
      </div>

      {}
      <div className="flex-1 flex flex-col h-screen relative bg-[var(--color-canvas-default)]">
        <DragBar />

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === "home" ? (
            <div className="max-w-5xl mx-auto p-8 space-y-6 animate-slideUp">
              {}
              <div className="gh-box p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide mb-1">{t.selected_version}</h3>
                    <button
                      onClick={() => setVersionsOpen(!versionsOpen)}
                      className="flex items-center gap-2 text-xl font-bold text-[var(--color-fg-default)] hover:text-[var(--color-accent-fg)] transition-all"
                    >
                      {selectedLabel}
                      <IconChevronDown size={20} className={cn("transition-transform duration-300", versionsOpen && "rotate-180")} />
                    </button>
                  </div>

                  <div className="flex bg-[var(--color-canvas-subtle)] rounded-md border border-[var(--color-border-default)]">
                    <button
                      onClick={() => setVersionType("release")}
                      className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-l-md transition-all border-r border-[var(--color-border-default)]",
                        versionType === "release"
                          ? "bg-[var(--color-btn-selected-bg)] text-[var(--color-fg-default)]"
                          : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-btn-hover-bg)]"
                      )}
                    >
                      {t.stable}
                    </button>
                    <button
                      onClick={() => setVersionType("pre-release")}
                      className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-r-md transition-all",
                        versionType === "pre-release"
                          ? "bg-[var(--color-btn-selected-bg)] text-[var(--color-fg-default)]"
                          : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-btn-hover-bg)]"
                      )}
                    >
                      {t.beta}
                    </button>
                  </div>
                </div>

                {}
                {versionsOpen && (
                  <div className="border border-[var(--color-border-default)] rounded-md mb-6 max-h-72 overflow-y-auto animate-slideIn bg-[var(--color-canvas-subtle)]">
                    {availableVersions.map((v, idx) => (
                      <div
                        key={`${v.type}:${v.build_index}`}
                        onClick={() => {
                          setSelectedVersion(idx);
                          setVersionsOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 cursor-pointer transition-all border-b border-[var(--color-border-muted)] last:border-0",
                          selectedVersion === idx
                            ? "bg-[var(--color-btn-selected-bg)]"
                            : "hover:bg-[var(--color-btn-hover-bg)]"
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-[var(--color-fg-default)]">
                            {v.build_name || `Build-${v.build_index}`}
                          </span>
                          {v.installed && (
                            <span className="text-[10px] font-medium text-[var(--color-accent-fg)] uppercase">Installed</span>
                          )}
                        </div>
                        {v.installed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVersion(v);
                            }}
                            className="p-1.5 text-[var(--color-danger-emphasis)] hover:bg-[var(--color-canvas-default)] rounded transition-all"
                          >
                            <IconTrash size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {}
                {(installing || patchingOnline || installingNix) ? (
                  <div className="mt-4 p-4 bg-[var(--color-canvas-subtle)] rounded-md border border-[var(--color-border-default)] flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[var(--color-fg-default)] uppercase">
                        {installing ? t.downloading : (patchingOnline ? t.patch_installing : t.nix_installing)}
                      </span>
                      {!installingNix && (
                        <span className="text-xs font-bold text-[var(--color-accent-fg)]">
                          {Math.round((installing ? installProgress?.percent : patchingOnline ? patchProgress?.percent : -1) || 0)}%
                        </span>
                      )}
                    </div>

                    {installingNix ? (
                      <button
                        onClick={() => setShowConsole(true)}
                        className="gh-btn w-full flex items-center justify-center gap-2"
                      >
                        <IconTerminal2 size={14} />
                        {t.nix_bash_log.replace("{shell}", window.config.OS === "linux" ? t.shell_bash : t.shell_generic)}
                      </button>
                    ) : (
                      <ProgressBar progress={installing ? installProgress : patchingOnline ? patchProgress : { percent: -1, phase: "online-patch" }} />
                    )}

                    {installing && installProgress?.phase === "pwr-download" && (
                      <button
                        onClick={cancelBuildDownload}
                        className="mt-2 text-xs font-semibold text-[var(--color-danger-emphasis)] hover:underline"
                      >
                        {t.cancel_download}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 flex gap-3">
                    {!nixInstalled && window.config.OS === "linux" && (
                      <button
                        onClick={handleInstallNix}
                        disabled={installingNix}
                        className="gh-btn flex-1 flex items-center justify-center gap-2 py-2"
                      >
                        <IconDownload size={16} />
                        {t.install} Nix
                      </button>
                    )}
                    <button
                      onClick={() => {
                        needsFixClient ? fixClient() : handleLaunch();
                        playLaunchSound();
                      }}
                      disabled={launching || gameLaunched}
                      className="flex-[2] gh-btn gh-btn-primary py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                    >
                      {needsFixClient ? t.fix_client : (
                        availableVersions[selectedVersion]?.installed ? (
                          gameLaunched ? t.running : (
                            <>
                              <IconPlayerPlay size={18} />
                              {t.launch}
                            </>
                          )
                        ) : (
                          <>
                            <IconDownload size={18} />
                            {t.install}
                          </>
                        )
                      )}
                    </button>

                    {patchAvailable && !needsFixClient && (
                      <button
                        onClick={() => {
                          const onPatchAvailable = () => {
                            const ok = confirm(t.patch_available_msg);
                            if (ok) startOnlinePatch();
                          };
                          if (onlinePatchEnabled && patchOutdated) return onPatchAvailable();
                          if (onlinePatchEnabled) return disableOnlinePatch();
                          setPatchConfirmOpen(true);
                        }}
                        className={cn(
                          "gh-btn flex-1 py-2 text-xs font-bold uppercase tracking-wide",
                          onlinePatchEnabled
                            ? "text-[var(--color-accent-fg)] border-[var(--color-accent-emphasis)]"
                            : ""
                        )}
                      >
                        {onlinePatchEnabled ? (patchOutdated ? t.patch_update : t.patched) : t.patch_enable}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {}
              {showUpdate && (
                <div className="bg-[var(--color-canvas-subtle)] border-l-4 border-[var(--color-accent-emphasis)] p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[var(--color-accent-emphasis)] rounded-full text-white">
                      <IconDownload size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-fg-default)]">{t.update_available}</h4>
                      <p className="text-xs text-[var(--color-fg-muted)]">{latestRelease?.build_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={dismissUpdateForNow} className="gh-btn text-xs">{t.dismiss}</button>
                    <button onClick={handleLaunch} className="gh-btn gh-btn-primary text-xs">{t.install}</button>
                  </div>
                </div>
              )}

              {}
              <div className="space-y-4 pb-12">
                <h3 className="text-lg font-bold text-[var(--color-fg-default)] pb-2 border-b border-[var(--color-border-muted)]">{t.news}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newsItems.slice(0, 10).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (item.slug) {
                          setSelectedNews(item);
                          setNewsOpen(true);
                          playSelectSound();
                        } else if (item.destUrl) {
                          window.config?.openExternal?.(item.destUrl);
                        }
                      }}
                      className="group relative gh-box overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                    >
                      <div className="aspect-[16/9] w-full overflow-hidden bg-[var(--color-canvas-subtle)] relative border-b border-[var(--color-border-muted)]">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 bg-[var(--color-accent-emphasis)] text-[10px] font-bold text-white rounded shadow-sm uppercase">News</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="text-base font-bold text-[var(--color-fg-default)] mb-2 group-hover:text-[var(--color-accent-fg)] transition-colors line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-[var(--color-fg-muted)] line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === "mods" ? (
            <ModsView onBack={() => setActiveTab("home")} isOffline={isOffline} />
          ) : activeTab === "servers" ? (
            <ServersView />
          ) : activeTab === "saves" ? (
            <SavesView />
          ) : activeTab === "game-settings" ? (
            <GameSettingsView />
          ) : (
            <ScreenshotsView />
          )}
        </main>
      </div>

      {}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={onLogout}
        onShowConsole={() => setShowConsole(true)}
      />

      <ConsoleModal
        open={showConsole}
        onClose={() => setShowConsole(false)}
        logs={logs}
        onClear={() => setLogs([])}
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      <NewsModal
        open={newsOpen}
        onClose={() => setNewsOpen(false)}
        item={selectedNews as any}
      />

      {}
      {nixWarningOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fadeIn p-8"
          onClick={() => setNixWarningOpen(false)}
        >
          <div
            className="glass-panel max-w-md w-full p-12 rounded-[56px] flex flex-col gap-8 animate-slideUp border border-[var(--color-accent-emphasis)]/20 shadow-huge"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="w-16 h-16 rounded-3xl bg-[var(--color-accent-emphasis)]/20 flex items-center justify-center text-[var(--color-accent-fg)] border border-[var(--color-accent-emphasis)]/20 mb-2">
                <IconPlayerPlay size={32} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-3xl font-black text-white tracking-tight leading-tight">{t.nix_greeting_title.replace("{username}", username)}</h3>
                <p className="text-sm font-medium text-[var(--color-fg-muted)] leading-relaxed">
                  {t.nix_greeting_msg}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-black text-[var(--color-fg-muted)] uppercase tracking-widest text-center px-4 mb-2">{t.nix_greeting_thanks}</p>
              <button
                onClick={() => {
                  setNixWarningOpen(false);
                  executeLaunch();
                  playLaunchSound();
                }}
                className="w-full py-5 gh-btn gh-btn-primary rounded-[24px] text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-[color-mix(in_srgb,var(--color-accent-emphasis),transparent_60%)] active:scale-95"
              >
                {t.nix_greeting_continue}
              </button>
              <button onClick={() => setNixWarningOpen(false)} className="w-full py-4 text-[9px] font-black text-[var(--color-fg-muted)] uppercase tracking-widest hover:text-white transition-all">{t.nix_greeting_close}</button>
            </div>
          </div>
        </div>
      )}

      {versionToDelete && (
        <ConfirmModal
          open={deleteConfirmOpen}
          title={t.delete_version_title}
          message={trans.settings.delete_confirm.replace("{name}", versionToDelete.build_name ?? `Build-${versionToDelete.build_index}`)}
          confirmText={t.delete}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={async () => {
            const v = versionToDelete;
            setVersionToDelete(null);
            setDeleteConfirmOpen(false);
            const result = await window.ipcRenderer.invoke("delete-installed-version", gameDir, v);
            if (result?.success) {
              const updated = availableVersions.map(ver => ver.build_index === v.build_index && ver.type === v.type ? { ...ver, installed: false } : ver);
              setAvailableVersions(updated);
            } else {
              alert(result?.error || "Failed to delete version");
            }
          }}
        />
      )}

      {patchConfirmOpen && selected && (
        <ConfirmModal
          open={patchConfirmOpen}
          title={t.patch_enable}
          message={selected.patch_note?.trim() || t.patch_confirm_msg}
          confirmText={t.confirm}
          cancelText={t.cancel}
          onCancel={() => setPatchConfirmOpen(false)}
          onConfirm={() => { setPatchConfirmOpen(false); startOnlinePatch(); }}
        />
      )}
    </div>
  );
};

export default Launcher;
