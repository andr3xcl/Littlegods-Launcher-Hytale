import { useCallback, useRef, useState, useEffect } from "react";

export const useSoundEffects = () => {
    const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
    const [enabled, setEnabledState] = useState(() => localStorage.getItem("enableSFX") !== "false");
    const [volume, setVolumeState] = useState(() => {
        const saved = localStorage.getItem("sfxVolume");
        return saved ? parseFloat(saved) : 0.5;
    });

    const setEnabled = (val: boolean) => {
        setEnabledState(val);
        localStorage.setItem("enableSFX", val ? "true" : "false");
        window.dispatchEvent(new Event("sfx-settings-changed"));
    };

    const setVolume = (val: number) => {
        setVolumeState(val);
        localStorage.setItem("sfxVolume", val.toString());
        window.dispatchEvent(new Event("sfx-settings-changed"));
    };

    useEffect(() => {
        const syncSettings = () => {
            setEnabledState(localStorage.getItem("enableSFX") !== "false");
            const savedVol = localStorage.getItem("sfxVolume");
            if (savedVol) setVolumeState(parseFloat(savedVol));
        };

        window.addEventListener("sfx-settings-changed", syncSettings);
        return () => window.removeEventListener("sfx-settings-changed", syncSettings);
    }, []);

    const playSound = useCallback((path: string, baseVolume: number) => {
        if (!enabled) return;
        const audio = new Audio(path);
        audio.volume = baseVolume * volume;
        audio.play().catch(() => { });
    }, [enabled, volume]);

    const playHoverSound = useCallback(() => {
        if (!enabled) return;

        if (!hoverAudioRef.current) {
            hoverAudioRef.current = new Audio("media://raw/effect/navegation_launcher.mp3");
        }

        const audio = hoverAudioRef.current;
        audio.volume = 0.3 * volume;

        if (!audio.paused) {
            audio.currentTime = 0;
        }

        audio.play().catch(() => { });
    }, [enabled, volume]);

    const playSelectSound = useCallback(() => playSound("media://raw/effect/MenuTileSelect.ogg", 0.5), [playSound]);
    const playErrorSound = useCallback(() => playSound("media://raw/effect/ConnectionError.ogg", 0.6), [playSound]);
    const playSaveSound = useCallback(() => playSound("media://raw/effect/SaveActivate.ogg", 0.5), [playSound]);
    const playSearchSound = useCallback(() => playSound("media://raw/effect/SearchFieldCollapse.ogg", 0.4), [playSound]);
    const playLaunchSound = useCallback(() => playSound("media://raw/effect/UI_Buttons_Main_Activate_Stereo.ogg", 0.8), [playSound]);

    return {
        playHoverSound,
        playSelectSound,
        playErrorSound,
        playSaveSound,
        playSearchSound,
        playLaunchSound,
        sfxEnabled: enabled,
        setSfxEnabled: setEnabled,
        sfxVolume: volume,
        setSfxVolume: setVolume
    };
};
