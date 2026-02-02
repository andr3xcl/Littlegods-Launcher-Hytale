import React, { useEffect, useState } from "react";
import { IconServer, IconInfoCircle, IconRefresh, IconCopy, IconCheck, IconPlus, IconPencil, IconDeviceFloppy, IconX, IconTrash, IconLoader2 } from "@tabler/icons-react";
import cn from "../utils/cn";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { useI18n } from "../hooks/i18nContext";

interface ServerInfo {
    Id: string;
    Name: string;
    Address: string;
    DateSaved?: string;
}

const ServersView: React.FC = () => {
    const [servers, setServers] = useState<ServerInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { playHoverSound, playSaveSound, playSelectSound } = useSoundEffects();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<ServerInfo | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const { t } = useI18n();

    const loadServers = async () => {
        setLoading(true);
        try {
            const list = await window.ipcRenderer.invoke("servers:list");
            setServers(list || []);
        } catch (err) {
            console.error("Failed to load servers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServers();
    }, []);

    const copyAddress = (address: string, id: string) => {
        navigator.clipboard.writeText(address.trim());
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSaveServers = async (updatedList: ServerInfo[]) => {
        setSaving(true);
        setFormError(null);
        try {
            const result = await window.ipcRenderer.invoke("servers:save", updatedList);
            if (result && result.success) {
                setServers(updatedList);
                setEditingId(null);
                setEditForm(null);
                playSaveSound();
            } else {
                setFormError(result?.error || t.servers.register);
            }
        } catch (err) {
            console.error("Failed to save servers", err);
            setFormError("Unexpected error saving servers. Check dev console.");
        } finally {
            setSaving(false);
        }
    };

    const startEditing = (server: ServerInfo) => {
        setFormError(null);
        setEditForm({ ...server });
        setEditingId(server.Id);
    };

    const startAdding = () => {
        setFormError(null);
        playSelectSound();
        
        const newId = crypto.randomUUID();
        const newServer: ServerInfo = {
            Id: newId,
            Name: "",
            Address: "",
            DateSaved: new Date().toISOString()
        };
        setEditForm(newServer);
        setEditingId(newId);
    };

    const confirmEdit = () => {
        if (!editForm) return;

        const trimmedName = editForm.Name.trim();
        const trimmedAddress = editForm.Address.trim();

        if (!trimmedName || !trimmedAddress) {
            setFormError(t.servers.error_required);
            return;
        }

        const finalServer = { ...editForm, Name: trimmedName, Address: trimmedAddress };
        const exists = servers.some(s => s.Id === editingId);

        let newList: ServerInfo[];
        if (exists) {
            newList = servers.map(s => s.Id === editingId ? finalServer : s);
        } else {
            newList = [...servers, finalServer];
        }

        handleSaveServers(newList);
    };

    const deleteServer = (id: string) => {
        if (!confirm(t.servers.delete_confirm)) return;
        const newList = servers.filter(s => s.Id !== id);
        handleSaveServers(newList);
    };

    return (
        <div className="flex flex-col h-full bg-transparent animate-fadeIn">
            <div className="flex items-center justify-between p-8 border-b border-white/5">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[var(--color-accent-fg)] shadow-sm border border-white/5">
                        <IconServer size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{t.servers.title}</h2>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{t.servers.subtitle}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={startAdding}
                        onMouseEnter={playHoverSound}
                        className="px-6 py-3 gh-btn gh-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-accent-emphasis)]/20 flex items-center gap-2"
                    >
                        <IconPlus size={16} />
                        {t.servers.add}
                    </button>
                    <button
                        onClick={loadServers}
                        onMouseEnter={playHoverSound}
                        className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all active:scale-95 shadow-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                    >
                        <IconRefresh size={20} className={cn(loading && "animate-spin text-[var(--color-accent-fg)]")} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6 opacity-30">
                        <IconLoader2 size={48} className="animate-spin text-[var(--color-accent-fg)]" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Scanning servers...</p>
                    </div>
                ) : (servers.length === 0 && !editForm) ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                        <IconServer size={64} className="text-gray-400" />
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">{t.servers.no_servers}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {}
                        {editingId && !servers.find(s => s.Id === editingId) && editForm && (
                            <div className="glass-card p-10 rounded-[40px] border-2 border-[var(--color-accent-emphasis)]/50 bg-[var(--color-accent-emphasis)]/10 shadow-2xl animate-slideUp">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.servers.new_server_name}</label>
                                        <input
                                            type="text"
                                            value={editForm.Name}
                                            disabled={saving}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditForm(prev => prev ? { ...prev, Name: val } : prev);
                                                if (formError) setFormError(null);
                                            }}
                                            onKeyDown={e => e.key === "Enter" && confirmEdit()}
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[var(--color-accent-emphasis)] focus:bg-black/80 transition-all outline-none disabled:opacity-50"
                                            placeholder="Example: Spain Hytale"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.servers.ip_address}</label>
                                        <input
                                            type="text"
                                            value={editForm.Address}
                                            disabled={saving}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditForm(prev => prev ? { ...prev, Address: val } : prev);
                                                if (formError) setFormError(null);
                                            }}
                                            onKeyDown={e => e.key === "Enter" && confirmEdit()}
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[var(--color-accent-emphasis)] focus:bg-black/80 transition-all outline-none disabled:opacity-50"
                                            placeholder="play.example.com"
                                        />
                                    </div>
                                </div>
                                {formError && (
                                    <div className="mb-6 px-4 py-3 rounded-xl bg-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_90%)] border border-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_80%)] text-[var(--color-danger-emphasis)] text-[10px] font-black uppercase tracking-widest animate-shake">
                                        {formError}
                                    </div>
                                )}
                                <div className="flex justify-end items-center gap-6">
                                    <button
                                        onClick={() => { setEditingId(null); setEditForm(null); setFormError(null); playSelectSound(); }}
                                        className="text-[10px] font-black uppercase text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] transition-all tracking-[0.2em]"
                                    >
                                        {t.servers.cancel}
                                    </button>
                                    <button
                                        onClick={confirmEdit}
                                        disabled={saving}
                                        className="px-10 py-5 gh-btn gh-btn-primary rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl disabled:opacity-50"
                                    >
                                        {saving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                                        {t.servers.register}
                                    </button>
                                </div>
                            </div>
                        )}

                        {servers.map((server) => (
                            <div key={server.Id}>
                                {editingId === server.Id && editForm ? (
                                    <div className="glass-card p-6 rounded-[24px] border-2 border-[var(--color-accent-emphasis)]/50 bg-[var(--color-accent-emphasis)]/5 shadow-lg animate-fadeIn flex flex-col gap-4">
                                        <div className="flex gap-4 items-center">
                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    value={editForm.Name}
                                                    disabled={saving}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditForm(prev => prev ? { ...prev, Name: val } : prev);
                                                        if (formError) setFormError(null);
                                                    }}
                                                    onKeyDown={e => e.key === "Enter" && confirmEdit()}
                                                    className="bg-black/60 border border-white/10 rounded-xl px-5 py-3 text-xs text-white outline-none focus:border-[var(--color-accent-emphasis)] transition-all disabled:opacity-50"
                                                    autoFocus
                                                />
                                                <input
                                                    type="text"
                                                    value={editForm.Address}
                                                    disabled={saving}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditForm(prev => prev ? { ...prev, Address: val } : prev);
                                                        if (formError) setFormError(null);
                                                    }}
                                                    onKeyDown={e => e.key === "Enter" && confirmEdit()}
                                                    className="bg-black/60 border border-white/10 rounded-xl px-5 py-3 text-xs text-white outline-none focus:border-[var(--color-accent-emphasis)] transition-all disabled:opacity-50"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={confirmEdit}
                                                    disabled={saving}
                                                    className="p-3 gh-btn gh-btn-primary rounded-xl disabled:opacity-50"
                                                >
                                                    {saving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => { setEditingId(null); setEditForm(null); setFormError(null); playSelectSound(); }}
                                                    className="p-3 bg-white/5 text-[var(--color-fg-muted)] rounded-xl hover:text-[var(--color-fg-default)] transition-all"
                                                >
                                                    <IconX size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        {formError && (
                                            <div className="text-[9px] font-black text-[var(--color-danger-emphasis)] uppercase tracking-widest px-1">
                                                {formError}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="glass-card p-6 rounded-[24px] flex items-center justify-between group hover:border-[color-mix(in_srgb,var(--color-accent-emphasis),transparent_70%)] transition-all hover:bg-white/[0.02]">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-[var(--color-canvas-subtle)] flex items-center justify-center text-gray-600 shadow-inner group-hover:text-[var(--color-accent-fg)] group-hover:bg-[var(--color-accent-emphasis)]/5 transition-all duration-300">
                                                <span className="text-xl font-black">{server.Name ? server.Name.charAt(0).toUpperCase() : "?"}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-black text-white leading-tight group-hover:text-[var(--color-accent-fg)] transition-colors">{server.Name}</h3>
                                                    <button
                                                        onClick={() => startEditing(server)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-accent-fg)] hover:bg-[color-mix(in_srgb,var(--color-accent-emphasis),transparent_90%)] rounded-lg transition-all"
                                                    >
                                                        <IconPencil size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="px-3 py-1 rounded-lg bg-black/40 text-[9px] font-black text-[var(--color-fg-muted)] tracking-wider font-mono border border-white/5 group-hover:border-[var(--color-accent-emphasis)]/20 group-hover:text-[var(--color-fg-default)] transition-all">
                                                        {server.Address}
                                                    </span>
                                                    <button
                                                        onClick={() => copyAddress(server.Address, server.Id)}
                                                        className="p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-accent-fg)] hover:bg-[color-mix(in_srgb,var(--color-accent-emphasis),transparent_90%)] rounded-lg transition-all"
                                                        title="Copy IP"
                                                    >
                                                        {copiedId === server.Id ? <IconCheck size={14} className="text-[var(--color-success-fg)]" /> : <IconCopy size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => deleteServer(server.Id)}
                                                className="opacity-0 group-hover:opacity-100 p-3 text-[var(--color-fg-muted)] hover:text-[var(--color-danger-emphasis)] hover:bg-[color-mix(in_srgb,var(--color-danger-emphasis),transparent_90%)] rounded-xl transition-all"
                                            >
                                                <IconTrash size={18} />
                                            </button>
                                            <div className="px-5 py-2.5 rounded-xl bg-[var(--color-accent-emphasis)]/5 text-[var(--color-accent-fg)]/40 text-[9px] font-black uppercase tracking-[0.2em] border border-[var(--color-accent-emphasis)]/10 group-hover:border-[var(--color-accent-emphasis)]/30 group-hover:text-[var(--color-accent-fg)] transition-all">
                                                {t.servers.synced}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-8 border-t border-white/5 bg-black/40">
                <div className="flex items-start gap-4 text-[var(--color-fg-muted)] max-w-2xl mx-auto backdrop-blur-sm">
                    <div className="p-2 rounded-lg bg-[var(--color-accent-emphasis)]/10 text-[var(--color-accent-fg)]">
                        <IconInfoCircle size={18} className="flex-shrink-0" />
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed uppercase tracking-wider opacity-60">
                        {t.servers.sync_info}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServersView;
