import React, { useEffect, useState } from "react";
import { useI18n } from "../hooks/i18nContext";
import logo from "../assets/logo.png";


import load1 from "../../raw/wallpapers/load_1.jpg";
import load2 from "../../raw/wallpapers/load_2.jpg";
import load3 from "../../raw/wallpapers/load_3.jpg";

const WALLPAPERS: Record<string, string> = {
  load_1: load1,
  load_2: load2,
  load_3: load3,
};

type LoaderStyle = "premium" | "classic" | "minimal" | "vibrant" | "quantum" | "geometric" | "matrix";

const Loader: React.FC<{ previewStyle?: LoaderStyle; previewBg?: string }> = ({ previewStyle, previewBg }) => {
  const { t } = useI18n();
  const [dots, setDots] = useState("");
  const currentStyle = previewStyle || (localStorage.getItem("loaderStyle") as LoaderStyle) || "premium";
  const currentBg = previewBg || localStorage.getItem("loaderBg") || "none";

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const bgImage = currentBg.startsWith("data:image") ? currentBg : WALLPAPERS[currentBg];

  const renderBackground = () => {
    if (!bgImage) return null;
    return (
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={bgImage}
          alt="Background"
          className="w-full h-full object-cover opacity-50 scale-105 blur-[0.5px] animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas-default)] via-transparent to-[var(--color-canvas-default)] opacity-60" />
        <div className="absolute inset-0 bg-[var(--color-canvas-default)]/20" />
      </div>
    );
  };

  const commonBg = "fixed inset-0 bg-[var(--color-canvas-default)] flex flex-col items-center justify-center z-[10000] overflow-hidden selection:bg-none";

  const renderContent = () => {
    if (currentStyle === "classic") {
      return (
        <div className="flex flex-col items-center gap-12 animate-fadeIn z-10">
          <div className="flex flex-col items-center gap-6">
            <img src={logo} alt="Logo" className="w-24 h-auto drop-shadow-sm mb-2" />
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-[var(--color-border-muted)] rounded-full opacity-20" />
              <div className="absolute inset-0 border-4 border-[var(--color-accent-emphasis)] rounded-full border-t-transparent animate-spin" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-[var(--color-fg-muted)] uppercase tracking-[0.3em] mt-2">
            {t.app.loading}{dots}
          </p>
        </div>
      );
    }

    if (currentStyle === "minimal") {
      return (
        <div className="flex flex-col items-center gap-8 animate-fadeIn z-10">
          <img src={logo} alt="Logo" className="w-20 h-auto opacity-30 grayscale contrast-125" />
          <p className="text-[9px] font-black text-[var(--color-fg-muted)] uppercase tracking-[0.5em] ml-[0.5em] opacity-50">
            {t.app.loading}{dots}
          </p>
        </div>
      );
    }

    if (currentStyle === "vibrant") {
      return (
        <>
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 z-5">
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[var(--color-accent-emphasis)]/20 rounded-full blur-[140px] animate-vibrant-move-1" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[var(--color-accent-emphasis)]/10 rounded-full blur-[140px] animate-vibrant-move-2" />
            <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-accent-fg)]/10 rounded-full blur-[140px] animate-vibrant-move-3" />
          </div>

          <div className="flex flex-col items-center gap-20 animate-fadeIn z-10 scale-110">
            <div className="flex flex-col items-center gap-10">
              <div className="perspective-1000 animate-float-intense">
                <img src={logo} alt="Logo" className="w-36 h-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)] [transform:rotateX(15deg)_rotateY(-15deg)]" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-8 w-72">
              <div className="relative w-full h-1.5 bg-[var(--color-border-muted)]/20 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-[var(--color-accent-emphasis)] to-transparent animate-shimmer-fast" />
              </div>
              <p className="text-[11px] font-black text-[var(--color-fg-default)]/50 uppercase tracking-[0.6em] ml-[0.6em] animate-pulse">
                {t.app.loading}{dots}
              </p>
            </div>
          </div>
          <style>{`
            @keyframes float-intense { 0%, 100% { transform: translateY(0) rotateX(15deg) rotateY(-15deg) scale(1); } 50% { transform: translateY(-20px) rotateX(20deg) rotateY(-10deg) scale(1.05); } }
            @keyframes vibrant-move-1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(100px, 50px); } }
            @keyframes vibrant-move-2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-80px, -60px); } }
            @keyframes vibrant-move-3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(40px, -100px); } }
            @keyframes shimmer-fast { 0% { transform: translateX(-150%); } 100% { transform: translateX(250%); } }
            .animate-float-intense { animation: float-intense 5s ease-in-out infinite; }
            .animate-vibrant-move-1 { animation: vibrant-move-1 15s ease-in-out infinite; }
            .animate-vibrant-move-2 { animation: vibrant-move-2 18s ease-in-out infinite; }
            .animate-vibrant-move-3 { animation: vibrant-move-3 20s ease-in-out infinite; }
            .animate-shimmer-fast { animation: shimmer-fast 1s linear infinite; }
          `}</style>
        </>
      );
    }

    if (currentStyle === "quantum") {
      return (
        <div className="relative flex items-center justify-center w-64 h-64 animate-fadeIn z-10">
          <div className="absolute w-full h-full border border-[var(--color-accent-emphasis)]/20 rounded-full animate-orbit-1" />
          <div className="absolute w-4/5 h-4/5 border border-[var(--color-accent-emphasis)]/30 rounded-full animate-orbit-2" />
          <div className="absolute w-3/5 h-3/5 border border-[var(--color-accent-emphasis)]/40 rounded-full animate-orbit-3" />
          <img src={logo} alt="Logo" className="w-20 h-auto z-10 animate-pulse-slow" />
          <div className="absolute -bottom-16 flex flex-col items-center gap-2">
            <p className="text-[10px] font-black text-[var(--color-fg-muted)] uppercase tracking-[0.4em] ml-[0.4em]">
              {t.app.loading}{dots}
            </p>
          </div>
          <style>{`
            @keyframes orbit-1 { 0% { transform: rotate3d(1, 1, 1, 0deg); } 100% { transform: rotate3d(1, 1, 1, 360deg); } }
            @keyframes orbit-2 { 0% { transform: rotate3d(1, -1, 1, 0deg); } 100% { transform: rotate3d(1, -1, 1, 360deg); } }
            @keyframes orbit-3 { 0% { transform: rotate3d(-1, 1, 1, 0deg); } 100% { transform: rotate3d(-1, 1, 1, 360deg); } }
            @keyframes pulse-slow { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
            .animate-orbit-1 { animation: orbit-1 10s linear infinite; }
            .animate-orbit-2 { animation: orbit-2 8s linear infinite; }
            .animate-orbit-3 { animation: orbit-3 6s linear infinite; }
            .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
          `}</style>
        </div>
      );
    }

    if (currentStyle === "geometric") {
      return (
        <>
          <div className="absolute inset-0 overflow-hidden opacity-10 z-5">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-[var(--color-accent-emphasis)] rotate-45 animate-float-geo shadow-[0_0_20px_var(--color-accent-emphasis)]" />
            <div className="absolute top-2/3 right-1/4 w-24 h-24 border-2 border-[var(--color-accent-fg)] animate-float-geo-delay" />
            <div className="absolute top-1/2 left-2/3 w-16 h-16 border-2 border-[var(--color-fg-muted)] -rotate-12 animate-float-geo" />
          </div>
          <div className="flex flex-col items-center gap-8 z-10">
            <img src={logo} alt="Logo" className="w-24 h-auto animate-bounce-slow" />
            <p className="text-[10px] font-black text-[var(--color-fg-default)] uppercase tracking-[0.4em] ml-[0.4em]">
              {t.app.loading}{dots}
            </p>
          </div>
          <style>{`
            @keyframes float-geo { 0%, 100% { transform: translate(0, 0) rotate(45deg); } 50% { transform: translate(20px, -30px) rotate(60deg); } }
            @keyframes float-geo-delay { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-30px, 20px) rotate(-30deg); } }
            @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
            .animate-float-geo { animation: float-geo 12s ease-in-out infinite; }
            .animate-float-geo-delay { animation: float-geo-delay 15s ease-in-out infinite; }
            .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
          `}</style>
        </>
      );
    }

    if (currentStyle === "matrix") {
      return (
        <>
          <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-around z-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="text-[var(--color-accent-emphasis)] text-[8px] font-mono writing-mode-vertical animate-matrix-fall" style={{ animationDelay: `${i * 0.7}s` }}>
                {"HYTALE_LITTLEGODS_HYTALE_LITTLEGODS".split("").join("\n")}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-8 z-10">
            <div className="p-8 border border-[var(--color-accent-emphasis)]/20 bg-[var(--color-canvas-subtle)]/50 backdrop-blur-sm rounded-lg">
              <img src={logo} alt="Logo" className="w-20 h-auto grayscale brightness-200" />
            </div>
            <p className="text-[9px] font-mono text-[var(--color-accent-fg)] uppercase tracking-[0.2em] ml-[0.2em]">
              &gt; {t.app.loading.replace('...', '')}{dots}
            </p>
          </div>
          <style>{`
            @keyframes matrix-fall { 0% { transform: translateY(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(100vh); opacity: 0; } }
            .animate-matrix-fall { animation: matrix-fall 5s linear infinite; }
            .writing-mode-vertical { writing-mode: vertical-rl; text-orientation: upright; }
          `}</style>
        </>
      );
    }

    
    return (
      <>
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-accent-emphasis)]/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-accent-emphasis)]/5 rounded-full blur-[100px] animate-pulse delay-700" />
        </div>

        <div className="flex flex-col items-center gap-16 animate-fadeIn z-10">
          <div className="flex flex-col items-center gap-8">
            <div className="perspective-1000 animate-float">
              <img src={logo} alt="Logo" className="w-32 h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] [transform:rotateX(10deg)_rotateY(-10deg)] transition-transform duration-1000" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-black tracking-tighter text-white drop-shadow-md uppercase">Hytale Launcher</h1>
              <div className="h-1 w-12 bg-[var(--color-accent-emphasis)] rounded-full shadow-[0_0_15px_var(--color-accent-emphasis)]" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 w-64">
            <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--color-accent-emphasis)] to-transparent animate-shimmer" />
            </div>
            <p className="text-[10px] font-black text-[var(--color-fg-muted)] uppercase tracking-[0.4em] ml-[0.4em]">
              {t.app.loading}{dots}
            </p>
          </div>
        </div>
        <style>{`
          @keyframes float { 0%, 100% { transform: translateY(0) rotateX(10deg) rotateY(-10deg); } 50% { transform: translateY(-10px) rotateX(12deg) rotateY(-8deg); } }
          @keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(250%); } }
          .animate-float { animation: float 4s ease-in-out infinite; }
          .animate-shimmer { animation: shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        `}</style>
      </>
    );
  };

  return (
    <div className={commonBg}>
      {renderBackground()}
      {renderContent()}

      {}
      <div className="absolute bottom-12 flex flex-col items-center gap-4 opacity-40 z-10">
        <div className="text-[9px] font-black text-[var(--color-fg-muted)] tracking-[0.5em] uppercase">
          LittleGods Project &copy; 2026
        </div>
      </div>

      <style>{`
        @keyframes slow-zoom { 0% { transform: scale(1.05); } 100% { transform: scale(1.15); } }
        .animate-slow-zoom { animation: slow-zoom 20s ease-in-out infinite alternate; }
      `}</style>
    </div>
  );
};

export default Loader;
