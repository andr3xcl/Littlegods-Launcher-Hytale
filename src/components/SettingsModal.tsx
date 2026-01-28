import React, { useEffect, useMemo, useState } from "react";
import { IconFolderOpen, IconX, IconWorld, IconTerminal2, IconRefresh, IconHistory } from "@tabler/icons-react";
import { useGameContext } from "../hooks/gameContext";
import { useI18n } from "../hooks/i18nContext";
import { useUserContext } from "../hooks/userContext";
import cn from "../utils/cn";
import { Language } from "../utils/i18n";

const SettingsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onLogout?: () => void;
  onShowConsole?: () => void;
}> = ({ open, onClose, onLogout, onShowConsole }) => {
  const {
    gameDir,
    checkForUpdates,
    checkingUpdates,
    installing,
    launcherUpdateStatus,
    launcherUpdateProgress,
    launcherUpdateError,
    quitAndInstallLauncher
  } = useGameContext();
  const { lang, setLang, t: trans } = useI18n();
  const { currentProfile, updateProfile } = useUserContext();
  const t = trans.settings;

  const [nixInstalled, setNixInstalled] = useState(false);
  const [uninstallingNix, setUninstallingNix] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);

  const [customUUID, setCustomUUID] = useState<string>(currentProfile?.uuid || "");
  const [defaultUUID, setDefaultUUID] = useState<string>("");
  const [enableRPC, setEnableRPC] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState(false);
  const [uuidHistory, setUuidHistory] = useState<string[]>([]);

  const normalizedUUID = useMemo(() => {
    const raw = customUUID.trim();
    if (!raw) return "";
    const compact = raw.replace(/-/g, "");
    if (/^[0-9a-fA-F]{32}$/.test(compact)) {
      const lower = compact.toLowerCase();
      return `${lower.slice(0, 8)}-${lower.slice(8, 12)}-${lower.slice(12, 16)}-${lower.slice(16, 20)}-${lower.slice(20)}`;
    }
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(raw)) {
      return raw.toLowerCase();
    }
    return "__invalid__";
  }, [customUUID]);

  const handleOpenGameDir = async () => {
    try {
      const dir = gameDir ?? (await window.config.getDefaultGameDirectory());
      await window.config.openFolder(dir);
    } catch (e) {
      alert("Failed to open game directory");
    }
  };

  const handleOpenModDir = async () => {
    try {
      const dir = gameDir ?? (await window.config.getDefaultGameDirectory());
      await window.config.openFolder(`${dir}/UserData/Mods`);
    } catch (e) {
      alert("Failed to open mods directory");
    }
  };

  useEffect(() => {
    if (!open) return;
    setCustomUUID(currentProfile?.uuid || "");
    setEnableRPC(localStorage.getItem("enableRPC") === "true");

    
    if (currentProfile) {
      const histKey = `uuid_history_${currentProfile.id}`;
      const saved = localStorage.getItem(histKey);
      if (saved) setUuidHistory(JSON.parse(saved));
    }

    
    if (currentProfile?.username) {
      window.config.getV5UUID(currentProfile.username).then(setDefaultUUID);
    }

    if (window.config.OS === "linux") {
      localStorage.setItem("linuxUseNixShell", "true");
      localStorage.removeItem("linuxForcePipeWire");

      const checkNix = async () => {
        const installed = await window.ipcRenderer.invoke("nix:check");
        setNixInstalled(installed);
      };
      checkNix();

      const onNixChanged = (_: any, installed: boolean) => setNixInstalled(installed);
      window.ipcRenderer.on("nix-status-changed", onNixChanged);
      return () => {
        window.ipcRenderer.off("nix-status-changed", onNixChanged);
      };
    }
  }, [open, currentProfile]);

  
  useEffect(() => {
    if (!open || !currentProfile) return;

    if (normalizedUUID && normalizedUUID !== "__invalid__") {
      updateProfile(currentProfile.id, { uuid: normalizedUUID });

      
      setUuidHistory(prev => {
        if (prev.includes(normalizedUUID)) return prev;
        const newHist = [normalizedUUID, ...prev].slice(0, 10);
        localStorage.setItem(`uuid_history_${currentProfile.id}`, JSON.stringify(newHist));
        return newHist;
      });
    } else if (!customUUID.trim()) {
      updateProfile(currentProfile.id, { uuid: "" });
    }
  }, [customUUID, normalizedUUID, open]);

  useEffect(() => {
    if (enableRPC) {
      localStorage.setItem("enableRPC", "true");
      window.ipcRenderer.send("rpc:enable", true);
    } else {
      localStorage.removeItem("enableRPC");
      window.ipcRenderer.send("rpc:enable", false);
    }
  }, [enableRPC]);

  const handleUninstallNix = async () => {
    setShowUninstallConfirm(false);
    setUninstallingNix(true);
    try {
      const result = await window.ipcRenderer.invoke("nix:uninstall");
      if (result) setNixInstalled(false);
      else alert("Hubo un error al intentar desinstalar Nix.");
    } catch (err) {
      console.error("Nix uninstall error:", err);
    } finally {
      setUninstallingNix(false);
    }
  };

  const handleRandomUUID = () => {
    setCustomUUID(crypto.randomUUID());
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] glass-panel rounded-[56px] p-10 flex flex-col animate-slideUp shadow-huge max-h-[90vh] overflow-y-auto no-drag custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-10 right-10 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all border border-white/5 z-[100] no-drag"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <IconX size={22} />
        </button>

        <div className="flex flex-col gap-1 mb-8">
          <h2 className="text-2xl font-black text-white tracking-tight">{t.title}</h2>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{t.subtitle}</p>
        </div>

        <div className="space-y-6">
          {}
          <div className="space-y-3">
            <span className="text-[9px] font-black tracking-widest uppercase text-gray-600 px-1">{t.game_dir}</span>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={handleOpenGameDir} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl hover:bg-white/10 group transition-all text-[11px] font-bold text-gray-300 border border-white/5 no-drag">
                <span>{t.game_files}</span>
                <IconFolderOpen size={16} className="text-blue-500 opacity-40 group-hover:opacity-100" />
              </button>
              <button onClick={handleOpenModDir} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl hover:bg-white/10 group transition-all text-[11px] font-bold text-gray-300 border border-white/5 no-drag">
                <span>{t.mod_dir}</span>
                <IconFolderOpen size={16} className="text-blue-500 opacity-40 group-hover:opacity-100" />
              </button>
            </div>
          </div>

          {}
          <div className="space-y-3">
            <span className="text-[9px] font-black tracking-widest uppercase text-gray-600 px-1">{t.custom_uuid}</span>
            <div className="flex flex-col gap-3">
              <div className="relative group">
                <input
                  value={customUUID}
                  onChange={(e) => setCustomUUID(e.target.value)}
                  placeholder={defaultUUID || t.uuid_placeholder}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl pl-4 pr-12 py-4 text-[10px] font-bold text-white text-center outline-none focus:border-blue-500/50 focus:bg-white/10 no-drag transition-all"
                />
                <button
                  onClick={() => setShowHistory(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-blue-400 no-drag transition-colors"
                  title={t.uuid_history}
                >
                  <IconHistory size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRandomUUID}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all no-drag active:scale-95"
                >
                  <IconRefresh size={14} />
                  {t.random_uuid}
                </button>
                <button
                  onClick={() => setCustomUUID("")}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:bg-red-500/10 hover:text-red-400 transition-all no-drag active:scale-95"
                >
                  <IconX size={14} />
                  {t.clear_uuid}
                </button>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-wider italic">
                  {normalizedUUID === "__invalid__" ? "INVALID FORMAT" : (customUUID ? "Active ID" : "Default ID (v5)")}
                </span>
                <span className="text-[8px] font-mono text-gray-700 opacity-60">
                  {customUUID ? "" : defaultUUID}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 rounded-[28px] bg-blue-600/10 border border-blue-500/20 no-drag">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-black uppercase text-white">{t.discord_rpc}</span>
              <span className="text-[8px] text-blue-400/60 font-bold uppercase">{t.discord_subtitle}</span>
            </div>
            <button onClick={() => setEnableRPC(!enableRPC)} className={cn("w-10 h-5 rounded-full transition-all relative p-1 shadow-inner no-drag", enableRPC ? "bg-blue-600" : "bg-gray-700")}>
              <div className={cn("w-3 h-3 rounded-full bg-white transition-all shadow-sm", enableRPC ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>

          <div className="flex items-center justify-between p-5 rounded-[28px] bg-white/5 border border-white/5 no-drag">
            <div className="flex items-center gap-2">
              <IconWorld size={16} className="text-gray-500" />
              <span className="text-[11px] font-black uppercase text-white">{t.language}</span>
            </div>
            <div className="flex gap-1.5">
              {(["en", "es", "pt"] as Language[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={cn("w-7 h-7 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm no-drag", lang === l ? "bg-white text-gray-950" : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10")}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {window.config.OS === "linux" && (
            <div className="p-5 rounded-[28px] bg-red-600/5 border border-red-500/10 flex flex-col gap-4 no-drag">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-black uppercase text-red-500/80">Gestión de Nix</span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase">{nixInstalled ? "Sistema listo" : "No detectado"}</span>
                </div>
                {nixInstalled && (
                  <button onClick={() => setShowUninstallConfirm(true)} disabled={uninstallingNix || installing} className="px-5 py-2.5 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30 no-drag">
                    {uninstallingNix ? t.nix_uninstalling : t.nix_uninstall}
                  </button>
                )}
              </div>
              {nixInstalled && uninstallingNix && onShowConsole && (
                <button onClick={onShowConsole} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all no-drag border border-blue-500/10">
                  <IconTerminal2 size={14} />
                  {t.nix_view_log.replace("{shell}", window.config.OS === "linux" ? trans.launcher.shell_bash : trans.launcher.shell_generic)}
                </button>
              )}
            </div>
          )}

          {}
          {launcherUpdateStatus !== "none" && launcherUpdateStatus !== "not-available" && (
            <div className="p-5 rounded-[28px] bg-blue-600/10 border border-blue-500/20 flex flex-col gap-3 no-drag">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-black uppercase text-blue-400">Launcher Update</span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase italic">
                    {launcherUpdateStatus === "checking" ? "Checking for updates..." :
                      launcherUpdateStatus === "available" ? "New version found!" :
                        launcherUpdateStatus === "downloading" ? `Downloading... ${Math.round(launcherUpdateProgress)}%` :
                          launcherUpdateStatus === "downloaded" ? "Update ready to install" :
                            launcherUpdateStatus === "error" ? `Error: ${launcherUpdateError}` : ""}
                  </span>
                </div>
                {launcherUpdateStatus === "downloaded" && (
                  <button
                    onClick={quitAndInstallLauncher}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                  >
                    Restart
                  </button>
                )}
              </div>
              {launcherUpdateStatus === "downloading" && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${launcherUpdateProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold tracking-widest text-gray-600 uppercase">{t.arch_version} {window.config.VERSION}</span>
          </div>
          <div className="flex gap-3">
            <button disabled={checkingUpdates} onClick={() => checkForUpdates("manual")} className="px-5 py-2.5 border border-white/5 rounded-xl hover:bg-white/5 transition-all text-[9px] font-black uppercase tracking-widest text-gray-500 no-drag">
              {checkingUpdates ? "..." : t.sync}
            </button>
            {onLogout && (
              <button onClick={onLogout} className="px-6 py-2.5 bg-white text-gray-950 hover:bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all no-drag shadow-lg">
                {t.logout}
              </button>
            )}
          </div>
        </div>
      </div>

      {}
      {showHistory && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fadeIn p-8" onClick={() => setShowHistory(false)}>
          <div className="glass-panel max-w-sm w-full p-8 rounded-[48px] flex flex-col gap-6 animate-slideUp border border-blue-500/20 shadow-huge" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1 items-center mb-2">
              <h3 className="text-xl font-black text-white tracking-tight">{t.history_title}</h3>
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{t.history_subtitle}</p>
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {uuidHistory.length === 0 ? (
                <div className="py-12 text-center text-gray-600 text-xs font-bold uppercase tracking-widest opacity-50">{t.history_empty}</div>
              ) : (
                uuidHistory.map((uuid, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCustomUUID(uuid);
                      setShowHistory(false);
                    }}
                    className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-blue-600/10 hover:border-blue-500/30 transition-all text-[10px] font-mono text-blue-400/80 text-left truncate active:scale-[0.98]"
                  >
                    {uuid}
                  </button>
                ))
              )}
            </div>

            <button onClick={() => setShowHistory(false)} className="w-full py-4 bg-white text-gray-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Close</button>
          </div>
        </div>
      )}

      {}
      {showUninstallConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fadeIn p-8" onClick={() => setShowUninstallConfirm(false)}>
          <div className="glass-panel max-w-xs w-full p-10 rounded-[48px] flex flex-col gap-6 animate-slideUp border border-red-500/20 shadow-huge" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-black text-white tracking-tight text-center">¿Desinstalar Nix?</h3>
              <p className="text-[11px] font-medium text-gray-500 leading-relaxed text-center">Esta acción eliminará <code className="text-blue-400">/nix</code> y toda su configuración.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleUninstallNix} className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-500/40">Eliminar Todo</button>
              <button onClick={() => setShowUninstallConfirm(false)} className="w-full py-3 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;
