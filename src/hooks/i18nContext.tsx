import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, TranslationKeys } from "../utils/i18n";

interface I18nContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<Language>("es");

    useEffect(() => {
        const saved = localStorage.getItem("lang") as Language;
        if (saved && (saved === "en" || saved === "es" || saved === "pt")) {
            setLangState(saved);
        } else {
            
            setLangState("es");
        }
    }, []);

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem("lang", newLang);
    };

    const t = translations[lang];

    return (
        <I18nContext.Provider value={{ lang, setLang, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
};
