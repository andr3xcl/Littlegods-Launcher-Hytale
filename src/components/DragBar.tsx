import React from "react";

const DragBar: React.FC = () => {
  const handleMinimize = () => {
    window.ipcRenderer.send("minimize-window");
  };
  const handleClose = () => {
    window.ipcRenderer.send("close-window");
  };

  return (
    <div
      id="frame"
      className="w-full h-12 flex items-center justify-between select-none px-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        <span className="text-[10px] uppercase tracking-[0.4em] font-black text-gray-400">
          LittleGods Launcher
        </span>
      </div>

      <div className="flex items-center -mr-2">
        <button
          className="no-drag w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all focus:outline-none"
          onClick={handleMinimize}
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="no-drag w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all rounded-full focus:outline-none"
          onClick={handleClose}
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DragBar;
