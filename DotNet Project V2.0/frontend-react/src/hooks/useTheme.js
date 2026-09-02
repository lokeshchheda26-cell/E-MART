import { useThemeContext } from "../context/ThemeContext";

/**
 * Thin, conventionally-named wrapper around ThemeContext, so
 * components can `import { useTheme } from "../hooks/useTheme"`
 * instead of reaching into the context module directly.
 *
 * Returns { theme, isDark, toggleTheme }.
 */
export function useTheme() {
  return useThemeContext();
}
