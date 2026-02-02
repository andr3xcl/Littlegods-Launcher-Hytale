import React, { useState, useMemo } from "react";
import { IconX, IconSearch, IconPalette } from "@tabler/icons-react";
import cn from "../utils/cn";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { PRESET_THEMES, ThemeDefinition } from "../utils/themes";

const ThemePickerModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelect: (themeId: string) => void;
    currentTheme: string;
}> = ({ open, onClose, onSelect, currentTheme }) => {
    const [search, setSearch] = useState("");
    const { playSelectSound } = useSoundEffects();

    const filteredThemes = useMemo(() => {
        if (!search.trim()) return PRESET_THEMES;
        return PRESET_THEMES.filter((t) =>
            t.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-8"
            onClick={onClose}
        >
            <div
                className="gh-box w-full max-w-[800px] bg-[var(--color-canvas-default)] flex flex-col animate-slideUp shadow-xl h-[85vh] overflow-hidden no-drag"
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <IconPalette size={18} />
                        Pick a Theme
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
                            placeholder="Search themes..."
                            className="w-full bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-md pl-9 pr-4 py-2 text-sm text-[var(--color-fg-default)] outline-none focus:border-[var(--color-accent-fg)] focus:ring-1 focus:ring-[var(--color-accent-fg)]"
                        />
                    </div>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-4 bg-[var(--color-canvas-subtle)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredThemes.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => {
                                    onSelect(theme.id);
                                    playSelectSound();
                                    onClose();
                                }}
                                className={cn(
                                    "flex flex-col rounded-lg border overflow-hidden transition-all text-left group hover:scale-[1.02] hover:shadow-lg",
                                    currentTheme === theme.id
                                        ? "border-[var(--color-accent-emphasis)] ring-1 ring-[var(--color-accent-emphasis)]"
                                        : "border-[var(--color-border-default)] hover:border-[var(--color-fg-muted)]"
                                )}
                            >
                                {}
                                <div
                                    className="h-24 w-full p-3 flex flex-col justify-between"
                                    style={{ backgroundColor: theme.colors["--color-canvas-default"] }}
                                >
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 rounded-full border border-white/10" style={{ backgroundColor: theme.colors["--color-canvas-subtle"] }} />
                                        <div className="w-full h-2 rounded-full self-center opacity-50" style={{ backgroundColor: theme.colors["--color-border-default"] }} />
                                    </div>

                                    <div className="flex gap-2 mt-auto">
                                        <div className="h-6 px-3 rounded text-[10px] font-bold flex items-center" style={{ backgroundColor: theme.colors["--color-btn-primary-bg"], color: theme.colors["--color-btn-primary-text"] }}>
                                            Button
                                        </div>
                                        <div className="h-6 px-3 rounded text-[10px] font-bold flex items-center" style={{ backgroundColor: theme.colors["--color-btn-bg"], color: theme.colors["--color-btn-text"], borderColor: theme.colors["--color-btn-border"], borderWidth: 1 }}>
                                            Secondary
                                        </div>
                                    </div>
                                </div>

                                {}
                                <div className="p-3 bg-[var(--color-canvas-default)] border-t border-[var(--color-border-default)]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-[var(--color-fg-default)]">{theme.name}</span>
                                        {currentTheme === theme.id && <div className="w-2 h-2 rounded-full bg-[var(--color-accent-emphasis)]" />}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    {filteredThemes.length === 0 && (
                        <div className="p-8 text-center text-[var(--color-fg-muted)] text-sm">
                            No themes found matching "{search}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThemePickerModal;
