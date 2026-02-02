import React, { useEffect, useCallback } from "react";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";

interface Screenshot {
    name: string;
    url: string;
    ctime: number;
}

interface ScreenshotModalProps {
    screenshots: Screenshot[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
    screenshots,
    currentIndex,
    onClose,
    onNavigate,
}) => {
    const total = screenshots.length;
    const current = screenshots[currentIndex];

    const handlePrevious = useCallback(() => {
        const nextIndex = (currentIndex - 1 + total) % total;
        onNavigate(nextIndex);
    }, [currentIndex, total, onNavigate]);

    const handleNext = useCallback(() => {
        const nextIndex = (currentIndex + 1) % total;
        onNavigate(nextIndex);
    }, [currentIndex, total, onNavigate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrevious();
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handlePrevious, handleNext, onClose]);

    if (!current) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 animate-fadeIn backdrop-blur-sm"
            onClick={onClose}
        >
            {}
            <button
                onClick={onClose}
                className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all z-[110] active:scale-95 border border-white/10"
            >
                <IconX size={24} />
            </button>

            {}
            {total > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevious();
                        }}
                        className="absolute left-8 w-16 h-16 rounded-3xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all z-[110] active:scale-90 border border-white/5 hover:border-white/20"
                    >
                        <IconChevronLeft size={32} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        className="absolute right-8 w-16 h-16 rounded-3xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all z-[110] active:scale-90 border border-white/5 hover:border-white/20"
                    >
                        <IconChevronRight size={32} />
                    </button>
                </>
            )}

            {}
            <div
                className="max-w-[90vw] max-h-[85vh] relative group"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={current.url}
                    alt={current.name}
                    className="w-full h-full object-contain rounded-2xl shadow-2xl animate-scaleIn"
                />

                {}
                <div className="absolute -bottom-16 left-0 right-0 text-center">
                    <p className="text-sm font-black text-white uppercase tracking-widest bg-white/10 px-6 py-2 rounded-full inline-block backdrop-blur-md border border-white/10">
                        {current.name}
                    </p>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-2">
                        {currentIndex + 1} / {total}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ScreenshotModal;
