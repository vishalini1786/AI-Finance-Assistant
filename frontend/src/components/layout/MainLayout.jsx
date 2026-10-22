import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FloatingAIButton } from './FloatingAIButton';

export const MainLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans antialiased text-slate-900 dark:text-white transition-colors duration-200">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileDrawerOpen}
        setIsMobileOpen={setIsMobileDrawerOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Topbar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleMobileMenu={() => setIsMobileDrawerOpen((v) => !v)}
        />
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <FloatingAIButton />
    </div>
  );
};

export default MainLayout;