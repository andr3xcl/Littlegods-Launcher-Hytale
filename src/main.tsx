import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { GameContextProvider } from "./hooks/gameContext";
import { UserContextProvider } from "./hooks/userContext";
import { I18nProvider } from "./hooks/i18nContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GameContextProvider>
      <UserContextProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </UserContextProvider>
    </GameContextProvider>
  </React.StrictMode>
);
