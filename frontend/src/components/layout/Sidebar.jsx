import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  HeartPulse, 
  Bot, 
  CalendarDays,
  PiggyBank,
  TrendingUp,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Budget', path: '/budget', icon: PieChart },
  { name: 'Financial Health', path: '/health', icon: HeartPulse },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { name: 'Calendar', path: '/calendar', icon: CalendarDays },
];

const secondaryItems = [
  { name: 'Savings & Goals', path: '#', icon: PiggyBank },
  { name: 'Investments', path: '#', icon: TrendingUp },
  { name: 'Reports', path: '#', icon: FileText },
  { name: 'Settings', path: '#', icon: Settings },
];

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  return (
    <aside 
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-slate-900 text-white flex flex-col h-screen sticky top-0 border-r border-slate-800 select-none transition-all duration-300 ease-in-out shrink-0 z-30`}
    >
      {/* Brand Header with Collapse Toggle */}
      <div className="p-4 h-16 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="overflow-hidden">
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              FinMan
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide truncate">
              AI Finance Personal Assistant
            </p>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <span className="text-base font-black text-finman-blue">FM</span>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 transition-opacity">
            Core Features
          </span>
        )}
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'} py-2.5 rounded-lg text-xs font-semibold transition-all group relative ${
                  isActive
                    ? 'bg-finman-blue text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {/* Tooltip on Hover when Collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}

        {/* Secondary Navigation */}
        {!isCollapsed && (
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mt-6 mb-2 transition-opacity">
            Phase 2 Planned
          </span>
        )}

        {secondaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              title={isCollapsed ? `${item.name} (Soon)` : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'} py-2 rounded-lg text-xs font-medium text-slate-500 opacity-60 cursor-not-allowed group relative`}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Soon</span>
              )}

              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                  {item.name} (Soon)
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};