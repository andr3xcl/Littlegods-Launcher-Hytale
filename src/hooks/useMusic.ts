import { useEffect, useState } from "react";
import { useGameContext } from "./gameContext";


const globalAudio = new Audio();
let globalMusicFiles: string[] = [];
let isInitialized = false;


const savedVolume = localStorage.getItem("musicVolume");
globalAudio.volume = savedVolume ? parseFloat(savedVolume) : 0.4;

export const useMusic = () => {
    const { gameLaunched } = useGameContext();
    const [enabled, setEnabledState] = useState(() => localStorage.getItem("enableMusic") !== "false");
    const [isPausedBySystem, setIsPausedBySystem] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolumeState] = useState(globalAudio.volume);
    const [currentTrack, setCurrentTrack] = useState<string | null>(null);
    const [isRandom, setIsRandom] = useState(() => localStorage.getItem("musicRandom") !== "false");

    const setEnabled = (val: boolean) => {
        setEnabledState(val);
        localStorage.setItem("enableMusic", val ? "true" : "false");
        window.dispatchEvent(new Event("music-settings-changed"));
    };

    const setVolume = (val: number) => {
        globalAudio.volume = val;
        setVolumeState(val);
        localStorage.setItem("musicVolume", val.toString());
    };

    const setRandom = (val: boolean) => {
        setIsRandom(val);
        localStorage.setItem("musicRandom", val ? "true" : "false");
    };

    useEffect(() => {
        const attemptPlay = () => {
            if (enabled && !gameLaunched && globalAudio.paused && globalAudio.src && !isPausedBySystem) {
                globalAudio.play()
                    .then(() => {
                        setIsPlaying(true);
                    })
                    .catch(err => {
                        console.error("[Music] Playback failed:", err);
                        setIsPlaying(false);
                        const resumeOnInteraction = () => {
                            if (enabled && !gameLaunched && globalAudio.src) {
                                globalAudio.play().then(() => {
                                    setIsPlaying(true);
                                    window.removeEventListener("click", resumeOnInteraction);
                                });
                            }
                        };
                        window.addEventListener("click", resumeOnInteraction);
                    });
            }
        };

        const playTrack = (track: string) => {
            globalAudio.src = `media://raw/music/${track}`;
            setCurrentTrack(track);
            attemptPlay();
        };

        const playRandom = () => {
            if (globalMusicFiles.length === 0) return;
            const randomIndex = Math.floor(Math.random() * globalMusicFiles.length);
            playTrack(globalMusicFiles[randomIndex]);
        };

        const onEnded = () => {
            setIsPlaying(false);
            if (isRandom) {
                playRandom();
            } else {
                
                
                
                globalAudio.play().then(() => setIsPlaying(true));
            }
        };

        globalAudio.onended = onEnded;

        if (!isInitialized) {
            isInitialized = true;
            window.ipcRenderer.invoke("music:list-files").then(files => {
                globalMusicFiles = files;
                if (globalMusicFiles.length > 0) {
                    if (isRandom) playRandom();
                    else playTrack(globalMusicFiles[0]);
                }
            });
        } else {
            setIsPlaying(!globalAudio.paused && !!globalAudio.src);
            
            if (globalAudio.src) {
                const parts = globalAudio.src.split("/");
                setCurrentTrack(decodeURIComponent(parts[parts.length - 1]));
            }
        }

        const onSettingsChanged = () => {
            setEnabledState(localStorage.getItem("enableMusic") !== "false");
        };

        const onMinimize = () => { setIsPausedBySystem(true); globalAudio.pause(); setIsPlaying(false); };
        const onRestore = () => {
            setIsPausedBySystem(false);
            if (enabled && !gameLaunched) globalAudio.play().then(() => setIsPlaying(true));
        };

        window.ipcRenderer.on("window-minimize", onMinimize);
        window.ipcRenderer.on("window-restore", onRestore);
        window.addEventListener("music-settings-changed", onSettingsChanged);

        return () => {
            window.ipcRenderer.off("window-minimize", onMinimize);
            window.ipcRenderer.off("window-restore", onRestore);
            window.removeEventListener("music-settings-changed", onSettingsChanged);
        };
    }, [enabled, gameLaunched, isRandom, isPausedBySystem]);

    useEffect(() => {
        if (gameLaunched || !enabled) {
            globalAudio.pause();
            setIsPlaying(false);
        } else if (enabled && !isPausedBySystem && globalAudio.paused && globalAudio.src) {
            globalAudio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    }, [gameLaunched, enabled, isPausedBySystem]);

    const selectTrack = (track: string) => {
        globalAudio.src = `media://raw/music/${track}`;
        setCurrentTrack(track);
        if (enabled && !gameLaunched) {
            globalAudio.play().then(() => setIsPlaying(true));
        }
    };

    return {
        enabled,
        setEnabled,
        isPlaying,
        volume,
        setVolume,
        currentTrack,
        selectTrack,
        musicFiles: globalMusicFiles,
        isRandom,
        setIsRandom: setRandom
    };
};
