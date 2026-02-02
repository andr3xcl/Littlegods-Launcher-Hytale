import React, { useEffect, useState } from "react";
import {
    IconX,
    IconCalendar,
    IconExternalLink,
    IconLoader2,
    IconDownload,
    IconCheck,
    IconUser,
    IconPuzzle,
    IconChevronLeft,
    IconChevronRight
} from "@tabler/icons-react";
import { useI18n } from "../hooks/i18nContext";
import cn from "../utils/cn";

interface ModDetailsModalProps {
    open: boolean;
    onClose: () => void;
    mod: any;
    isInstalled: boolean;
    isDownloading: boolean;
    downloadPercent?: number;
    onDownload: (mod: any) => void;
}

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const API_KEY = "$2a$10$bqk254NMZOWVTzLVJCcxEOmhcyUujKxA5xk.kQCN9q0KNYFJd5b32";

const ModDetailsModal: React.FC<ModDetailsModalProps> = ({
    open,
    onClose,
    mod,
    isInstalled,
    isDownloading,
    downloadPercent,
    onDownload
}) => {
    const { lang, t: trans } = useI18n();
    const t = trans.mods;
    const [description, setDescription] = useState<string | null>(null);
    const [fullModData, setFullModData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (open && mod?.curseForgeId) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const [descRes, modRes] = await Promise.all([
                        window.ipcRenderer.invoke("fetch:json", `${CURSEFORGE_API}/mods/${mod.curseForgeId}/description`, {
                            headers: { "x-api-key": API_KEY }
                        }),
                        window.ipcRenderer.invoke("fetch:json", `${CURSEFORGE_API}/mods/${mod.curseForgeId}`, {
                            headers: { "x-api-key": API_KEY }
                        })
                    ]);

                    let finalDescription = descRes?.data || null;
                    let finalModData = modRes?.data || null;

                    if (lang !== "en") {
                        setTranslating(true);
                        try {
                            const translatePromises: Promise<any>[] = [];

                            if (finalDescription) {
                                translatePromises.push(window.ipcRenderer.invoke("news:translate", finalDescription, lang, true));
                            } else {
                                translatePromises.push(Promise.resolve(null));
                            }

                            if (finalModData) {
                                translatePromises.push(window.ipcRenderer.invoke("news:translate", finalModData.name, lang));
                                translatePromises.push(window.ipcRenderer.invoke("news:translate", finalModData.summary, lang));
                            } else {
                                translatePromises.push(Promise.resolve(null));
                                translatePromises.push(Promise.resolve(null));
                            }

                            const [tDesc, tName, tSummary] = await Promise.all(translatePromises);

                            if (tDesc) finalDescription = tDesc;
                            if (finalModData) {
                                finalModData = { ...finalModData, name: tName || finalModData.name, summary: tSummary || finalModData.summary };
                            }
                        } catch (err) {
                            console.error("Mod translation failed:", err);
                        } finally {
                            setTranslating(false);
                        }
                    }

                    setDescription(finalDescription);
                    setFullModData(finalModData);
                } catch (err) {
                    console.error("Error fetching mod details:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else {
            setDescription(null);
            setFullModData(null);
            setCurrentImageIndex(0);
        }
    }, [open, mod, lang]);

    if (!open || !mod) return null;

    const gallery = fullModData?.screenshots || [];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 animate-fadeIn">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl max-h-[90vh] bg-[var(--color-canvas-default)] rounded-[40px] shadow-2xl border border-[var(--color-border-default)] flex flex-col overflow-hidden animate-slideUp">
                {}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 p-3 bg-black/20 hover:bg-black/40 text-white rounded-2xl transition-all backdrop-blur-md active:scale-95 border border-white/10"
                >
                    <IconX size={20} />
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {}
                    <div className="relative p-8 md:p-12 pb-6 flex flex-col md:flex-row gap-8 items-start">
                        {}
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-[var(--color-canvas-subtle)] overflow-hidden flex-shrink-0 border border-[var(--color-border-default)] shadow-xl relative group">
                            {mod.thumbnailUrl ? (
                                <img src={mod.thumbnailUrl} alt={mod.name} className="w-full h-full object-cover" />
                            ) : (
                                <IconPuzzle size={48} className="text-[var(--color-fg-muted)]" />
                            )}
                        </div>

                        {}
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase text-[var(--color-accent-fg)] tracking-[0.2em]">{t.mod_details}</span>
                                <h2 className="text-4xl md:text-5xl font-black text-[var(--color-fg-default)] tracking-tighter leading-none">
                                    {fullModData?.name || mod.name}
                                </h2>
                            </div>

                            <div className="flex flex-wrap gap-4 py-2">
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-canvas-subtle)] rounded-xl border border-[var(--color-border-default)]">
                                    <IconUser size={16} className="text-[var(--color-fg-muted)]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-fg-muted)]">{mod.author}</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-canvas-subtle)] rounded-xl border border-[var(--color-border-default)]">
                                    <IconDownload size={16} className="text-[var(--color-fg-muted)]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-fg-muted)]">{fullModData?.downloadCount?.toLocaleString() || "..."} {t.downloads}</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-canvas-subtle)] rounded-xl border border-[var(--color-border-default)]">
                                    <IconCalendar size={16} className="text-[var(--color-fg-muted)]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-fg-muted)]">
                                        {t.last_updated}: {fullModData?.dateModified ? new Date(fullModData.dateModified).toLocaleDateString() : "..."}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-2">
                                <button
                                    onClick={() => onDownload(mod)}
                                    disabled={isDownloading || isInstalled}
                                    className={cn(
                                        "px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 flex items-center gap-3",
                                        isInstalled
                                            ? "bg-[var(--color-success-fg)] text-white"
                                            : "bg-[var(--color-accent-emphasis)] text-white hover:opacity-90"
                                    )}
                                >
                                    {isDownloading ? (
                                        <>
                                            <IconLoader2 size={18} className="animate-spin" />
                                            {downloadPercent}%
                                        </>
                                    ) : isInstalled ? (
                                        <>
                                            <IconCheck size={18} />
                                            {t.installed}
                                        </>
                                    ) : (
                                        <>
                                            <IconDownload size={18} />
                                            {t.download}
                                        </>
                                    )}
                                </button>

                                {mod.websiteUrl && (
                                    <button
                                        onClick={() => window.config?.openExternal?.(mod.websiteUrl)}
                                        className="px-8 py-4 bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)] border border-[var(--color-border-default)] rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[var(--color-btn-hover-bg)] transition-all flex items-center gap-3 active:scale-95"
                                    >
                                        <IconExternalLink size={18} />
                                        {t.visit_website}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {}
                    {gallery.length > 0 && (
                        <div className="px-8 md:px-12 py-8 border-y border-[var(--color-border-muted)] bg-[var(--color-canvas-subtle)]/30">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--color-fg-muted)] mb-6 ml-1">{t.gallery}</h3>

                            <div className="relative group/gallery">
                                <div className="aspect-[16/9] w-full bg-black/40 rounded-[32px] overflow-hidden border border-[var(--color-border-default)] relative">
                                    <img
                                        src={gallery[currentImageIndex].url}
                                        alt={`Screenshot ${currentImageIndex}`}
                                        className="w-full h-full object-contain"
                                    />

                                    {gallery.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : gallery.length - 1))}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/20 hover:bg-black/50 text-white rounded-full transition-all backdrop-blur-md opacity-0 group-hover/gallery:opacity-100"
                                            >
                                                <IconChevronLeft size={24} />
                                            </button>
                                            <button
                                                onClick={() => setCurrentImageIndex(prev => (prev < gallery.length - 1 ? prev + 1 : 0))}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/20 hover:bg-black/50 text-white rounded-full transition-all backdrop-blur-md opacity-0 group-hover/gallery:opacity-100"
                                            >
                                                <IconChevronRight size={24} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
                                    {gallery.map((img: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            className={cn(
                                                "w-24 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0",
                                                currentImageIndex === idx ? "border-[var(--color-accent-emphasis)] scale-105" : "border-transparent opacity-50 hover:opacity-100"
                                            )}
                                        >
                                            <img src={img.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {}
                    <div className="px-8 md:px-12 py-12">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--color-fg-muted)] mb-8 ml-1">{t.description}</h3>

                        {loading || translating ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-[var(--color-fg-muted)]">
                                <IconLoader2 size={40} className="animate-spin text-[var(--color-accent-fg)]" />
                                <p className="text-sm font-black uppercase tracking-widest animate-pulse">
                                    {translating ? trans.app.translating_content : trans.app.loading_content}
                                </p>
                            </div>
                        ) : description ? (
                            <div
                                className="prose prose-invert prose-hytale max-w-none text-[var(--color-fg-default)] 
                                           prose-headings:font-black prose-headings:tracking-tight
                                           prose-p:text-base prose-p:leading-relaxed prose-p:mb-6
                                           prose-strong:text-[var(--color-accent-fg)]
                                           prose-img:rounded-[32px] prose-img:shadow-2xl prose-img:my-10
                                           prose-a:text-[var(--color-accent-fg)] prose-a:no-underline hover:prose-a:underline"
                                dangerouslySetInnerHTML={{ __html: description }}
                            />
                        ) : (
                            <div className="py-12 bg-[var(--color-canvas-subtle)] rounded-3xl border border-dashed border-[var(--color-border-default)] text-center text-[var(--color-fg-muted)]">
                                <p className="text-sm font-medium italic">{fullModData?.summary || mod.description}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModDetailsModal;
