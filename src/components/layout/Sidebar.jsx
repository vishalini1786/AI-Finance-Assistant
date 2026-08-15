import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  HeartPulse, 
  Bot, 
  CalendarDays 
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Budget', path: '/budget', icon: PieChart },
  { name: 'Financial Health', path: '/health', icon: HeartPulse },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { name: 'Calendar', path: '/calendar', icon: CalendarDays },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-finman-purpleDark text-white flex flex-col h-screen sticky top-0 border-r border-purple-900 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-purple-800/60">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          AI Finance Assistant
        </h1>
        <p className="text-xs text-purple-300 font-medium tracking-wide mt-0.5">
          Smart Personal Finance
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-finman-purple text-white shadow-sm font-semibold'
                    : 'text-purple-200 hover:bg-purple-800/40 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};