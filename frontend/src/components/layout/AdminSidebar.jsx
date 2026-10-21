import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Bot,
  ScrollText,
  Tags,
  ShieldAlert,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const adminNavItems = [
  { name: 'Overview',          path: '/admin',               icon: LayoutDashboard, exact: true },
  { name: 'User Management',   path: '/admin/users',         icon: Users },
  { name: 'System Health',     path: '/admin/health',        icon: Activity },
  { name: 'OCR & Documents',   path: '/admin/documents',     icon: FileText },
  { name: 'AI Monitoring',     path: '/admin/ai',            icon: Bot },
  { name: 'Audit Logs',        path: '/admin/audit-logs',    icon: ScrollText },
  { name: 'Global Categories', path: '/admin/categories',    icon: Tags },
];

const bottomItems = [
  { name: 'Admin Profile',     path: '/admin/profile',       icon: UserCircle },
];

export const AdminSidebar = ({ isCollapsed, setIsCollapsed }) => {
  const navigate  = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-slate-950 text-white flex flex-col h-screen sticky top-0 border-r border-violet-900/30 select-none transition-all duration-300 ease-in-out shrink-0 z-30`}
    >
      {/* Brand Header */}
      <div className="p-4 h-16 border-b border-violet-900/30 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-white leading-none">FinMan Admin</h1>
                <p className="text-[9px] text-violet-400 font-medium tracking-wider uppercase">Control Panel</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-1"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Admin Controls
          </span>
        )}

        {adminNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'} py-2.5 rounded-lg text-xs font-semibold transition-all group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </div>

              {/* Collapsed tooltip */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto px-3 pb-4 pt-3 border-t border-violet-900/30 space-y-1">
        {/* Back to user app */}
        {!isCollapsed && (
          <NavLink
            to="/dashboard"
            className="flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-semibold text-violet-400 hover:bg-violet-900/20 hover:text-violet-300 transition-all mb-1"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>← User Dashboard</span>
          </NavLink>
        )}

        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'} py-2.5 rounded-lg text-xs font-semibold ${isActive ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'} py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-rose-950 hover:text-rose-300 transition-all`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
