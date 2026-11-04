import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('finman_theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('finman_theme', theme);
  }, [theme]);

  // Sync across tabs & storage changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'finman_theme' && e.newValue) {
        setTheme(e.newValue === 'dark' ? 'dark' : 'light');
      }
    };
    const handleCustom = (e) => {
      if (e.detail?.theme) {
        setTheme(e.detail.theme === 'dark' ? 'dark' : 'light');
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('finman_theme_changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('finman_theme_changed', handleCustom);
    };
  }, []);

  const setThemePreference = (nextTheme) => {
    const val = nextTheme === 'dark' ? 'dark' : 'light';
    setTheme(val);
    localStorage.setItem('finman_theme', val);
    const root = document.documentElement;
    if (val === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('finman_theme', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
