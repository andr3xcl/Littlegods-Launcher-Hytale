import React, { useState } from "react";
import DragBar from "./DragBar";
import { useI18n } from "../hooks/i18nContext";
import logo from "../assets/logo.png";
import { useUserContext } from "../hooks/userContext";
import { IconPlus, IconUser, IconTrash, IconChevronLeft } from "@tabler/icons-react";

const Login: React.FC = () => {
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
    <div className="w-full h-full flex flex-col overflow-hidden relative selection:bg-blue-500/30">
      <div className="fixed top-0 left-0 w-full z-[100]">
        <DragBar />
      </div>

      <div className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="glass-card max-w-[500px] w-full p-12 rounded-[64px] flex flex-col items-center animate-slideUp">

          <div className="flex flex-col items-center gap-5 mb-10">
            <img src={logo} alt="LittleGods Logo" className="w-20 h-auto drop-shadow-2xl" />
            <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-md">
              {isAdding ? "New Profile" : profiles.length > 0 ? "Select Profile" : t.welcome}
            </h1>
            <div className="h-1 w-12 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>

          {isAdding ? (
            <div className="w-full animate-fadeIn">
              <button
                onClick={() => setIsAdding(false)}
                className="mb-8 flex items-center gap-2 text-xs font-black uppercase text-gray-500 hover:text-white transition-all"
              >
                <IconChevronLeft size={16} /> Back to profiles
              </button>

              <form onSubmit={handleAddSubmit} className="w-full flex flex-col gap-8">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder={t.placeholder}
                    value={nick}
                    autoFocus
                    minLength={3}
                    maxLength={16}
                    onChange={(e) => setNick(e.target.value)}
                    className="w-full bg-white/5 border-2 border-white/5 rounded-[32px] px-8 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-center tracking-widest"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 font-black tracking-widest">
                    {nick.length}/16
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-[10px] text-center font-black tracking-[0.2em] uppercase animate-pulse">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-5 bg-blue-600 text-white rounded-[32px] text-sm font-black tracking-[0.3em] uppercase hover:bg-blue-500 active:scale-[0.98] transition-all shadow-[0_8px_32px_rgba(59,130,246,0.3)]"
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
                  className="group relative flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-[32px] cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                    <IconUser size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-white truncate tracking-tight">{p.username}</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest opacity-60">
                      {p.uuid ? `UUID: ${p.uuid.slice(0, 8)}...` : "System UUID"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this profile?")) removeProfile(p.id);
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center justify-center gap-3 p-5 border-2 border-dashed border-white/10 rounded-[32px] text-gray-500 hover:text-white hover:border-blue-500/50 hover:bg-white/5 transition-all duration-300"
              >
                <IconPlus size={20} />
                <span className="text-sm font-black uppercase tracking-widest">Add Profile</span>
              </button>
            </div>
          )}

          <footer className="mt-10 flex flex-col items-center gap-4">
            <div className="text-[9px] text-gray-500 font-bold tracking-[0.4em] uppercase opacity-40">{trans.app.version} {window.config.VERSION}</div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
