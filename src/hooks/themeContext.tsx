import React, { createContext, useContext, useEffect, useState } from "react";
import { PRESET_THEMES, getThemeById } from "../utils/themes";

export type Theme = string;
export type FontFamily = string;

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    font: FontFamily;
    setFont: (font: FontFamily) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        return (localStorage.getItem("theme") as Theme) || "github-dark";
    });

    const [font, setFont] = useState<FontFamily>(() => {
        return (localStorage.getItem("font") as FontFamily) || "Inter";
    });

    useEffect(() => {
        localStorage.setItem("theme", theme);

        const themeDef = getThemeById(theme);

        
        document.documentElement.setAttribute("data-color-mode", themeDef.type);
        document.documentElement.setAttribute("data-light-theme", "light");
        document.documentElement.setAttribute("data-dark-theme", "dark");

        
        Object.entries(themeDef.colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });

        
        document.documentElement.classList.remove("light", "dark", "theme-light", "theme-dark", "theme-dimmed");
        if (themeDef.type === "dark") {
            document.documentElement.classList.add("dark", "theme-dark");
        } else {
            document.documentElement.classList.add("light", "theme-light");
        }

    }, [theme]);

    useEffect(() => {
        localStorage.setItem("font", font);

        let fontValue = "'Inter', system-ui, sans-serif";

        if (font === "System") {
            fontValue = "system-ui, -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, sans-serif";
        } else if (font === "Mono") {
            fontValue = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
        } else {
            
            const linkId = "dynamic-font-loader";
            let link = document.getElementById(linkId) as HTMLLinkElement;
            if (!link) {
                link = document.createElement("link");
                link.id = linkId;
                link.rel = "stylesheet";
                document.head.appendChild(link);
            }

            if (font !== "Inter") {
                const fontUrl = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900&display=swap`;
                link.href = fontUrl;
            }
            fontValue = `'${font}', system-ui, sans-serif`;
        }

        document.documentElement.style.setProperty("--font-body", fontValue);
    }, [font]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeContextProvider");
    return context;
};
