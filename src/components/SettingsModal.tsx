import React, { useEffect, useMemo, useState } from "react";
import { IconFolderOpen, IconX, IconTerminal2, IconRefresh, IconHistory, IconPalette, IconTypography, IconLoader2, IconPhoto } from "@tabler/icons-react";
import { useGameContext } from "../hooks/gameContext";
import { useI18n } from "../hooks/i18nContext";
import { useUserContext } from "../hooks/userContext";
import { useTheme } from "../hooks/themeContext";
import { useSoundEffects } from "../hooks/useSoundEffects";
import cn from "../utils/cn";
import { Language } from "../utils/i18n";
import FontPickerModal from "./FontPickerModal";
import ThemePickerModal from "./ThemePickerModal";
import MusicSoundModal from "./MusicSoundModal";
import LoaderPickerModal from "./LoaderPickerModal";

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
  } = useGameContext();
  const { lang, setLang, t: trans } = useI18n();
  const { currentProfile, updateProfile } = useUserContext();
  const { theme, setTheme, font, setFont } = useTheme();
  const { playHoverSound, playSelectSound } = useSoundEffects();
  const t = trans.settings;

  const [nixInstalled, setNixInstalled] = useState(false);
  const [uninstallingNix, setUninstallingNix] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);

  const [customUUID, setCustomUUID] = useState<string>(currentProfile?.uuid || "");
  const [defaultUUID, setDefaultUUID] = useState<string>("");
  const [enableRPC, setEnableRPC] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState(false);
  const [uuidHistory, setUuidHistory] = useState<string[]>([]);
  const [loaderStyle, setLoaderStyle] = useState<string>(localStorage.getItem("loaderStyle") || "premium");
  const [loaderBg, setLoaderBg] = useState<string>(localStorage.getItem("loaderBg") || "none");
  const [loaderPickerOpen, setLoaderPickerOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"general" | "appearance">("general");

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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[700px] gh-box bg-[var(--color-canvas-default)] flex flex-col animate-slideUp shadow-xl max-h-[85vh] overflow-hidden no-drag"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
          <h2 className="text-sm font-semibold">{t.title}</h2>
          <button
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
            onClick={() => { onClose(); playSelectSound(); }}
            onMouseEnter={playHoverSound}
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {}
          <div className="w-48 border-r border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-2 space-y-1">
            <button
              onClick={() => { setActiveTab("general"); playSelectSound(); }}
              onMouseEnter={playHoverSound}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                activeTab === "general" ? "bg-[var(--color-accent-emphasis)] text-white" : "text-[var(--color-fg-default)] hover:bg-[var(--color-btn-hover-bg)]"
              )}
            >
              <IconFolderOpen size={14} />
              {t.general}
            </button>
            <button
              onClick={() => { setActiveTab("appearance"); playSelectSound(); }}
              onMouseEnter={playHoverSound}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                activeTab === "appearance" ? "bg-[var(--color-accent-emphasis)] text-white" : "text-[var(--color-fg-default)] hover:bg-[var(--color-btn-hover-bg)]"
              )}
            >
              <IconPalette size={14} />
              {t.appearance}
            </button>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--color-canvas-default)]">

            {activeTab === "general" && (
              <>
                {}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[var(--color-fg-default)] pb-2 border-b border-[var(--color-border-muted)] block">{t.game_dir}</span>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => { handleOpenGameDir(); playSelectSound(); }} onMouseEnter={playHoverSound} className="gh-btn w-full justify-between flex items-center">
                      <span>{t.game_files}</span>
                      <IconFolderOpen size={14} className="opacity-60" />
                    </button>
                    <button onClick={() => { handleOpenModDir(); playSelectSound(); }} onMouseEnter={playHoverSound} className="gh-btn w-full justify-between flex items-center">
                      <span>{t.mod_dir}</span>
                      <IconFolderOpen size={14} className="opacity-60" />
                    </button>
                  </div>
                </div>

                {}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[var(--color-fg-default)] pb-2 border-b border-[var(--color-border-muted)] block">{t.custom_uuid}</span>
                  <div className="flex flex-col gap-3">
                    <div className="relative group">
                      <input
                        value={customUUID}
                        onChange={(e) => setCustomUUID(e.target.value)}
                        placeholder={defaultUUID || t.uuid_placeholder}
                        className="w-full bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-md px-3 py-2 text-xs text-[var(--color-fg-default)] text-center outline-none focus:border-[var(--color-accent-fg)] focus:ring-1 focus:ring-[var(--color-accent-fg)] transition-all font-mono"
                      />
                      <button
                        onClick={() => setShowHistory(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-accent-fg)] transition-colors"
                        title={t.uuid_history}
                        onMouseEnter={playHoverSound}
                      >
                        <IconHistory size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { handleRandomUUID(); playSelectSound(); }} onMouseEnter={playHoverSound} className="gh-btn flex items-center justify-center gap-2">
                        <IconRefresh size={14} />
                        {t.random_uuid}
                      </button>
                      <button onClick={() => { setCustomUUID(""); playSelectSound(); }} onMouseEnter={playHoverSound} className="gh-btn gh-btn-danger flex items-center justify-center gap-2">
                        <IconX size={14} />
                        {t.clear_uuid}
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-[var(--color-fg-muted)] font-semibold uppercase">
                        {normalizedUUID === "__invalid__" ? t.uuid_invalid : (customUUID ? t.uuid_active : t.uuid_default_v5)}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-fg-muted)]">
                        {normalizedUUID && normalizedUUID !== "__invalid__" ? normalizedUUID : defaultUUID}
                      </span>
                    </div>
                  </div>
                </div>

                {}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[var(--color-fg-default)] pb-2 border-b border-[var(--color-border-muted)] block">{t.features}</span>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[var(--color-fg-default)]">{t.discord_rpc}</span>
                      <span className="text-[10px] text-[var(--color-fg-muted)]">{t.discord_subtitle}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableRPC}
                      onChange={() => setEnableRPC(!enableRPC)}
                      className="accent-[var(--color-accent-emphasis)]"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[var(--color-fg-default)]">{t.music_sound.title}</span>
                      <span className="text-[10px] text-[var(--color-fg-muted)]">{t.music_sound.subtitle}</span>
                    </div>
                    <button
                      onClick={() => { setMusicModalOpen(true); playSelectSound(); }}
                      onMouseEnter={playHoverSound}
                      className="gh-btn text-[10px] py-1 px-3"
                    >
                      {t.change}
                    </button>
                  </div>
                </div>

                {window.config.OS === "linux" && (
                  <div className="space-y-3 pt-4 border-t border-[var(--color-border-muted)]">
                    <div className="flex flex-col gap-2 p-3 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-muted)] rounded-md">
                      <span className="text-xs font-bold text-[var(--color-fg-default)]">{t.nix_management}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-fg-muted)]">{nixInstalled ? t.nix_installed : t.nix_not_detected}</span>
                        {nixInstalled && (
                          <button onClick={() => setShowUninstallConfirm(true)} disabled={uninstallingNix || installing} className="gh-btn gh-btn-danger text-[10px] py-1">
                            {uninstallingNix ? t.nix_uninstalling : t.nix_uninstall}
                          </button>
                        )}
                      </div>
                      {nixInstalled && uninstallingNix && onShowConsole && (
                        <button onClick={onShowConsole} className="gh-btn text-[10px] py-1 flex items-center justify-center gap-2">
                          <IconTerminal2 size={12} />
                          {t.nix_view_log.replace("{shell}", "Nix")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                {}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[var(--color-fg-default)] pb-2 border-b border-[var(--color-border-muted)] block">{t.theme}</span>
                  <div className="flex flex-col gap-3">
                    <div className="p-4 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--color-canvas-default)] rounded border border-[var(--color-border-muted)]">
                          <IconPalette size={20} className="text-[var(--color-fg-default)]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--color-fg-default)]" style={{ textTransform: 'capitalize' }}>{theme.replace(/-/g, " ")}</span>
                          <span className="text-[10px] text-[var(--color-fg-muted)]">{t.active_theme}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setThemePickerOpen(true); playSelectSound(); }}
                        onMouseEnter={playHoverSound}
                        className="gh-btn text-xs font-semibold"
                      >
                        {t.change}
                      </button>
                    </div>
                  </div>
                </div>

                {}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[var(--color-fg-default)] pb-2 border-b border-[var(--color-border-muted)] block">{t.font_family}</span>

                  <div className="flex flex-col gap-3">
                    <div className="p-4 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--color-canvas-default)] rounded border border-[var(--color-border-muted)]">
                          <IconTypography size={20} className="text-[var(--color-fg-default)]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--color-fg-default)]">{font}</span>
                          <span className="text-[10px] text-[var(--color-fg-muted)]">{t.active_font}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setFontPickerOpen(true); playSelectSound(); }}
                        onMouseEnter={playHoverSound}
                        className="gh-btn text-xs font-semibold"
                      >
                        {t.change}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => { setFont("Inter"); playSelectSound(); }} onMouseEnter={playHoverSound} className={cn("gh-btn text-xs flex-1", font === "Inter" && "bg-[var(--color-btn-selected-bg)]")}>{t.font_default}</button>
                      <button onClick={() => { setFont("System"); playSelectSound(); }} onMouseEnter={playHoverSound} className={cn("gh-btn text-xs flex-1", font === "System" && "bg-[var(--color-btn-selected-bg)]")}>{t.font_system}</button>
                      <button onClick={() => { setFont("Mono"); playSelectSound(); }} onMouseEnter={playHoverSound} className={cn("gh-btn text-xs flex-1", font === "Mono" && "bg-[var(--color-btn-selected-bg)]")}>{t.font_mono}</button>
                    </div>
                  </div>
                </div>

                {}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-[var(--color-fg-default)] pb-2 border-b border-[var(--color-border-muted)] block">{t.loading_style}</span>
                  <div className="flex flex-col gap-3">
                    <div className="p-4 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-md flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--color-canvas-default)] rounded border border-[var(--color-border-muted)]">
                            <IconLoader2 size={20} className="text-[var(--color-fg-default)]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--color-fg-default)]">
                              {(trans.settings.loading_styles as any)[loaderStyle] || loaderStyle}
                            </span>
                            <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-widest">{t.loading_style}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-[var(--color-fg-default)]">
                              {(loaderBg && loaderBg.startsWith("data:image")) ? trans.settings.loading_bgs.custom : ((trans.settings.loading_bgs as any)[loaderBg] || loaderBg)}
                            </span>
                            <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-widest">{t.loading_bg}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setLoaderPickerOpen(true); playSelectSound(); }}
                        onMouseEnter={playHoverSound}
                        className="gh-btn w-full text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <IconPhoto size={14} />
                        {t.change}
                      </button>
                    </div>
                  </div>
                </div>

                {}
                <div className="space-y-3 pt-4 border-t border-[var(--color-border-muted)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-fg-default)]">{t.language}</span>
                    <div className="flex bg-[var(--color-canvas-subtle)] rounded-md p-1 border border-[var(--color-border-default)]">
                      {(["en", "es", "pt"] as Language[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => { setLang(l); playSelectSound(); }}
                          onMouseEnter={playHoverSound}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded transition-all",
                            lang === l
                              ? "bg-[var(--color-btn-selected-bg)] text-[var(--color-fg-default)] shadow-sm"
                              : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                          )}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-fg-muted)]">Version {window.config.VERSION}</span>
          <div className="flex gap-2">
            <button disabled={checkingUpdates} onClick={() => { checkForUpdates("manual"); playSelectSound(); }} onMouseEnter={playHoverSound} className="gh-btn text-xs">
              {checkingUpdates ? "Checking..." : t.sync}
            </button>
            {onLogout && (
              <button onClick={() => { onLogout(); playSelectSound(); }} onMouseEnter={playHoverSound} className="gh-btn gh-btn-danger text-xs">
                {t.logout}
              </button>
            )}
          </div>
        </div>
      </div>

      {}
      {showHistory && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-8" onClick={() => setShowHistory(false)}>
          <div className="gh-box w-full max-w-sm overflow-hidden shadow-xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="gh-box-header flex items-center justify-between">
              <h3 className="text-sm font-bold">{t.history_title}</h3>
              <button onClick={() => { setShowHistory(false); playSelectSound(); }} onMouseEnter={playHoverSound}><IconX size={16} /></button>
            </div>
            <div className="p-0">
              {uuidHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-fg-muted)]">{t.history_empty}</div>
              ) : (
                <div className="flex flex-col max-h-[300px] overflow-y-auto">
                  {uuidHistory.map((uuid, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCustomUUID(uuid);
                        setShowHistory(false);
                        playSelectSound();
                      }}
                      onMouseEnter={playHoverSound}
                      className="text-left px-4 py-3 text-xs font-mono border-b border-[var(--color-border-muted)] last:border-0 hover:bg-[var(--color-canvas-subtle)] transition-colors"
                    >
                      {uuid}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showUninstallConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-8" onClick={() => setShowUninstallConfirm(false)}>
          <div className="gh-box w-full max-w-sm p-6 shadow-xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{t.nix_confirm_title}</h3>
            <p className="text-sm text-[var(--color-fg-muted)] mb-4">{t.nix_confirm_msg.replace("{path}", "/nix")}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUninstallConfirm(false)} className="gh-btn">{trans.launcher.cancel}</button>
              <button onClick={handleUninstallNix} className="gh-btn gh-btn-danger">{t.nix_uninstall}</button>
            </div>
          </div>
        </div>
      )}

      <FontPickerModal
        open={fontPickerOpen}
        onClose={() => setFontPickerOpen(false)}
        onSelect={setFont}
        currentFont={font}
      />
      <ThemePickerModal
        open={themePickerOpen}
        onClose={() => setThemePickerOpen(false)}
        onSelect={setTheme}
        currentTheme={theme}
      />
      <MusicSoundModal
        open={musicModalOpen}
        onClose={() => setMusicModalOpen(false)}
      />
      <LoaderPickerModal
        open={loaderPickerOpen}
        onClose={() => setLoaderPickerOpen(false)}
        onSelectStyle={(s) => {
          setLoaderStyle(s);
          localStorage.setItem("loaderStyle", s);
        }}
        onSelectBg={(b) => {
          setLoaderBg(b);
          localStorage.setItem("loaderBg", b);
        }}
        currentStyle={loaderStyle}
        currentBg={loaderBg}
      />
    </div>
  );
};

export default SettingsModal;
