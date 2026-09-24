import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle Light/Dark Theme"
      className="flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all hover:scale-105"
    >
      <span className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow text-amber-500' : 'text-slate-400'}`}>
        <Sun className="w-3.5 h-3.5" />
      </span>
      <span className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-slate-700 shadow text-sky-400' : 'text-slate-400'}`}>
        <Moon className="w-3.5 h-3.5" />
      </span>
    </button>
  );
};