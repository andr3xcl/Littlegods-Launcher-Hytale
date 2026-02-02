import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    IconSearch,
    IconDownload,
    IconTrash,
    IconPuzzle,
    IconRefresh,
    IconLoader2,
    IconCheck,
    IconPlayerPause,
    IconPlayerPlay,
    IconChevronLeft,
    IconAlertTriangle,
    IconChevronDown,
    IconChevronUp,
    IconFilter
} from "@tabler/icons-react";
import { useGameContext } from "../hooks/gameContext";
import { useI18n } from "../hooks/i18nContext";
import cn from "../utils/cn";
import { useSoundEffects } from "../hooks/useSoundEffects";
import ConfirmDialog from "./ConfirmModal";
import ModDetailsModal from "./ModDetailsModal";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const HYTALE_GAME_ID = 70216;

const ModsView: React.FC<{ onBack: () => void; isOffline?: boolean }> = ({ onBack, isOffline }) => {
    const { gameDir } = useGameContext();
    const { t: trans } = useI18n();
    const { playHoverSound, playSearchSound, playSelectSound } = useSoundEffects();
    const t = trans.mods;

    const [activeTab, setActiveTab] = useState<"browse" | "installed">(isOffline ? "installed" : "browse");
    const [searchQuery, setSearchQuery] = useState("");
    const [mods, setMods] = useState<any[]>([]);
    const [installedMods, setInstalledMods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<Record<string, number>>({});
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedModForLink, setSelectedModForLink] = useState<any>(null);
    const [sortField, setSortField] = useState(2); 
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedMod, setSelectedMod] = useState<any>(null);
    const [modModalOpen, setModModalOpen] = useState(false);
    const apiKey = "$2a$10$bqk254NMZOWVTzLVJCcxEOmhcyUujKxA5xk.kQCN9q0KNYFJd5b32";

    const searchAttempted = useRef(false);

    const loadInstalledMods = useCallback(async () => {
        if (!gameDir) return;
        const list = await window.ipcRenderer.invoke("mods:list-installed", gameDir);
        setInstalledMods(list);
    }, [gameDir]);

    useEffect(() => {
        loadInstalledMods();
    }, [loadInstalledMods]);

    const searchMods = useCallback(async () => {
        if (activeTab === "installed") return;

        setLoading(true);
        setError(null);
        searchAttempted.current = true;

        try {
            let url = `${CURSEFORGE_API}/mods/search?gameId=${HYTALE_GAME_ID}&pageSize=50&sortOrder=desc&sortField=${sortField}`;
            if (searchQuery) {
                url += `&searchFilter=${encodeURIComponent(searchQuery)}`;
            }

            const res = await window.ipcRenderer.invoke("fetch:json", url, {
                headers: {
                    "x-api-key": apiKey,
                    "Accept": "application/json"
                }
            });

            if (res?._error) {
                setError(`API Error: ${res.error}`);
                return;
            }

            if (res?.data) {
                const results = res.data.map((m: any) => ({
                    id: m.id.toString(),
                    name: m.name,
                    version: m.latestFiles?.[0]?.displayName || "Unknown",
                    author: m.authors?.[0]?.name || "Unknown",
                    description: m.summary || "No description provided",
                    thumbnailUrl: m.logo?.thumbnailUrl || null,
                    downloadUrl: m.latestFiles?.[0]?.downloadUrl,
                    fileName: m.latestFiles?.[0]?.fileName || `${m.slug}.jar`,
                    enabled: true,
                    curseForgeId: m.id,
                    curseForgeFileId: m.latestFiles?.[0]?.id,
                    websiteUrl: m.links?.websiteUrl || null,
                }));
                setMods(results);
            } else {
                setMods([]);
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }, [searchQuery, activeTab, apiKey, playSearchSound, sortField]);

    const isModInstalled = (mod: any) => {
        return installedMods.some(m => m.curseForgeId === mod.curseForgeId);
    };

    const handleDownload = async (mod: any) => {
        if (!gameDir) return;
        if (isModInstalled(mod)) return;

        setDownloading((prev) => ({ ...prev, [mod.id]: 0 }));

        const result = await window.ipcRenderer.invoke("mods:download", gameDir, mod);

        if (result.success) {
            setDownloading((prev) => {
                const next = { ...prev };
                delete next[mod.id];
                return next;
            });
            await loadInstalledMods();
        } else {
            alert(`Download Failed: ${result.error}`);
            setDownloading((prev) => {
                const next = { ...prev };
                delete next[mod.id];
                return next;
            });
        }
    };

    const handleToggle = async (mod: any) => {
        if (!gameDir) return;
        const result = await window.ipcRenderer.invoke("mods:toggle", gameDir, mod.fileName, !mod.enabled);
        if (result.success) {
            await loadInstalledMods();
        }
    };

    const handleUninstall = async (mod: any) => {
        if (!gameDir) return;
        if (!confirm(t.uninstall_confirm.replace("{name}", mod.name))) return;
        const result = await window.ipcRenderer.invoke("mods:uninstall", gameDir, mod.fileName);
        if (result.success) {
            await loadInstalledMods();
        }
    };

    useEffect(() => {
        if (activeTab === "browse" && (!searchAttempted.current || (mods.length === 0 && !loading && !error))) {
            searchMods();
        }
    }, [activeTab, searchMods, mods.length, loading, error]);

    useEffect(() => {
        if (activeTab === "browse" && searchAttempted.current) {
            searchMods();
        }
    }, [sortField, activeTab]);

    useEffect(() => {
        const handler = (_: any, data: { modId: string; percent: number }) => {
            setDownloading((prev) => ({ ...prev, [data.modId]: data.percent }));
        };
        window.ipcRenderer.on("mod-download-progress", handler);
        return () => window.ipcRenderer.off("mod-download-progress", handler);
    }, []);

    const handleImageClick = (mod: any) => {
        setSelectedMod(mod);
        setModModalOpen(true);
    };

    const confirmWebsiteRedirect = async () => {
        if (selectedModForLink?.websiteUrl) {
            await window.ipcRenderer.invoke("open-external", selectedModForLink.websiteUrl);
        }
        setShowLinkModal(false);
        setSelectedModForLink(null);
    };

    return (
        <div className="flex flex-col h-full bg-transparent animate-fadeIn">
            {}
            <div className="flex items-center justify-between p-8 border-b border-[var(--color-border-default)] bg-transparent z-10 w-full">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => {
                            onBack();
                            playSelectSound();
                        }}
                        onMouseEnter={playHoverSound}
                        className="w-12 h-12 rounded-2xl border border-[var(--color-border-muted)] flex items-center justify-center hover:bg-[var(--color-canvas-subtle)] transition-all active:scale-95 shadow-sm bg-[var(--color-canvas-default)]"
                    >
                        <IconChevronLeft size={20} className="text-[var(--color-fg-muted)]" />
                    </button>
                    <h2 className="text-3xl font-black text-[var(--color-fg-default)] tracking-tight">{t.title}</h2>
                </div>

                <div className="flex p-1 bg-[var(--color-canvas-subtle)] rounded-2xl border border-[var(--color-border-default)]">
                    <button
                        onClick={() => {
                            setActiveTab("installed");
                            playSelectSound();
                        }}
                        onMouseEnter={playHoverSound}
                        className={cn(
                            "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                            activeTab === "installed"
                                ? "bg-[var(--color-accent-emphasis)] text-white shadow-sm"
                                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                        )}
                    >{t.installed}</button>
                    {!isOffline && (
                        <button
                            onClick={() => {
                                setActiveTab("browse");
                                playSelectSound();
                            }}
                            onMouseEnter={playHoverSound}
                            className={cn(
                                "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                                activeTab === "browse"
                                    ? "bg-[var(--color-accent-emphasis)] text-white shadow-sm"
                                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                            )}
                        >{t.browse}</button>
                    )}
                </div>
            </div>

            {}
            {!isOffline && (
                <div className="p-8 border-b border-[var(--color-border-default)]">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)]" size={20} />
                            <input
                                type="text"
                                placeholder={activeTab === "installed" ? t.search_installed : t.search_browse}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && activeTab === "browse") {
                                        searchMods();
                                        playSearchSound();
                                    }
                                }}
                            />
                        </div>

                        {}
                        {activeTab === "browse" && (
                            <div className="relative">
                                <button
                                    onClick={() => setFiltersOpen(!filtersOpen)}
                                    onMouseEnter={playHoverSound}
                                    className="flex items-center gap-2 px-6 py-4 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-2xl text-xs font-black uppercase tracking-widest text-[var(--color-fg-default)] hover:bg-[var(--color-btn-hover-bg)] transition-all shadow-sm no-drag"
                                >
                                    <IconFilter size={18} className="text-[var(--color-accent-fg)]" />
                                    {t.sort_by}: {
                                        sortField === 1 ? t.filters.relevancy :
                                            sortField === 2 ? t.filters.popularity :
                                                sortField === 3 ? t.filters.latest_update :
                                                    sortField === 10 ? t.filters.creation_date :
                                                        t.filters.total_downloads
                                    }
                                    {filtersOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                </button>

                                {filtersOpen && (
                                    <div className="absolute right-0 mt-3 w-64 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-2xl shadow-huge z-[100] overflow-hidden animate-slideUp">
                                        {[
                                            { id: 1, label: t.filters.relevancy },
                                            { id: 2, label: t.filters.popularity },
                                            { id: 3, label: t.filters.latest_update },
                                            { id: 10, label: t.filters.creation_date },
                                            { id: 6, label: t.filters.total_downloads },
                                        ].map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => {
                                                    setSortField(f.id);
                                                    setFiltersOpen(false);
                                                    playSelectSound();
                                                }}
                                                className={cn(
                                                    "w-full px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-all",
                                                    sortField === f.id
                                                        ? "bg-[var(--color-accent-emphasis)] text-white"
                                                        : "text-[var(--color-fg-muted)] hover:bg-[var(--color-btn-hover-bg)] hover:text-[var(--color-fg-default)]"
                                                )}
                                            >
                                                {f.label}
                                                {sortField === f.id && <IconCheck size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "browse" && (
                            <button
                                onClick={() => {
                                    searchMods();
                                    playSearchSound();
                                }}
                                onMouseEnter={playHoverSound}
                                disabled={loading}
                                className="px-8 bg-[var(--color-btn-bg)] text-[var(--color-fg-default)] border border-[var(--color-btn-border)] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[var(--color-btn-hover-bg)] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm active:scale-95"
                            >
                                {loading ? <IconLoader2 className="animate-spin" size={18} /> : <IconRefresh size={18} />}
                                {t.browse}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {error && (
                    <div className="p-6 bg-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_90%)] border border-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_80%)] rounded-3xl mb-8 flex flex-col gap-3 animate-slideIn">
                        <div className="flex items-center gap-3 text-[var(--color-danger-emphasis)]">
                            <IconAlertTriangle size={24} />
                            <h4 className="font-black text-sm uppercase tracking-widest">{t.error_connection}</h4>
                        </div>
                        <p className="text-xs font-medium text-[var(--color-fg-default)] pl-9 opacity-80">{error}</p>
                        <button onClick={searchMods} className="text-xs font-black text-[var(--color-danger-emphasis)] uppercase tracking-widest underline self-start ml-9">{t.retry}</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-6">
                        <div className="w-14 h-14 rounded-full border-4 border-[var(--color-border-muted)] border-t-[var(--color-accent-emphasis)] animate-spin" />
                        <span className="text-xs text-[var(--color-fg-muted)] font-black uppercase tracking-[0.2em]">{t.browse}...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp">
                        {(activeTab === "installed" ? installedMods : mods)
                            .filter(m => activeTab === "browse" || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((mod) => (
                                <div key={mod.id} onMouseEnter={playHoverSound} className="gh-box rounded-[32px] p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group bg-[var(--color-canvas-default)] border border-[var(--color-border-default)]">
                                    <div className="flex gap-4 mb-6">
                                        <div
                                            onClick={() => handleImageClick(mod)}
                                            className={cn(
                                                "w-20 h-20 rounded-2xl bg-[var(--color-canvas-subtle)] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[var(--color-border-default)] group-hover:border-[var(--color-accent-emphasis)] transition-colors cursor-pointer",
                                            )}
                                        >
                                            {mod.thumbnailUrl ? (
                                                <img src={mod.thumbnailUrl} alt={mod.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <IconPuzzle size={28} className="text-[var(--color-fg-muted)]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4
                                                    onClick={() => handleImageClick(mod)}
                                                    className="font-black text-base text-[var(--color-fg-default)] truncate tracking-tight cursor-pointer hover:text-[var(--color-accent-fg)] transition-colors"
                                                >
                                                    {mod.name}
                                                </h4>
                                                {activeTab === "installed" && (
                                                    <div className={cn(
                                                        "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 shadow-sm",
                                                        mod.enabled ? "bg-[var(--color-success-fg)]" : "bg-[var(--color-fg-muted)]"
                                                    )} />
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-[var(--color-fg-muted)] uppercase tracking-widest truncate">by {mod.author} • v{mod.version}</p>
                                        </div>
                                    </div>

                                    <p className="text-xs font-medium text-[var(--color-fg-muted)] line-clamp-2 mb-6 min-h-[2.5rem] leading-relaxed opacity-80">
                                        {mod.description}
                                    </p>

                                    <div className="flex gap-2 mt-auto pt-2">
                                        {activeTab === "browse" ? (
                                            <button
                                                onClick={() => handleDownload(mod)}
                                                disabled={downloading[mod.id] !== undefined || isModInstalled(mod)}
                                                className="flex-1 py-3.5 px-4 bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-btn-primary-hover-bg)] disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 border border-[var(--color-btn-primary-border)]"
                                            >
                                                {downloading[mod.id] !== undefined ? (
                                                    <>
                                                        <IconLoader2 className="animate-spin" size={16} />
                                                        {Math.round(downloading[mod.id])}%
                                                    </>
                                                ) : isModInstalled(mod) ? (
                                                    <>
                                                        <IconCheck size={16} />
                                                        {t.installed}
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconDownload size={16} />
                                                        {t.download}
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleToggle(mod)}
                                                    className={cn(
                                                        "flex-1 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 border",
                                                        mod.enabled
                                                            ? "bg-[var(--color-btn-bg)] text-[var(--color-fg-default)] border-[var(--color-btn-border)] hover:bg-[var(--color-btn-hover-bg)]"
                                                            : "bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] border-[var(--color-btn-primary-border)] hover:bg-[var(--color-btn-primary-hover-bg)]"
                                                    )}
                                                >
                                                    {mod.enabled ? <><IconPlayerPause size={16} /> {t.disable}</> : <><IconPlayerPlay size={16} /> {t.enable}</>}
                                                </button>
                                                <button
                                                    onClick={() => handleUninstall(mod)}
                                                    className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_90%)] text-[var(--color-danger-emphasis)] hover:bg-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_80%)] transition-all flex items-center justify-center active:scale-95 border border-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_90%)] shadow-sm"
                                                >
                                                    <IconTrash size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {!loading && !error && (activeTab === "browse" ? mods : installedMods).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-40">
                        <IconPuzzle size={64} className="text-[var(--color-fg-muted)]" />
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm font-black text-[var(--color-fg-muted)] px-1 uppercase tracking-widest">
                                {activeTab === "installed"
                                    ? t.no_mods_installed
                                    : t.no_mods_found}
                            </p>
                            {activeTab === "installed" && (
                                <button
                                    onClick={() => setActiveTab("browse")}
                                    className="text-xs font-black text-[var(--color-accent-fg)] hover:text-[var(--color-accent-emphasis)] underline uppercase tracking-widest"
                                >
                                    {t.browse_cta}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showLinkModal}
                title={t.website_modal_title}
                message={t.website_modal_msg}
                confirmText={t.website_modal_confirm}
                showCancel={false}
                onConfirm={confirmWebsiteRedirect}
                onCancel={() => {
                    setShowLinkModal(false);
                    setSelectedModForLink(null);
                }}
            />

            <ModDetailsModal
                open={modModalOpen}
                onClose={() => setModModalOpen(false)}
                mod={selectedMod}
                isInstalled={selectedMod ? isModInstalled(selectedMod) : false}
                isDownloading={selectedMod ? downloading[selectedMod.id] !== undefined : false}
                downloadPercent={selectedMod ? downloading[selectedMod.id] : 0}
                onDownload={handleDownload}
            />
        </div >
    );
};

export default ModsView;
