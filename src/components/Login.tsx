import React, { useState } from "react";
import DragBar from "./DragBar";
import { useI18n } from "../hooks/i18nContext";
import logo from "../assets/logo.png";
import { useUserContext } from "../hooks/userContext";
import { IconPlus, IconUser, IconTrash, IconChevronLeft } from "@tabler/icons-react";

const Login: React.FC<{ isOffline?: boolean }> = ({ isOffline }) => {
  const { t: trans } = useI18n();
  const t = trans.login;
  const { profiles, addProfile, selectProfile, removeProfile } = useUserContext();

  const [isAdding, setIsAdding] = useState(false);
  const [nick, setNick] = useState("");
  const [error, setError] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nick.trim()) {
      setError(t.error_required);
      return;
    }
    if (nick.length < 3) {
      setError(t.error_short);
      return;
    }
    setError("");
    addProfile(nick.trim());
    setIsAdding(false);
    setNick("");
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative selection:bg-[var(--color-accent-emphasis)]/30">
      <div className="fixed top-0 left-0 w-full z-[100]">
        <DragBar />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="glass-card max-w-[400px] w-full p-8 rounded-[40px] flex flex-col items-center animate-slideUp">

          <div className="flex flex-col items-center gap-4 mb-6">
            <img src={logo} alt="LittleGods Logo" className="w-16 h-auto drop-shadow-2xl" />
            <h1 className="text-2xl font-black tracking-tighter text-white drop-shadow-md">
              {isAdding ? "New Profile" : profiles.length > 0 ? (isOffline ? "Select Offline Profile" : "Select Profile") : t.welcome}
            </h1>
            <div className="h-1 w-12 bg-[var(--color-accent-emphasis)] rounded-full shadow-[0_0_15px_color-mix(in_srgb,var(--color-accent-emphasis),transparent_50%)]" />
          </div>

          {isAdding ? (
            <div className="w-full animate-fadeIn">
              <button
                onClick={() => setIsAdding(false)}
                className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase text-[var(--color-fg-muted)] hover:text-white transition-all"
              >
                <IconChevronLeft size={16} /> Back to profiles
              </button>

              <form onSubmit={handleAddSubmit} className="w-full flex flex-col gap-6">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder={t.placeholder}
                    value={nick}
                    autoFocus
                    minLength={3}
                    maxLength={16}
                    onChange={(e) => setNick(e.target.value)}
                    className="w-full bg-white/5 border-2 border-white/5 rounded-[24px] px-6 py-4 text-white font-bold outline-none focus:border-[var(--color-accent-emphasis)] focus:bg-white/10 transition-all text-center tracking-widest"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] text-[var(--color-fg-muted)] font-black tracking-widest">
                    {nick.length}/16
                  </div>
                </div>

                {error && (
                  <div className="text-[var(--color-danger-emphasis)] text-[10px] text-center font-black tracking-[0.2em] uppercase animate-pulse">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-[var(--color-accent-emphasis)] text-[var(--color-accent-fg)] rounded-[24px] text-xs font-black tracking-[0.3em] uppercase hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                >
                  Create Profile
                </button>
              </form>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 gap-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 animate-fadeIn">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => selectProfile(p.id)}
                  className="group relative flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-[24px] cursor-pointer hover:bg-white/10 hover:border-[var(--color-accent-emphasis)] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-emphasis)]/20 overflow-hidden flex items-center justify-center text-[var(--color-accent-fg)] group-hover:bg-[var(--color-accent-emphasis)] transition-all shadow-inner border border-white/5 group-hover:border-white/20">
                    {p.photo ? (
                      <img src={p.photo} alt={p.username} className="w-full h-full object-cover" />
                    ) : (
                      <img src="media://raw/icon_profile/default_profile.png" alt="Default" className="w-full h-full object-cover opacity-50 contrast-125 saturate-0 group-hover:saturate-100 group-hover:opacity-100 transition-all" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-white truncate tracking-tight">{p.username}</h3>
                    <p className="text-[10px] text-[var(--color-fg-muted)] font-black uppercase tracking-widest opacity-60">
                      {p.uuid ? `UUID: ${p.uuid.slice(0, 8)}...` : "System UUID"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this profile?")) removeProfile(p.id);
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-danger-emphasis)] hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/10 rounded-[24px] text-[var(--color-fg-muted)] hover:text-white hover:border-[var(--color-accent-emphasis)] hover:bg-white/5 transition-all duration-300"
              >
                <IconPlus size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Add Profile</span>
              </button>
            </div>
          )}

          <footer className="mt-6 flex flex-col items-center gap-4">
            <div className="text-[9px] text-[var(--color-fg-muted)] font-bold tracking-[0.4em] uppercase opacity-40">{trans.app.version} {window.config.VERSION}</div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
