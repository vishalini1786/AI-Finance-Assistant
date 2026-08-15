import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FloatingAIButton } from './FloatingAIButton';

export const MainLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <FloatingAIButton />
    </div>
  );
};