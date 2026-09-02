import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * ThemeContext.jsx
 * ------------------------------------------------------------------
 * App-wide light/dark theme state. The actual re-theming is pure CSS
 * (see src/styles/theme.css) - this context only owns the "which
 * theme is active" state and mirrors it onto the document so that
 * CSS can react to it:
 *
 *   - `data-theme="light"|"dark"` on <html> - the app's own CSS
 *     variables (index.css / theme-polish.css / component CSS) key
 *     off this attribute.
 *   - `data-bs-theme="light"|"dark"` on <html> - Bootstrap 5.3's
 *     native dark mode, so untouched Bootstrap primitives (modals,
 *     dropdowns, etc.) re-theme themselves for free.
 *
 * Persisted to localStorage so a refresh restores the last choice
 * instead of always starting light.
 * ------------------------------------------------------------------
 */

const ThemeContext = createContext(null);

const STORAGE_KEY = "emart_theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-bs-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = {
    theme,
    isDark: theme === "dark",
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
