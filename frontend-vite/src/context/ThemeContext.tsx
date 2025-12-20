import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';

interface ThemeContextValue {
  // Theme state
  themeMode: string;
  accentColor: string;

  // Theme operations
  setThemeMode: (mode: string) => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;

  // Theme utilities
  updateThemeClasses: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { cursorState, operations } = useAppStore();

  // Keep DOM theme in sync with cursorState
  useEffect(() => {
    if (!cursorState) return;

    const root = document.documentElement;
    const mode = cursorState.themeMode === 'light' ? 'light' : 'dark';

    // Drive CSS via data-theme
    root.setAttribute('data-theme', mode);

    // Also expose as body class for .light / .dark selectors
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(mode);

    // Accent color -> CSS vars so components/icons can consume
    const accent = cursorState.accentColor || '#7c3aed';
    root.style.setProperty('--brand-primary', accent);
    root.style.setProperty('--brand-secondary', accent);
  }, [cursorState?.themeMode, cursorState?.accentColor]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (cursorState?.themeMode === 'system') {
        const systemPrefersDark = mediaQuery.matches;
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(systemPrefersDark ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [cursorState?.themeMode]);

  const updateThemeClasses = () => {
    if (!cursorState) return;

    const root = document.documentElement;
    const mode = cursorState.themeMode === 'light' ? 'light' : 'dark';

    root.setAttribute('data-theme', mode);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(mode);

    const accent = cursorState.accentColor || '#7c3aed';
    root.style.setProperty('--brand-primary', accent);
    root.style.setProperty('--brand-secondary', accent);
  };

  const value: ThemeContextValue = {
    themeMode: cursorState?.themeMode || 'system',
    accentColor: cursorState?.accentColor || '#7c3aed',
    setThemeMode: operations.setThemeMode,
    setAccentColor: operations.setAccentColor,
    updateThemeClasses
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}