import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | Theme;

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  preference: 'system',
  setPreference: () => {},
});

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialPreference(): ThemePreference {
  const saved = localStorage.getItem('mirrorz-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  const theme = preference === 'system' ? systemTheme : preference;

  // Listen for system theme changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (preference === 'system') {
      delete document.documentElement.dataset['theme'];
    } else {
      document.documentElement.dataset['theme'] = preference;
    }
  }, [preference, theme]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      if (p === 'system') localStorage.removeItem('mirrorz-theme');
      else localStorage.setItem('mirrorz-theme', p);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}