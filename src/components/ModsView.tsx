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
    IconAlertTriangle
} from "@tabler/icons-react";
import { useGameContext } from "../hooks/gameContext";
import { useI18n } from "../hooks/i18nContext";
import cn from "../utils/cn";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const HYTALE_GAME_ID = 70216;

const ModsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { gameDir } = useGameContext();
    const { t: trans } = useI18n();
    const t = trans.mods;

    const [activeTab, setActiveTab] = useState<"browse" | "installed">("browse");
    const [searchQuery, setSearchQuery] = useState("");
    const [mods, setMods] = useState<any[]>([]);
    const [installedMods, setInstalledMods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<Record<string, number>>({});
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
            let url = `${CURSEFORGE_API}/mods/search?gameId=${HYTALE_GAME_ID}&pageSize=50&sortOrder=desc&sortField=6`;
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
    }, [searchQuery, activeTab, apiKey]);

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
        const handler = (_: any, data: { modId: string; percent: number }) => {
            setDownloading((prev) => ({ ...prev, [data.modId]: data.percent }));
        };
        window.ipcRenderer.on("mod-download-progress", handler);
        return () => window.ipcRenderer.off("mod-download-progress", handler);
    }, []);

    return (
        <div className="flex flex-col h-full bg-transparent animate-fadeIn">
            {}
            <div className="flex items-center justify-between p-8 border-b border-white/5 bg-transparent z-10">
                <div className="flex items-center gap-5">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all active:scale-95 shadow-sm"
                    >
                        <IconChevronLeft size={20} className="text-gray-300" />
                    </button>
                    <h2 className="text-3xl font-black text-white tracking-tight">{t.title}</h2>
                </div>

                <div className="flex p-1 bg-white/5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab("installed")}
                        className={cn(
                            "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                            activeTab === "installed"
                                ? "bg-white/10 text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >{t.installed}</button>
                    <button
                        onClick={() => setActiveTab("browse")}
                        className={cn(
                            "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                            activeTab === "browse"
                                ? "bg-white/10 text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >{t.browse}</button>
                </div>
            </div>

            {}
            <div className="p-8 border-b border-white/5">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder={activeTab === "installed" ? t.search_installed : t.search_browse}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && activeTab === "browse" && searchMods()}
                        />
                    </div>
                    {activeTab === "browse" && (
                        <button
                            onClick={searchMods}
                            disabled={loading}
                            className="px-8 bg-white text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg active:scale-95"
                        >
                            {loading ? <IconLoader2 className="animate-spin" size={18} /> : <IconRefresh size={18} />}
                            {t.browse}
                        </button>
                    )}
                </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {error && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl mb-8 flex flex-col gap-3 animate-slideIn">
                        <div className="flex items-center gap-3 text-red-400">
                            <IconAlertTriangle size={24} />
                            <h4 className="font-black text-sm uppercase tracking-widest">{t.error_connection}</h4>
                        </div>
                        <p className="text-xs font-medium text-red-300 pl-9 opacity-80">{error}</p>
                        <button onClick={searchMods} className="text-xs font-black text-red-400 uppercase tracking-widest underline self-start ml-9">{t.retry}</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-6">
                        <div className="w-14 h-14 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin" />
                        <span className="text-xs text-gray-500 font-black uppercase tracking-[0.2em]">{t.browse}...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp">
                        {(activeTab === "installed" ? installedMods : mods)
                            .filter(m => activeTab === "browse" || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((mod) => (
                                <div key={mod.id} className="glass-card rounded-[32px] p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                                    <div className="flex gap-4 mb-6">
                                        <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-colors">
                                            {mod.thumbnailUrl ? (
                                                <img src={mod.thumbnailUrl} alt={mod.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <IconPuzzle size={28} className="text-gray-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="font-black text-base text-white truncate tracking-tight">{mod.name}</h4>
                                                {activeTab === "installed" && (
                                                    <div className={cn(
                                                        "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.4)]",
                                                        mod.enabled ? "bg-green-500" : "bg-gray-600"
                                                    )} />
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">by {mod.author} • v{mod.version}</p>
                                        </div>
                                    </div>

                                    <p className="text-xs font-medium text-gray-400 line-clamp-2 mb-6 min-h-[2.5rem] leading-relaxed opacity-80">
                                        {mod.description}
                                    </p>

                                    <div className="flex gap-2 mt-auto pt-2">
                                        {activeTab === "browse" ? (
                                            <button
                                                onClick={() => handleDownload(mod)}
                                                disabled={downloading[mod.id] !== undefined || isModInstalled(mod)}
                                                className="flex-1 py-3.5 px-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(37,99,235,0.3)] active:scale-95 flex items-center justify-center gap-2"
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
                                                        "flex-1 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 border border-white/5",
                                                        mod.enabled
                                                            ? "bg-white/10 text-white hover:bg-white/20"
                                                            : "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                                                    )}
                                                >
                                                    {mod.enabled ? <><IconPlayerPause size={16} /> {t.disable}</> : <><IconPlayerPlay size={16} /> {t.enable}</>}
                                                </button>
                                                <button
                                                    onClick={() => handleUninstall(mod)}
                                                    className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center active:scale-95 border border-red-500/10 shadow-sm"
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
                    <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-20">
                        <IconPuzzle size={64} className="text-gray-400" />
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm font-black text-gray-400 px-1 uppercase tracking-widest">
                                {activeTab === "installed"
                                    ? t.no_mods_installed
                                    : t.no_mods_found}
                            </p>
                            {activeTab === "installed" && (
                                <button
                                    onClick={() => setActiveTab("browse")}
                                    className="text-xs font-black text-blue-400 hover:text-blue-300 underline uppercase tracking-widest"
                                >
                                    {t.browse_cta}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModsView;
