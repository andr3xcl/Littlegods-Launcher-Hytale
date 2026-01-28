import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGameContext } from "../hooks/gameContext";
import { useUserContext } from "../hooks/userContext";
import { useI18n } from "../hooks/i18nContext";
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
  IconTerminal2
} from "@tabler/icons-react";
import cn from "../utils/cn";
import ConfirmModal from "./ConfirmModal";
import SettingsModal from "./SettingsModal";
import ConsoleModal from "./ConsoleModal";
import ModsView from "./ModsView";
import ScreenshotsView from "./ScreenshotsView";
import logo from "../assets/logo.png";

type NewsItem = {
  title: string;
  description: string;
  destUrl: string;
  imageUrl: string;
};

const Launcher: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
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
  const [activeTab, setActiveTab] = useState<"home" | "mods" | "screenshots">("home");
  const [nixInstalled, setNixInstalled] = useState(true);
  const [installingNix, setInstallingNix] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [nixWarningOpen, setNixWarningOpen] = useState(false);

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
      try {
        const items = await window.ipcRenderer.invoke("news:get");
        if (items && items.length > 0) {
          const processedItems = items.map((item: any) => ({
            ...item,
            imageUrl: item.imageUrl ? `https://corsproxy.io/?${encodeURIComponent(item.imageUrl)}` : ""
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
  }, []);

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
      launchGame(selected, username);
    }
  }, [selected, username, installGame, launchGame]);

  const handleLaunch = useCallback(() => {
    if (!selected || !username) return;
    if (window.config.OS === "linux" && !nixInstalled) {
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
        alert("La instalación automática falló. Por favor, revisa los mensajes en la terminal o instala Nix manualmente.");
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
        <div className="p-8 border-b border-white/5 flex flex-col items-center">
          <img src={logo} alt="LittleGods Logo" className="w-32 h-auto mb-2 drop-shadow-2xl" />
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hytale Launcher</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "home"
                ? "bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <IconHome size={18} />
            {t.home}
          </button>

          <button
            onClick={() => setActiveTab("mods")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "mods"
                ? "bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <IconPuzzle size={18} />
            {t.mods}
          </button>

          <button
            onClick={() => setActiveTab("screenshots")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "screenshots"
                ? "bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <IconPhoto size={18} />
            {trans.screenshots.title}
          </button>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-1">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white/5 rounded-xl border border-white/5">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
            <span className="text-xs font-black text-gray-200 tracking-wider truncate">{username}</span>
          </div>

          <button
            onClick={() => window.config?.openExternal?.("https://dsc.gg/littlegods")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/5 hover:text-white transition-all no-drag"
          >
            <IconBrandDiscord size={18} />
            {t.discord}
          </button>

          <button
            onClick={() => setShowConsole(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <IconTerminal2 size={18} />
            {window.config.OS === "linux" ? t.shell_bash : t.shell_generic}
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <IconSettings size={18} />
            {t.settings}
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all font-black"
            >
              <IconLogout size={18} />
              {t.logout}
            </button>
          )}
        </div>
      </div>

      {}
      <div className="flex-1 flex flex-col h-screen relative">
        <DragBar />

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === "home" ? (
            <div className="max-w-5xl mx-auto p-12 space-y-10 animate-slideUp">
              {}
              <div className="glass-panel rounded-[48px] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">{t.selected_version}</h3>
                    <button
                      onClick={() => setVersionsOpen(!versionsOpen)}
                      className="flex items-center gap-3 text-2xl font-black text-white hover:text-blue-500 transition-all tracking-tight"
                    >
                      {selectedLabel}
                      <IconChevronDown size={24} className={cn("transition-transform duration-300", versionsOpen && "rotate-180")} />
                    </button>
                  </div>

                  <div className="flex p-1 bg-white/5 rounded-2xl">
                    <button
                      onClick={() => setVersionType("release")}
                      className={cn(
                        "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                        versionType === "release"
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {t.stable}
                    </button>
                    <button
                      onClick={() => setVersionType("pre-release")}
                      className={cn(
                        "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                        versionType === "pre-release"
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {t.beta}
                    </button>
                  </div>
                </div>

                {}
                {versionsOpen && (
                  <div className="border-t border-white/5 pt-8 pb-4 space-y-2 max-h-72 overflow-y-auto animate-slideIn">
                    {availableVersions.map((v, idx) => (
                      <div
                        key={`${v.type}:${v.build_index}`}
                        onClick={() => {
                          setSelectedVersion(idx);
                          setVersionsOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all border",
                          selectedVersion === idx
                            ? "bg-white/10 border-blue-500/50 shadow-sm"
                            : "bg-white/5 border-white/5 hover:border-white/10"
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-white tracking-tight">
                            {v.build_name || `Build-${v.build_index}`}
                          </span>
                          {v.installed && (
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{t.installed}</span>
                          )}
                        </div>
                        {v.installed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVersion(v);
                            }}
                            className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                          >
                            <IconTrash size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {}
                {(installing || patchingOnline || installingNix) ? (
                  <div className="mt-8 p-6 bg-white/5 rounded-[32px] border border-white/5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-300 uppercase tracking-widest">
                        {installing ? "Downloading..." : t.nix_installing}
                      </span>
                      {!installingNix && (
                        <span className="text-xs font-black text-blue-400">
                          {Math.round((installing ? installProgress?.percent : patchingOnline ? patchProgress?.percent : -1) || 0)}%
                        </span>
                      )}
                    </div>

                    {installingNix ? (
                      <button
                        onClick={() => setShowConsole(true)}
                        className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        <IconTerminal2 size={16} />
                        {t.nix_bash_log.replace("{shell}", window.config.OS === "linux" ? t.shell_bash : t.shell_generic)}
                      </button>
                    ) : (
                      <ProgressBar progress={installing ? installProgress : patchingOnline ? patchProgress : { percent: -1, phase: "online-patch" }} />
                    )}

                    {installing && installProgress?.phase === "pwr-download" && (
                      <button
                        onClick={cancelBuildDownload}
                        className="mt-4 text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-all"
                      >
                        {t.cancel}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 flex gap-4">
                    {!nixInstalled && window.config.OS === "linux" && (
                      <button
                        onClick={handleInstallNix}
                        disabled={installingNix}
                        className="flex-1 bg-white/5 border border-white/10 text-white px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <IconDownload size={18} />
                        {t.install} Nix
                      </button>
                    )}
                    <button
                      onClick={needsFixClient ? fixClient : handleLaunch}
                      disabled={launching || gameLaunched}
                      className="flex-[2] bg-blue-600 text-white px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-[0_8px_32px_rgba(59,130,246,0.3)] flex items-center justify-center gap-3 active:scale-95"
                    >
                      {needsFixClient ? t.fix_client : (
                        availableVersions[selectedVersion]?.installed ? (
                          gameLaunched ? t.running : (
                            <>
                              <IconPlayerPlay size={20} />
                              {t.launch}
                            </>
                          )
                        ) : (
                          <>
                            <IconDownload size={20} />
                            {t.install}
                          </>
                        )
                      )}
                    </button>

                    {patchAvailable && !needsFixClient && (
                      <button
                        onClick={() => {
                          if (onlinePatchEnabled && patchOutdated) return startOnlinePatch();
                          if (onlinePatchEnabled) return disableOnlinePatch();
                          setPatchConfirmOpen(true);
                        }}
                        className={cn(
                          "flex-1 px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 active:scale-95",
                          onlinePatchEnabled
                            ? "bg-transparent border-blue-500 text-blue-400 hover:bg-blue-500/10"
                            : "bg-white/5 border-transparent text-gray-300 hover:bg-white/10"
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
                <div className="bg-blue-600/80 border border-white/10 rounded-[32px] p-6 flex items-center justify-between shadow-xl backdrop-blur-md animate-slideIn">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <IconDownload size={28} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white tracking-tight">{t.update_available}</h4>
                      <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{latestRelease?.build_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={dismissUpdateForNow} className="px-6 py-3 text-xs font-black text-white/80 hover:text-white uppercase tracking-widest transition-all">{t.dismiss}</button>
                    <button onClick={handleLaunch} className="px-8 py-3 bg-white text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg">{t.install}</button>
                  </div>
                </div>
              )}

              {}
              <div className="space-y-6 pb-12">
                <h3 className="text-2xl font-black text-white tracking-tight">{t.news}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {newsItems.slice(0, 10).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.destUrl && window.config?.openExternal?.(item.destUrl)}
                      className="group relative glass-card rounded-[40px] overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-gray-100 relative">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        )}
                        <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
                          <span className="px-3 py-1.5 bg-blue-600 text-[9px] font-black text-white uppercase rounded-lg tracking-widest shadow-lg">NEWS</span>
                          <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md">RECENT</span>
                        </div>
                      </div>
                      <div className="p-8">
                        <h4 className="text-xl font-black text-white mb-3 group-hover:text-blue-400 transition-colors tracking-tight line-clamp-1">{item.title}</h4>
                        <p className="text-sm text-gray-400 font-medium line-clamp-2 leading-relaxed opacity-80">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === "mods" ? (
            <ModsView onBack={() => setActiveTab("home")} />
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

      {}
      {nixWarningOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fadeIn p-8"
          onClick={() => setNixWarningOpen(false)}
        >
          <div
            className="glass-panel max-w-md w-full p-12 rounded-[56px] flex flex-col gap-8 animate-slideUp border border-blue-500/20 shadow-huge"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20 mb-2">
                <IconPlayerPlay size={32} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-3xl font-black text-white tracking-tight leading-tight">{t.nix_greeting_title.replace("{username}", username)}</h3>
                <p className="text-sm font-medium text-gray-400 leading-relaxed">
                  {t.nix_greeting_msg}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center px-4 mb-2">{t.nix_greeting_thanks}</p>
              <button
                onClick={() => {
                  setNixWarningOpen(false);
                  executeLaunch();
                }}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/40 active:scale-95"
              >
                {t.nix_greeting_continue}
              </button>
              <button onClick={() => setNixWarningOpen(false)} className="w-full py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all">{t.nix_greeting_close}</button>
            </div>
          </div>
        </div>
      )}

      {versionToDelete && (
        <ConfirmModal
          open={deleteConfirmOpen}
          title="Delete Version"
          message={trans.settings.delete_confirm.replace("{name}", versionToDelete.build_name ?? `Build-${versionToDelete.build_index}`)}
          confirmText="Delete"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8" onClick={() => setPatchConfirmOpen(false)}>
          <div className="glass-panel max-w-lg w-full p-12 rounded-[56px] animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">{t.patch_enable}</h2>
            <p className="text-sm font-medium text-gray-400 mb-8 leading-relaxed">
              {selected.patch_note?.trim() || "This will enable online patching for this version. You can disable it later."}
            </p>
            <div className="flex gap-4">
              <button onClick={() => setPatchConfirmOpen(false)} className="flex-1 py-4 bg-white/5 text-gray-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={() => { setPatchConfirmOpen(false); startOnlinePatch(); }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/30">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Launcher;
