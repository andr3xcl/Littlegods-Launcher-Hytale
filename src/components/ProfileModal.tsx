import React, { useRef } from "react";
import { IconX, IconUser, IconCamera, IconUpload, IconReload } from "@tabler/icons-react";
import { useUserContext } from "../hooks/userContext";
import { useI18n } from "../hooks/i18nContext";
import { useSoundEffects } from "../hooks/useSoundEffects";
import cn from "../utils/cn";

const DEFAULT_AVATAR = "media://raw/icon_profile/default_profile.png"; 

const ProfileModal: React.FC<{
    open: boolean;
    onClose: () => void;
}> = ({ open, onClose }) => {
    const { currentProfile, updateProfile } = useUserContext();
    const { t: trans } = useI18n();
    const { playSelectSound, playHoverSound } = useSoundEffects();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const t = trans.profile;

    if (!open || !currentProfile) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            updateProfile(currentProfile.id, { photo: base64 });
            playSelectSound();
        };
        reader.readAsDataURL(file);
    };

    const resetPhoto = () => {
        updateProfile(currentProfile.id, { photo: "" });
        playSelectSound();
    };

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-8"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[450px] gh-box bg-[var(--color-canvas-default)] flex flex-col animate-slideUp shadow-2xl overflow-hidden no-drag"
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <IconUser size={18} />
                        {t.title}
                    </h2>
                    <button
                        className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-colors"
                        onClick={() => { onClose(); playSelectSound(); }}
                        onMouseEnter={playHoverSound}
                    >
                        <IconX size={18} />
                    </button>
                </div>

                {}
                <div className="p-8 flex flex-col items-center gap-6">
                    {}
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--color-accent-emphasis)] shadow-xl bg-[var(--color-canvas-subtle)] flex items-center justify-center">
                            {currentProfile.photo ? (
                                <img src={currentProfile.photo} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <img src={DEFAULT_AVATAR} alt="Profile" className="w-full h-full object-cover opacity-50" />
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            onMouseEnter={playHoverSound}
                            className="absolute bottom-0 right-0 p-2 bg-[var(--color-accent-emphasis)] text-white rounded-full shadow-lg hover:scale-110 transition-all border-2 border-[var(--color-canvas-default)]"
                            title={t.change_photo}
                        >
                            <IconCamera size={18} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {}
                    <div className="w-full space-y-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase text-[var(--color-fg-muted)] tracking-widest">{t.username}</span>
                            <div className="bg-[var(--color-canvas-subtle)] border border-[var(--color-border-muted)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--color-fg-default)]">
                                {currentProfile.username}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase text-[var(--color-fg-muted)] tracking-widest">{t.uuid}</span>
                            <div className="bg-[var(--color-canvas-subtle)] border border-[var(--color-border-muted)] rounded-xl px-4 py-3 text-[11px] font-mono text-[var(--color-fg-muted)] break-all">
                                {currentProfile.uuid || "No UUID set"}
                            </div>
                        </div>
                    </div>

                    {}
                    <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border-muted)]">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            onMouseEnter={playHoverSound}
                            className="gh-btn flex items-center justify-center gap-2 py-3"
                        >
                            <IconUpload size={16} />
                            {t.pick_from_pc}
                        </button>
                        <button
                            onClick={resetPhoto}
                            onMouseEnter={playHoverSound}
                            className="gh-btn flex items-center justify-center gap-2 py-3"
                        >
                            <IconReload size={16} />
                            {t.default_photo}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
