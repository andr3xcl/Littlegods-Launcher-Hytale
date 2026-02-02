import ConfirmModal from "./components/ConfirmModal";
import { useUserContext } from "./hooks/userContext";
import { ThemeContextProvider } from "./hooks/themeContext";
import Launcher from "./components/Launcher";
import Login from "./components/Login";
import Loader from "./components/Loader";
import { useI18n } from "./hooks/i18nContext";
import { useState, useEffect } from "react";
import globalBg from "./assets/littlegods-login.jpeg";

export default function App() {
  const { t: trans } = useI18n();
  const t = trans.app;
  const { ready, currentProfile, selectProfile } = useUserContext();
  const [showLoader, setShowLoader] = useState(true);
  const [fade, setFade] = useState(false);
  const [showOfflinePrompt, setShowOfflinePrompt] = useState(false);
  const [showOnlinePrompt, setShowOnlinePrompt] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isOfflineMode) {
        setShowOnlinePrompt(true);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (!isOfflineMode) {
        setShowOfflinePrompt(true);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine && !isOfflineMode) {
      setShowOfflinePrompt(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOfflineMode]);

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
    <ThemeContextProvider>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
        }}
      
      >
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
                <Launcher onLogout={() => {
                  setIsOfflineMode(false);
                  selectProfile(null);
                }} isOffline={isOfflineMode} />
              ) : (
                <Login isOffline={isOfflineMode} />
              )
            ) : null)}

          <ConfirmModal
            open={showOfflinePrompt}
            title={t.offline_prompt_title}
            message={t.offline_prompt_msg}
            confirmText={t.offline_prompt_confirm}
            cancelText={t.offline_prompt_cancel}
            onConfirm={() => {
              setShowOfflinePrompt(false);
              setIsOfflineMode(true);
            }}
            onCancel={() => {
              setShowOfflinePrompt(false);
            }}
          />

          <ConfirmModal
            open={showOnlinePrompt}
            title={t.online_restore_title}
            message={t.online_restore_msg}
            confirmText={t.online_restore_confirm}
            cancelText={t.online_restore_cancel}
            onConfirm={() => {
              setShowOnlinePrompt(false);
              setIsOfflineMode(false);
              window.location.reload(); 
            }}
            onCancel={() => {
              setShowOnlinePrompt(false);
            }}
          />
        </div>
      </div>
    </ThemeContextProvider>
  );
}
