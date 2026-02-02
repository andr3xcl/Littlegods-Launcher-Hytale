import React from "react";
import { IconX, IconMusic, IconPlayerPlay, IconVolume, IconVolumeOff, IconRefresh, IconCheck } from "@tabler/icons-react";
import { useMusic } from "../hooks/useMusic";
import { useI18n } from "../hooks/i18nContext";
import { useSoundEffects } from "../hooks/useSoundEffects";
import cn from "../utils/cn";

interface MusicSoundModalProps {
    open: boolean;
    onClose: () => void;
}

const MusicSoundModal: React.FC<MusicSoundModalProps> = ({ open, onClose }) => {
    const { t } = useI18n();
    const {
        enabled: musicEnabled,
        setEnabled: setMusicEnabled,
        isPlaying,
        volume,
        setVolume,
        currentTrack,
        selectTrack,
        musicFiles,
        isRandom,
        setIsRandom
    } = useMusic();

    const {
        playHoverSound,
        playSelectSound,
        sfxVolume,
        setSfxVolume,
        sfxEnabled,
        setSfxEnabled
    } = useSoundEffects();

    if (!open) return null;

    const musicT = t.settings.music_sound;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn" onClick={onClose}>
            <div
                className="relative w-full max-w-lg gh-box bg-[var(--color-canvas-default)] flex flex-col shadow-2xl max-h-[80vh] overflow-hidden no-drag"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
                    <div className="flex items-center gap-2">
                        <IconMusic size={18} className="text-[var(--color-accent-fg)]" />
                        <h2 className="text-sm font-semibold">{musicT.title}</h2>
                    </div>
                    <button
                        className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
                        onClick={() => { onClose(); playSelectSound(); }}
                        onMouseEnter={playHoverSound}
                    >
                        <IconX size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">{musicT.music_volume}</span>
                            <span className="text-xs font-mono text-[var(--color-accent-fg)] font-bold">{Math.round(volume * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {volume === 0 ? <IconVolumeOff size={20} className="text-[var(--color-fg-muted)]" /> : <IconVolume size={20} className="text-[var(--color-accent-fg)]" />}
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-emphasis)]"
                            />
                        </div>
                    </div>

                    {}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">{musicT.sfx_volume}</span>
                            <span className="text-xs font-mono text-[var(--color-accent-fg)] font-bold">{Math.round(sfxVolume * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {sfxVolume === 0 ? <IconVolumeOff size={20} className="text-[var(--color-fg-muted)]" /> : <IconVolume size={20} className="text-[var(--color-accent-fg)]" />}
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={sfxVolume}
                                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-[var(--color-border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-emphasis)]"
                            />
                        </div>
                    </div>

                    {}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-xl flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{musicT.enable_music}</span>
                                <input
                                    type="checkbox"
                                    checked={musicEnabled}
                                    onChange={(e) => { setMusicEnabled(e.target.checked); playSelectSound(); }}
                                    className="w-4 h-4 rounded accent-[var(--color-accent-emphasis)]"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{musicT.random}</span>
                                <button
                                    onClick={() => { setIsRandom(!isRandom); playSelectSound(); }}
                                    onMouseEnter={playHoverSound}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        isRandom ? "bg-[var(--color-accent-emphasis)] text-white shadow-md" : "bg-[var(--color-btn-bg)] text-[var(--color-fg-muted)] border border-[var(--color-border-default)]"
                                    )}
                                >
                                    <IconRefresh size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--color-canvas-subtle)] border border-[var(--color-border-default)] rounded-xl flex flex-col justify-center gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{musicT.enable_sfx}</span>
                                <input
                                    type="checkbox"
                                    checked={sfxEnabled}
                                    onChange={(e) => { setSfxEnabled(e.target.checked); playSelectSound(); }}
                                    className="w-4 h-4 rounded accent-[var(--color-accent-emphasis)]"
                                />
                            </div>
                        </div>
                    </div>

                    {}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--color-border-muted)] pb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">{musicT.tracks}</span>
                            <span className="text-[10px] text-[var(--color-fg-muted)] italic">
                                {isPlaying ? musicT.playing : musicT.paused}
                            </span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {musicFiles.map((file) => {
                                const isActive = currentTrack === file;
                                return (
                                    <button
                                        key={file}
                                        onClick={() => { selectTrack(file); playSelectSound(); }}
                                        onMouseEnter={playHoverSound}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group",
                                            isActive
                                                ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent-fg)] border border-[var(--color-accent-muted)]"
                                                : "bg-transparent text-[var(--color-fg-default)] hover:bg-[var(--color-canvas-subtle)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            {isActive ? <IconPlayerPlay size={14} className="fill-[var(--color-accent-fg)]" /> : <IconMusic size={14} className="opacity-40" />}
                                            <span className="truncate">{file.replace(/\.(mp3|ogg|wav)$/i, "").replace(/_/g, " ")}</span>
                                        </div>
                                        {isActive && <IconCheck size={14} className="text-[var(--color-accent-fg)]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] flex justify-end">
                    <button
                        onClick={() => { onClose(); playSelectSound(); }}
                        className="gh-btn px-6 text-xs font-bold bg-[var(--color-accent-emphasis)] text-white hover:opacity-90 border-none"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MusicSoundModal;
