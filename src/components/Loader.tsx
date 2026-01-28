import React, { useEffect, useState } from "react";
import { useI18n } from "../hooks/i18nContext";
import logo from "../assets/logo.png";

const Loader: React.FC = () => {
  const { t } = useI18n();
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-[10000] overflow-hidden selection:bg-none">
      <div className="flex flex-col items-center gap-12 animate-fadeIn z-10">
        <div className="flex flex-col items-center gap-6">
          <img src={logo} alt="LittleGods Logo" className="w-32 h-auto drop-shadow-2xl mb-2" />
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="h-1 w-12 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mt-2">
            {t.app.loading}{dots}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Loader;
