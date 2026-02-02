import React, { useEffect, useState } from "react";
import {
    IconSettings,
    IconDeviceTv,
    IconVolume,
    IconKeyboard,
    IconUserCircle,
    IconRefresh,
    IconLoader2,
    IconAlertCircle,
    IconChevronRight
} from "@tabler/icons-react";
import cn from "../utils/cn";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { useI18n } from "../hooks/i18nContext";

const GameSettingsView: React.FC = () => {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>("RenderingSettings");
    const { playHoverSound, playSelectSound } = useSoundEffects();
    const { t } = useI18n();

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await window.ipcRenderer.invoke("game-settings:get");
            setSettings(data);
        } catch (err) {
            console.error("Failed to load settings", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-6 opacity-50 animate-pulse">
                <IconLoader2 size={48} className="animate-spin text-blue-500" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Loading Game Settings...</p>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                <IconAlertCircle size={64} className="text-gray-400" />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Could not find Settings.json</p>
                <button onClick={loadSettings} className="px-6 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Retry</button>
            </div>
        );
    }

    const categories = [
        { id: "General", icon: <IconSettings size={20} />, label: "General" },
        { id: "RenderingSettings", icon: <IconDeviceTv size={20} />, label: t.game_settings.graphics },
        { id: "AudioSettings", icon: <IconVolume size={20} />, label: t.game_settings.audio },
        { id: "InputBindings", icon: <IconKeyboard size={20} />, label: t.game_settings.controls },
        { id: "GameplaySettings", icon: <IconUserCircle size={20} />, label: "Gameplay" },
        { id: "BuilderToolsSettings", icon: <IconSettings size={20} />, label: "Builder Tools" },
    ];

    const renderInput = (label: string, value: any, _path: string[]) => {
        if (typeof value === "boolean") {
            return (
                <div
                    className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 opacity-70 group"
                >
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
                    <div
                        className={cn(
                            "relative w-12 h-6 rounded-full transition-all duration-300",
                            value ? "bg-[var(--color-accent-emphasis)]/50" : "bg-white/5"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-gray-400 transition-all duration-300",
                            value ? "left-7" : "left-1"
                        )} />
                    </div>
                </div>
            );
        }

        if (typeof value === "number") {
            return (
                <div className="flex flex-col gap-4 p-6 bg-white/5 rounded-3xl border border-white/10 opacity-70 group">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
                        <span className="text-xs font-black text-blue-400/60 bg-blue-400/5 px-2 py-1 rounded-lg">
                            {value}
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-lg overflow-hidden">
                        <div
                            className="h-full bg-[var(--color-accent-emphasis)]/30"
                            style={{ width: `${Math.min(100, (value / (label.includes("Fps") ? 500 : 200)) * 100)}%` }}
                        />
                    </div>
                </div>
            );
        }

        if (typeof value === "string") {
            return (
                <div className="flex flex-col gap-3 p-6 bg-white/5 rounded-3xl border border-white/10 opacity-70 group">
                    <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
                    <div className="w-full bg-black/20 border-2 border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400">
                        {value}
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderCategoryContent = () => {
        if (activeCategory === "InputBindings") {
            return (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-6">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-center">
                            Note: Controls are currently read-only.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(settings.InputBindings).map(([key, val]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
                                <span className="text-xs font-bold text-gray-400">{key}</span>
                                <span className="text-[10px] font-black text-white bg-white/10 px-3 py-1 rounded-lg uppercase tracking-widest">
                                    {val.Key ? `Key: ${val.Key}` : val.Scancode ? `Scan: ${val.Scancode}` : val.MouseButton ? `Mouse: ${val.MouseButton}` : "Unbound"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        const data = activeCategory === "General" ? settings : settings[activeCategory];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(data).map(([key, val]) => {
                    if (typeof val === "object" && val !== null) return null;
                    return <React.Fragment key={key}>{renderInput(key, val, activeCategory === "General" ? [key] : [activeCategory, key])}</React.Fragment>;
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-transparent animate-fadeIn overflow-hidden">
            {}
            <div className="flex items-center justify-between p-8 border-b border-white/5">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--color-accent-fg)] shadow-sm border border-white/5">
                        <IconSettings size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{t.game_settings.title}</h2>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 italic">Read-Only Mode</p>
                    </div>
                </div>

                <button
                    onClick={() => { loadSettings(); playSelectSound(); }}
                    onMouseEnter={playHoverSound}
                    className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all active:scale-95 shadow-sm text-gray-400 hover:text-white"
                    title="Reload"
                >
                    <IconRefresh size={20} className={cn(loading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {}
                <div className="w-72 border-r border-white/5 p-6 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                playSelectSound();
                                setActiveCategory(cat.id);
                            }}
                            className={cn(
                                "w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all group",
                                activeCategory === cat.id
                                    ? "bg-[var(--color-accent-emphasis)] text-white shadow-sm border border-white/5"
                                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "transition-colors",
                                    activeCategory === cat.id ? "text-[var(--color-accent-fg)]" : "text-gray-600 group-hover:text-gray-400"
                                )}>
                                    {cat.icon}
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest">{cat.label}</span>
                            </div>
                            <IconChevronRight size={14} className={cn(
                                "transition-transform duration-300",
                                activeCategory === cat.id ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                            )} />
                        </button>
                    ))}
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-10 pb-20 custom-scrollbar bg-black/20">
                    <div className="max-w-4xl mx-auto space-y-8 animate-slideUp">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black text-white tracking-tight">
                                    {categories.find(c => c.id === activeCategory)?.label}
                                </h3>
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                                    {t.launcher.stable}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t.game_settings.description}</p>
                        </div>
                        {renderCategoryContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameSettingsView;
