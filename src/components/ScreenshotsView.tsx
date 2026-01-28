import React, { useState, useEffect } from "react";
import { IconPhoto, IconFolderOpen, IconRefresh, IconFolder } from "@tabler/icons-react";
import { useI18n } from "../hooks/i18nContext";

interface Screenshot {
    name: string;
    url: string;
    ctime: number;
}

const ScreenshotsView: React.FC = () => {
    const { t: trans } = useI18n();
    const t = trans.screenshots || {
        title: "Screenshots",
        no_images: "No screenshots found yet",
        open_folder: "Open Folder",
        refresh: "Refresh",
        select_folder: "Select Folder",
    };

    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [loading, setLoading] = useState(false);
    const [folderPath, setFolderPath] = useState<string>("");

    useEffect(() => {
        const saved = localStorage.getItem("screenshotsFolder");
        if (saved) {
            setFolderPath(saved);
            loadScreenshots(saved);
        }
    }, []);

    const loadScreenshots = async (folder?: string) => {
        const targetFolder = folder || folderPath;
        if (!targetFolder) return;

        setLoading(true);
        try {
            const list = await window.ipcRenderer.invoke("screenshots:list", targetFolder);
            setScreenshots(list);
        } catch (err) {
            console.error("Failed to load screenshots", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFolder = async () => {
        const folder = await window.ipcRenderer.invoke("screenshots:select-folder");
        if (folder) {
            setFolderPath(folder);
            localStorage.setItem("screenshotsFolder", folder);
            loadScreenshots(folder);
        }
    };

    const handleOpenFolder = () => {
        if (folderPath) {
            window.ipcRenderer.invoke("screenshots:open-folder", folderPath);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent animate-fadeIn">
            {}
            <div className="flex items-center justify-between p-8 border-b border-white/5 bg-transparent z-10">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <IconPhoto size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{t.title}</h2>
                        {folderPath && (
                            <p className="text-xs text-gray-500 font-medium mt-1">{folderPath}</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    {folderPath && (
                        <>
                            <button
                                onClick={() => loadScreenshots()}
                                className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all active:scale-95 text-gray-400 hover:text-white"
                                title={t.refresh}
                            >
                                <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button
                                onClick={handleOpenFolder}
                                className="px-8 py-3 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10"
                            >
                                <IconFolderOpen size={18} />
                                {t.open_folder}
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleSelectFolder}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                    >
                        <IconFolder size={18} />
                        {folderPath ? "Cambiar Carpeta" : t.select_folder}
                    </button>
                </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {!folderPath ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6">
                        <IconFolder size={64} className="text-gray-400 opacity-20" />
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest opacity-60">Selecciona una carpeta</p>
                    </div>
                ) : loading && screenshots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6">
                        <div className="w-14 h-14 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin" />
                    </div>
                ) : screenshots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-20">
                        <IconPhoto size={64} className="text-gray-400" />
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">{t.no_images}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-slideUp">
                        {screenshots.map((s, idx) => (
                            <div
                                key={idx}
                                className="group relative aspect-video glass-card rounded-[32px] overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-500"
                            >
                                <img
                                    src={s.url}
                                    alt={s.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">
                                        {s.name}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScreenshotsView;
