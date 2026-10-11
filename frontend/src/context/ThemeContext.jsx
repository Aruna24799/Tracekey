import React, {
  createContext,
  useState,
  useEffect,
} from 'react';

export const ThemeContext =
  createContext();

export function ThemeProvider({
  children,
}) {
  const [theme, setThemeState] =
    useState(() => {
      try {
        return localStorage.getItem('tk_theme') || 'dark';
      } catch {
        return 'dark';
      }
    });

  useEffect(() => {
    try {
      localStorage.setItem('tk_theme', theme);
    } catch (e) {
      console.warn("Failed to save theme setting:", e.message);
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) =>
      prev === 'dark'
        ? 'light'
        : 'dark'
    );
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}