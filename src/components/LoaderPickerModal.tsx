import React, { useState, useRef } from "react";
import { IconX, IconLoader2, IconEye, IconPhoto, IconPlus, IconTrash } from "@tabler/icons-react";
import cn from "../utils/cn";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { useI18n } from "../hooks/i18nContext";
import Loader from "./Loader";


import load1 from "../../raw/wallpapers/load_1.jpg";
import load2 from "../../raw/wallpapers/load_2.jpg";
import load3 from "../../raw/wallpapers/load_3.jpg";

const WALLPAPERS: Record<string, string> = {
    load_1: load1,
    load_2: load2,
    load_3: load3,
};

interface LoaderStyleDef {
    id: "premium" | "classic" | "minimal" | "vibrant" | "quantum" | "geometric" | "matrix";
    name: string;
}

const LoaderPickerModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelectStyle: (styleId: string) => void;
    onSelectBg: (bgId: string) => void;
    currentStyle: string;
    currentBg: string;
}> = ({ open, onClose, onSelectStyle, onSelectBg, currentStyle, currentBg }) => {
    const { t: trans } = useI18n();
    const { playSelectSound, playHoverSound } = useSoundEffects();
    const [previewStyle, setPreviewStyle] = useState<string | null>(null);
    const [previewBg, setPreviewBg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"style" | "background">("style");
    const [customBg, setCustomBg] = useState<string | null>(localStorage.getItem("loaderCustomBg"));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const styles: LoaderStyleDef[] = [
        { id: "premium", name: trans.settings.loading_styles.premium },
        { id: "quantum", name: trans.settings.loading_styles.quantum },
        { id: "vibrant", name: trans.settings.loading_styles.vibrant },
        { id: "geometric", name: trans.settings.loading_styles.geometric },
        { id: "matrix", name: trans.settings.loading_styles.matrix },
        { id: "minimal", name: trans.settings.loading_styles.minimal },
        { id: "classic", name: trans.settings.loading_styles.classic },
    ];

    const backgrounds = [
        { id: "none", name: trans.settings.loading_bgs.none },
        { id: "load_1", name: trans.settings.loading_bgs.load_1 },
        { id: "load_2", name: trans.settings.loading_bgs.load_2 },
        { id: "load_3", name: trans.settings.loading_bgs.load_3 },
    ];

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setCustomBg(base64);
                localStorage.setItem("loaderCustomBg", base64);
                onSelectBg(base64);
                playSelectSound();
            };
            reader.readAsDataURL(file);
        }
    };

    const removeCustomBg = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCustomBg(null);
        localStorage.removeItem("loaderCustomBg");
        if (currentBg.startsWith("data:image")) {
            onSelectBg("none");
        }
        playSelectSound();
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-8"
            onClick={onClose}
        >
            <div
                className="gh-box w-full max-w-[700px] bg-[var(--color-canvas-default)] flex flex-col animate-slideUp shadow-xl h-[85vh] overflow-hidden no-drag"
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
                    <div className="flex gap-4">
                        <button
                            onClick={() => { setActiveTab("style"); playSelectSound(); }}
                            className={cn(
                                "text-sm font-bold flex items-center gap-2 transition-all pb-1 border-b-2",
                                activeTab === "style" ? "border-[var(--color-accent-emphasis)] text-[var(--color-fg-default)]" : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                            )}
                        >
                            <IconLoader2 size={18} />
                            {trans.settings.loading_style}
                        </button>
                        <button
                            onClick={() => { setActiveTab("background"); playSelectSound(); }}
                            className={cn(
                                "text-sm font-bold flex items-center gap-2 transition-all pb-1 border-b-2",
                                activeTab === "background" ? "border-[var(--color-accent-emphasis)] text-[var(--color-fg-default)]" : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                            )}
                        >
                            <IconPhoto size={18} />
                            {trans.settings.loading_bg}
                        </button>
                    </div>
                    <button
                        className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
                        onClick={onClose}
                    >
                        <IconX size={18} />
                    </button>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-canvas-default)]">
                    {activeTab === "style" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {styles.map((style) => (
                                <div
                                    key={style.id}
                                    onClick={() => {
                                        onSelectStyle(style.id);
                                        playSelectSound();
                                    }}
                                    className={cn(
                                        "relative p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-3",
                                        currentStyle === style.id
                                            ? "border-[var(--color-accent-emphasis)] bg-[var(--color-accent-emphasis)]/5 shadow-[0_0_15px_var(--color-accent-emphasis)]/10"
                                            : "border-[var(--color-border-default)] hover:border-[var(--color-fg-muted)] bg-[var(--color-canvas-subtle)]"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black uppercase tracking-tight text-[var(--color-fg-default)]">
                                            {style.name}
                                        </span>
                                        {currentStyle === style.id && (
                                            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-emphasis)] animate-pulse" />
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewStyle(style.id);
                                            setPreviewBg(currentBg);
                                            playSelectSound();
                                        }}
                                        onMouseEnter={playHoverSound}
                                        className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-[var(--color-fg-muted)] hover:text-white hover:bg-white/10 hover:border-white/10 transition-all"
                                    >
                                        <IconEye size={14} />
                                        PREVIEW
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {}
                            {backgrounds.map((bg) => (
                                <div
                                    key={bg.id}
                                    onClick={() => {
                                        onSelectBg(bg.id);
                                        playSelectSound();
                                    }}
                                    className={cn(
                                        "relative rounded-2xl border overflow-hidden transition-all cursor-pointer group flex flex-col h-48",
                                        currentBg === bg.id
                                            ? "border-[var(--color-accent-emphasis)] ring-2 ring-[var(--color-accent-emphasis)]/50 shadow-xl"
                                            : "border-[var(--color-border-default)] hover:border-[var(--color-fg-muted)] bg-[var(--color-canvas-subtle)]"
                                    )}
                                >
                                    <div className="flex-1 relative">
                                        {bg.id === "none" ? (
                                            <div className="absolute inset-0 bg-[var(--color-canvas-subtle)] flex items-center justify-center">
                                                <IconPhoto size={48} className="opacity-10" />
                                            </div>
                                        ) : (
                                            <img src={WALLPAPERS[bg.id]} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt={bg.name} />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-4 flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-widest text-white drop-shadow-md">{bg.name}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-[var(--color-canvas-default)] flex justify-between items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewStyle(currentStyle);
                                                setPreviewBg(bg.id);
                                                playSelectSound();
                                            }}
                                            onMouseEnter={playHoverSound}
                                            className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-fg-muted)] hover:text-[var(--color-accent-fg)] transition-all flex items-center gap-2"
                                        >
                                            <IconEye size={12} />
                                            PREVIEW
                                        </button>
                                        {currentBg === bg.id && <div className="w-2 h-2 rounded-full bg-[var(--color-accent-emphasis)]" />}
                                    </div>
                                </div>
                            ))}

                            {}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "relative rounded-2xl border overflow-hidden transition-all cursor-pointer group flex flex-col h-48",
                                    customBg && currentBg === customBg
                                        ? "border-[var(--color-accent-emphasis)] ring-2 ring-[var(--color-accent-emphasis)]/50 shadow-xl"
                                        : "border-dashed border-[var(--color-border-default)] hover:border-[var(--color-accent-fg)] bg-[var(--color-canvas-subtle)]/30 hover:bg-[var(--color-canvas-subtle)]"
                                )}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                                <div className="flex-1 relative flex flex-col items-center justify-center gap-3">
                                    {customBg ? (
                                        <>
                                            <img src={customBg} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110 duration-700 opacity-60" alt="Custom" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                            <div className="z-10 flex flex-col items-center gap-1">
                                                <IconPlus size={24} className="text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white">{trans.settings.loading_bgs.upload}</span>
                                            </div>
                                            <button
                                                onClick={removeCustomBg}
                                                className="absolute top-3 right-3 p-2 bg-red-500/20 hover:bg-red-500/50 text-red-500 rounded-lg transition-all z-20"
                                            >
                                                <IconTrash size={14} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <IconPlus size={32} className="text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent-fg)] transition-colors" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent-fg)] transition-all">
                                                {trans.settings.loading_bgs.upload}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="p-3 bg-[var(--color-canvas-default)] flex justify-between items-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (customBg) {
                                                setPreviewStyle(currentStyle);
                                                setPreviewBg(customBg);
                                                playSelectSound();
                                            } else {
                                                fileInputRef.current?.click();
                                            }
                                        }}
                                        disabled={!customBg}
                                        onMouseEnter={playHoverSound}
                                        className={cn(
                                            "text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                                            customBg ? "text-[var(--color-fg-muted)] hover:text-[var(--color-accent-fg)]" : "opacity-30 cursor-not-allowed"
                                        )}
                                    >
                                        <IconEye size={12} />
                                        PREVIEW
                                    </button>
                                    {customBg && currentBg === customBg && <div className="w-2 h-2 rounded-full bg-[var(--color-accent-emphasis)]" />}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {}
            {previewStyle && (
                <div
                    className="fixed inset-0 z-[10000] animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Loader previewStyle={previewStyle as any} previewBg={previewBg || undefined} />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewStyle(null);
                            setPreviewBg(null);
                        }}
                        className="fixed top-8 right-8 z-[10001] bg-black/50 hover:bg-black/80 text-white p-4 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10 group overflow-hidden"
                    >
                        <IconX size={24} className="relative z-10" />
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default LoaderPickerModal;
