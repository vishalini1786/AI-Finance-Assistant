import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Shield, Sun, Moon } from 'lucide-react';

export const AdminLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans antialiased text-slate-900 dark:text-white transition-colors duration-200">
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Admin Topbar */}
        <header className="h-14 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200 dark:border-violet-900/30 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Admin Control Panel
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-[11px]">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-violet-600" />
                  <span className="hidden sm:inline text-[11px]">Dark Mode</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                {currentUser?.name || 'Admin'} · Admin
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
