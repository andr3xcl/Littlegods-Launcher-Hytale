import React, { useEffect, useState, useCallback } from "react";
import {
    IconWorld,
    IconPuzzle,
    IconMapPin,
    IconRefresh,
    IconLoader2,
    IconChevronRight,
    IconChevronLeft,
    IconPlayerPause,
    IconDeviceFloppy
} from "@tabler/icons-react";
import cn from "../utils/cn";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { useI18n } from "../hooks/i18nContext";

interface SaveInfo {
    name: string;
    path: string;
}

interface Warp {
    name: string;
    x: number;
    y: number;
    z: number;
}

const SavesView: React.FC = () => {
    const [saves, setSaves] = useState<SaveInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSave, setSelectedSave] = useState<SaveInfo | null>(null);
    const [saveConfig, setSaveConfig] = useState<{ mods: string[] }>({ mods: [] });
    const [availableMods, setAvailableMods] = useState<string[]>([]);
    const [warps, setWarps] = useState<Warp[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const { t } = useI18n();

    const { playHoverSound, playSaveSound, playSelectSound } = useSoundEffects();

    const loadSaves = async () => {
        setLoading(true);
        try {
            const list = await window.ipcRenderer.invoke("saves:list");
            setSaves(list);
        } catch (err) {
            console.error("Failed to load saves", err);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableMods = async () => {
        try {
            const list = await window.ipcRenderer.invoke("mods:list-available-to-saves");
            setAvailableMods(list);
        } catch (err) {
            console.error("Failed to load available mods", err);
        }
    };

    const loadSaveDetails = useCallback(async (save: SaveInfo) => {
        setLoadingDetails(true);
        try {
            const [config, warpsList] = await Promise.all([
                window.ipcRenderer.invoke("saves:read-config", save.name),
                window.ipcRenderer.invoke("saves:read-warps", save.name)
            ]);
            setSaveConfig({
                mods: Array.isArray(config?.mods) ? config.mods : []
            });
            setWarps(Array.isArray(warpsList) ? warpsList : []);
        } catch (err) {
            console.error("Failed to load save details", err);
        } finally {
            setLoadingDetails(false);
        }
    }, []);

    useEffect(() => {
        loadSaves();
        loadAvailableMods();
    }, []);

    useEffect(() => {
        if (selectedSave) {
            loadSaveDetails(selectedSave);
        }
    }, [selectedSave, loadSaveDetails]);

    const handleSaveConfig = async () => {
        if (!selectedSave) return;
        setSaving(true);
        try {
            await window.ipcRenderer.invoke("saves:save-config", selectedSave.name, saveConfig);
            playSaveSound();
        } catch (err) {
            console.error("Failed to save world config", err);
            alert("Error saving world configuration.");
        } finally {
            setSaving(false);
        }
    };

    const toggleMod = (modName: string) => {
        setSaveConfig(prev => {
            const mods = prev.mods.includes(modName)
                ? prev.mods.filter(m => m !== modName)
                : [...prev.mods, modName];
            return { ...prev, mods };
        });
        playSelectSound();
    };

    if (selectedSave) {
        return (
            <div className="flex flex-col h-full bg-transparent animate-fadeIn">
                <div className="flex items-center justify-between p-8 border-b border-white/5">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => {
                                setSelectedSave(null);
                                playSelectSound();
                            }}
                            onMouseEnter={playHoverSound}
                            className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                        >
                            <IconChevronLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-white tracking-tight">{selectedSave.name}</h2>
                                <span className="px-2 py-0.5 rounded bg-[var(--color-accent-emphasis)]/10 text-[var(--color-accent-fg)] text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent-emphasis)]/20">
                                    {t.saves.title}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{t.saves.subtitle}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveConfig}
                        disabled={saving}
                        onMouseEnter={playHoverSound}
                        className="px-8 py-4 gh-btn gh-btn-primary rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                        {t.launcher.confirm}
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {}
                    <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <IconPuzzle size={20} className="text-[var(--color-accent-fg)]" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">{t.saves.mods_active}</h3>
                            </div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                {saveConfig.mods.length} {t.launcher.installed}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                            {}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-[var(--color-accent-fg)] uppercase tracking-widest mb-4">Active in World</p>
                                {(!saveConfig.mods || saveConfig.mods.length === 0) ? (
                                    <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 opacity-40">
                                        <IconPuzzle size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">{t.saves.no_mods}</p>
                                    </div>
                                ) : (
                                    saveConfig.mods.map(mod => (
                                        <div key={mod} className="glass-card p-5 rounded-3xl flex items-center justify-between border border-[var(--color-accent-emphasis)]/20 bg-[var(--color-accent-emphasis)]/5 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-emphasis)]/20 flex items-center justify-center text-[var(--color-accent-fg)]">
                                                    <IconPuzzle size={20} />
                                                </div>
                                                <span className="text-xs font-black text-white truncate max-w-[200px]">{mod}</span>
                                            </div>
                                            <button
                                                onClick={() => toggleMod(mod)}
                                                className="w-10 h-10 rounded-xl border border-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_80%)] flex items-center justify-center text-[var(--color-danger-emphasis)] hover:bg-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_80%)] transition-all"
                                                title="Deactivate"
                                            >
                                                <IconPlayerPause size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Available Global Mods</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {availableMods
                                        .filter(m => !saveConfig.mods.includes(m))
                                        .map(mod => (
                                            <div
                                                key={mod}
                                                onClick={() => toggleMod(mod)}
                                                className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <IconPuzzle size={18} className="text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent-fg)]" />
                                                    <span className="text-xs font-bold text-[var(--color-fg-default)] group-hover:text-white transition-colors">{mod}</span>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent-fg)] transition-all">
                                                    <IconChevronRight size={16} />
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {}
                    <div className="w-96 flex flex-col bg-black/20 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center gap-3">
                            <IconMapPin size={20} className="text-[var(--color-accent-fg)]" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Warp Locations</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                            {loadingDetails ? (
                                <div className="flex justify-center py-12">
                                    <IconLoader2 size={32} className="animate-spin text-[var(--color-accent-fg)]/50" />
                                </div>
                            ) : warps.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 opacity-30 gap-4">
                                    <IconMapPin size={48} />
                                    <p className="text-[10px] font-black uppercase tracking-widest italic">{t.saves.no_saves}</p>
                                </div>
                            ) : (
                                warps.map((warp, idx) => (
                                    <div key={idx} className="p-5 bg-white/5 rounded-[24px] border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all group">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-[11px] font-black text-white uppercase tracking-wider">{warp.name}</h4>
                                            <IconMapPin size={14} className="text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent-fg)] transition-colors" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
                                                <span className="text-[8px] font-black text-gray-600 uppercase">X</span>
                                                <span className="text-[10px] font-mono text-gray-300 font-bold">{Math.round(warp.x)}</span>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
                                                <span className="text-[8px] font-black text-gray-600 uppercase">Y</span>
                                                <span className="text-[10px] font-mono text-gray-300 font-bold">{Math.round(warp.y)}</span>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
                                                <span className="text-[8px] font-black text-gray-600 uppercase">Z</span>
                                                <span className="text-[10px] font-mono text-gray-300 font-bold">{Math.round(warp.z)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent animate-fadeIn">
            <div className="flex items-center justify-between p-8 border-b border-white/5">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--color-accent-fg)] shadow-sm border border-white/5">
                        <IconWorld size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{t.saves.title}</h2>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{t.saves.subtitle}</p>
                    </div>
                </div>
                <button
                    onClick={loadSaves}
                    onMouseEnter={playHoverSound}
                    className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all active:scale-95 shadow-sm text-gray-400 hover:text-white"
                >
                    <IconRefresh size={20} className={cn(loading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6 opacity-30">
                        <IconLoader2 size={48} className="animate-spin text-[var(--color-accent-fg)]" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Scanning User Data...</p>
                    </div>
                ) : saves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6 opacity-20">
                        <IconWorld size={80} className="text-gray-400" />
                        <div className="text-center">
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">{t.saves.no_saves}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                        {saves.map((save) => (
                            <div
                                key={save.name}
                                onClick={() => {
                                    setSelectedSave(save);
                                    playSelectSound();
                                }}
                                onMouseEnter={playHoverSound}
                                className="glass-card p-8 rounded-[40px] cursor-pointer hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-500 group border border-white/5 hover:border-[color-mix(in_srgb,var(--color-accent-emphasis),transparent_60%)] bg-black/20"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent-fg)] group-hover:bg-[color-mix(in_srgb,var(--color-accent-emphasis),transparent_90%)] transition-all duration-300">
                                        <IconWorld size={36} />
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                        <IconChevronRight size={20} className="text-[var(--color-accent-emphasis)]" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-white leading-tight mb-2 group-hover:text-[var(--color-accent-fg)] transition-colors">{save.name}</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-emphasis)]" />
                                    <p className="text-[10px] font-bold text-[var(--color-fg-muted)] uppercase tracking-widest truncate">{save.name.length > 20 ? save.name.substring(0, 20) + '...' : save.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavesView;
