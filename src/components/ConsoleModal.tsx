import React, { useEffect, useRef } from "react";
import { IconX, IconTerminal2, IconTrash } from "@tabler/icons-react";
import cn from "../utils/cn";
import { useI18n } from "../hooks/i18nContext";

interface ConsoleModalProps {
    open: boolean;
    onClose: () => void;
    logs: string[];
    onClear: () => void;
}

const ConsoleModal: React.FC<ConsoleModalProps> = ({ open, onClose, logs, onClear }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();
    const c = t.console;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fadeIn p-8"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl h-[70vh] glass-panel rounded-[56px] p-10 flex flex-col animate-slideUp shadow-huge border border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <IconTerminal2 size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{c.title}</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{c.subtitle}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClear}
                            className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all flex items-center gap-2 border border-white/5"
                        >
                            <IconTrash size={16} />
                            {c.clear}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all border border-white/5"
                        >
                            <IconX size={24} />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 bg-black/40 rounded-[32px] p-8 font-mono text-xs overflow-y-auto border border-white/5 shadow-inner custom-scrollbar"
                >
                    {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-40">
                            <IconTerminal2 size={48} stroke={1} />
                            <p className="font-bold uppercase tracking-widest text-[10px]">{c.waiting}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <span className="text-gray-700 select-none w-8 text-right font-bold">{i + 1}</span>
                                    <span className={cn(
                                        "flex-1 break-all leading-relaxed",
                                        log.includes("ERROR") || log.includes("Error") ? "text-red-400" :
                                            log.includes("WARN") ? "text-yellow-400" :
                                                log.startsWith("[Nix Install]") || log.includes("Nix") ? "text-blue-300" : "text-gray-300"
                                    )}>
                                        {log}
                                    </span>
                                </div>
                            ))}
                            <div className="h-4" /> {}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">{c.listening}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-gray-700 tracking-tighter">{logs.length} {c.lines}</span>
                </div>
            </div>
        </div>
    );
};

export default ConsoleModal;
