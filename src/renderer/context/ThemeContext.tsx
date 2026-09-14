import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, AVAILABLE_THEMES, DEFAULT_THEME, getStoredTheme, saveTheme, applyTheme } from '../utils/themes';

interface ThemeContextType {
  currentTheme: Theme | null;
  setTheme: (theme: Theme | null) => void;
  availableThemes: typeof AVAILABLE_THEMES;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(() => getStoredTheme() ?? DEFAULT_THEME);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleSetTheme = (theme: Theme | null) => {
    setCurrentTheme(theme);
    saveTheme(theme || DEFAULT_THEME);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: handleSetTheme, availableThemes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
