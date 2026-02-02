import React, { useState, useMemo } from "react";
import { IconX, IconSearch, IconTypography } from "@tabler/icons-react";
import { useSoundEffects } from "../hooks/useSoundEffects";
import cn from "../utils/cn";
import { POPULAR_FONTS } from "../utils/googleFonts";
import { useI18n } from "../hooks/i18nContext";

const FontPickerModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelect: (font: string) => void;
    currentFont: string;
}> = ({ open, onClose, onSelect, currentFont }) => {
    const [search, setSearch] = useState("");
    const { playSelectSound } = useSoundEffects();
    const { t: trans } = useI18n(); 

    const filteredFonts = useMemo(() => {
        if (!search.trim()) return POPULAR_FONTS;
        return POPULAR_FONTS.filter((f) =>
            f.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    
    React.useEffect(() => {
        const fontsToLoad = filteredFonts.slice(0, 15);
        if (fontsToLoad.length === 0) return;

        const linkId = "modal-font-preview";
        let link = document.getElementById(linkId) as HTMLLinkElement;
        if (!link) {
            link = document.createElement("link");
            link.id = linkId;
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }

        const families = fontsToLoad.map(f => `family=${f.replace(/ /g, "+")}:wght@400`).join("&");
        link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    }, [filteredFonts]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-8"
            onClick={onClose}
        >
            <div
                className="gh-box w-full max-w-[600px] bg-[var(--color-canvas-default)] flex flex-col animate-slideUp shadow-xl h-[80vh] overflow-hidden no-drag"
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <IconTypography size={18} />
                        Pick a Font
                    </h3>
                    <button
                        className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
                        onClick={onClose}
                    >
                        <IconX size={18} />
                    </button>
                </div>

                {}
                <div className="p-4 border-b border-[var(--color-border-muted)] bg-[var(--color-canvas-default)]">
                    <div className="relative">
                        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)]" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search fonts..."
                            className="w-full bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-md pl-9 pr-4 py-2 text-sm text-[var(--color-fg-default)] outline-none focus:border-[var(--color-accent-fg)] focus:ring-1 focus:ring-[var(--color-accent-fg)]"
                        />
                    </div>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="grid grid-cols-1 gap-1">
                        {filteredFonts.map((font) => (
                            <button
                                key={font}
                                onClick={() => {
                                    onSelect(font);
                                    playSelectSound();
                                    onClose();
                                }}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-md border border-transparent text-left hover:bg-[var(--color-btn-hover-bg)] group transition-all",
                                    currentFont === font ? "bg-[var(--color-action-list-item-active-bg)] border-[var(--color-accent-emphasis)]" : ""
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[var(--color-fg-default)]">{font}</span>
                                    <span
                                        className="text-xs text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-default)] opacity-70"
                                        style={{ fontFamily: `"${font}", sans-serif` }}
                                    >
                                        The quick brown fox jumps over the lazy dog.
                                    </span>
                                </div>
                                {currentFont === font && (
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent-emphasis)]" />
                                )}
                            </button>
                        ))}
                    </div>
                    {filteredFonts.length === 0 && (
                        <div className="p-8 text-center text-[var(--color-fg-muted)] text-sm">
                            No fonts found matching "{search}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FontPickerModal;
