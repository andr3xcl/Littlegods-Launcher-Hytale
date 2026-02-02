import React, { useEffect, useState } from "react";
import { IconX, IconCalendar, IconExternalLink, IconLoader2 } from "@tabler/icons-react";
import { NewsItem } from "../../electron/utils/news";
import { useI18n } from "../hooks/i18nContext";

interface NewsModalProps {
    open: boolean;
    onClose: () => void;
    item: NewsItem | null;
}

const NewsModal: React.FC<NewsModalProps> = ({ open, onClose, item }) => {
    const { lang, t: trans } = useI18n();
    const t = trans.app;
    const [body, setBody] = useState<string | null>(null);
    const [title, setTitle] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);

    const [description, setDescription] = useState<string>("");

    useEffect(() => {
        if (open && item) {
            setTitle(item.title);
            setDescription(item.description);
            if (!item.slug) {
                const translateFallback = async () => {
                    if (lang !== "en") {
                        setTranslating(true);
                        try {
                            const [tTitle, tDesc] = await Promise.all([
                                window.ipcRenderer.invoke("news:translate", item.title, lang),
                                window.ipcRenderer.invoke("news:translate", item.description, lang)
                            ]);
                            setTitle(tTitle);
                            setDescription(tDesc);
                        } finally {
                            setTranslating(false);
                        }
                    }
                };
                translateFallback();
                setBody(null);
                return;
            }

            const fetchAndTranslate = async () => {
                setLoading(true);
                try {
                    let content = await window.ipcRenderer.invoke("news:get-body", item.slug);
                    let currentTitle = item.title;
                    let currentDesc = item.description;

                    if (lang !== "en") {
                        setTranslating(true);
                        try {
                            const [tTitle, tBody, tDesc] = await Promise.all([
                                window.ipcRenderer.invoke("news:translate", currentTitle, lang),
                                content ? window.ipcRenderer.invoke("news:translate", content, lang, true) : null,
                                window.ipcRenderer.invoke("news:translate", currentDesc, lang)
                            ]);

                            currentTitle = tTitle;
                            if (tBody) content = tBody;
                            currentDesc = tDesc;
                        } catch (tErr) {
                            console.error("Translation failed:", tErr);
                        } finally {
                            setTranslating(false);
                        }
                    }

                    if (content) {
                        
                        content = content.replace(/src="https?:\/\//g, (match: string) => {
                            const prefix = match.startsWith('src="https') ? 'https:
                            return `src="media://${encodeURIComponent(prefix)}`;
                        });
                    }

                    setTitle(currentTitle);
                    setBody(content);
                    setDescription(currentDesc);
                } catch (err) {
                    console.error("Error loading news body:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchAndTranslate();
        } else {
            setBody(null);
            setTitle("");
            setDescription("");
        }
    }, [open, item, lang]);

    if (!open || !item) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fadeIn">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--color-canvas-default)] rounded-2xl shadow-2xl border border-[var(--color-border-default)] flex flex-col overflow-hidden animate-slideUp">
                {}
                <div className="relative h-48 md:h-64 overflow-hidden shrink-0">
                    {item.imageUrl && (
                        <img
                            src={item.imageUrl.startsWith("media://") ? item.imageUrl : `media://${encodeURIComponent(item.imageUrl)}`}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas-default)] to-transparent" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                {}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-2 py-0.5 bg-[var(--color-accent-emphasis)] text-[10px] font-bold text-white rounded uppercase">
                                {item.date || "News"}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)]">
                                <IconCalendar size={14} />
                                <span>Hytale Official Blog</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-6 gap-4">
                            <h2 className="text-3xl md:text-4xl font-black text-[var(--color-fg-default)] leading-tight flex-1">
                                {title}
                            </h2>
                        </div>

                        {(loading || translating) ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-[var(--color-fg-muted)]">
                                <IconLoader2 size={40} className="animate-spin text-[var(--color-accent-fg)]" />
                                <p className="text-sm font-medium animate-pulse">
                                    {translating ? t.translating_content : t.loading_content}
                                </p>
                            </div>
                        ) : body ? (
                            <div
                                className="prose prose-invert prose-hytale max-w-none text-[var(--color-fg-default)] 
                           prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
                           prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                           prose-p:text-base prose-p:leading-relaxed prose-p:mb-4
                           prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-6
                           prose-li:mb-2
                           prose-strong:text-[var(--color-accent-fg)]
                           prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8"
                                dangerouslySetInnerHTML={{ __html: body }}
                            />
                        ) : (
                            <div className="py-12 text-center text-[var(--color-fg-muted)]">
                                <p className="text-lg leading-relaxed">{description}</p>
                                <div className="mt-8">
                                    <button
                                        onClick={() => item.destUrl && window.config?.openExternal?.(item.destUrl)}
                                        className="gh-btn gh-btn-primary flex items-center gap-2 mx-auto"
                                    >
                                        <IconExternalLink size={18} />
                                        {trans.launcher.visit_official_web}
                                    </button>
                                </div>
                            </div>
                        )}

                        {body && item.destUrl && (
                            <div className="mt-12 pt-8 border-t border-[var(--color-border-muted)] flex justify-center">
                                <button
                                    onClick={() => window.config?.openExternal?.(item.destUrl)}
                                    className="flex items-center gap-2 text-sm font-bold text-[var(--color-accent-fg)] hover:underline"
                                >
                                    <IconExternalLink size={16} />
                                    {trans.launcher.read_original}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsModal;
