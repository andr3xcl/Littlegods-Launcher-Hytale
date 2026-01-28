import { useUserContext } from "./hooks/userContext";
import Launcher from "./components/Launcher";
import Login from "./components/Login";
import Loader from "./components/Loader";
import { useState, useEffect } from "react";
import globalBg from "./assets/littlegods-login.jpeg";

export default function App() {
  const { ready, currentProfile, selectProfile } = useUserContext();
  const [showLoader, setShowLoader] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let enableRPC = false;
    try {
      enableRPC = !!window.localStorage.getItem("enableRPC");
    } catch {
      enableRPC = false;
    }

    if (window.ipcRenderer) {
      window.ipcRenderer.send("ready", {
        enableRPC,
      });
    }

    if (ready) {
      setFade(true);
      const timeout = setTimeout(() => setShowLoader(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [ready]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
      className="bg-gray-950"
    >
      {}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: `url(${globalBg})` }}
      />
      {}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div
        className="w-full h-full min-h-screen flex flex-col relative z-10"
      >
        {showLoader && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10000,
              pointerEvents: "all",
              opacity: fade ? 0 : 1,
              transition: "opacity 1s",
            }}
          >
            <Loader />
          </div>
        )}
        {!showLoader &&
          (ready ? (
            currentProfile ? (
              <Launcher onLogout={() => selectProfile(null)} />
            ) : (
              <Login />
            )
          ) : null)}
      </div>
    </div>
  );
}
