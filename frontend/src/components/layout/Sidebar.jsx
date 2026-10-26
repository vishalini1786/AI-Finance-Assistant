import React, { useEffect } from 'react';
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
  ChevronRight,
  FolderKanban,
  LogOut,
  Shield,
  Wallet,
  X,
  CreditCard,
  Landmark,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const menuKeyMap = {
  '/dashboard': 'dashboard',
  '/income': 'income',
  '/expenses': 'expenses',
  '/bank-transactions': 'bankTransactions',
  '/budget': 'budget',
  '/health': 'health',
  '/projects': 'projects',
  '/ai-assistant': 'aiAssistant',
  '/calendar': 'calendar',
  '/savings-goals': 'savingsGoals',
  '/investments': 'investments',
  '/liabilities': 'liabilities',
  '/reports': 'reports',
};

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Income', path: '/income', icon: Wallet },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Bank Transactions', path: '/bank-transactions', icon: Landmark },
  { name: 'Budgets & Goals', path: '/budget', icon: PieChart },
  { name: 'Financial Health', path: '/health', icon: HeartPulse },
  { name: 'Project Workspaces', path: '/projects', icon: FolderKanban },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { name: 'Smart Calendar', path: '/calendar', icon: CalendarDays },
  { name: 'Savings & Goals', path: '/savings-goals', icon: PiggyBank },
  { name: 'Investments', path: '/investments', icon: TrendingUp },
  { name: 'Liabilities', path: '/liabilities', icon: CreditCard },
  { name: 'Reports', path: '/reports', icon: FileText },
];

export const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen = () => {},
}) => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { t } = useLanguage();
  const isAdmin = currentUser?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* Brand Header with Collapse Toggle */}
      <div className="p-4 h-16 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="overflow-hidden">
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              FinMan
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide truncate">
              AI Personal Finance Assistant
            </p>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <span className="text-base font-black text-finman-blue">FM</span>
          </div>
        )}

        {/* Desktop collapse button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 transition-opacity">
            Core Features
          </span>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;
          const label = t(menuKeyMap[item.path]) || item.name;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                } py-2.5 rounded-xl text-xs font-semibold transition-all group relative min-h-[40px] ${
                  isActive
                    ? 'bg-finman-blue text-white shadow-sm font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </div>
              {!isCollapsed && item.path === '/reports' && (
                <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold">
                  Live
                </span>
              )}

              {/* Tooltip on Hover when Collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                  {label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4 pt-3 border-t border-slate-800 space-y-1">
        {/* Admin Panel Link — only visible to admins */}
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={() => setIsMobileOpen(false)}
            title={isCollapsed ? 'Admin Panel' : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
              } py-2.5 rounded-xl text-xs font-semibold group relative min-h-[40px] ${
                isActive
                  ? 'bg-violet-600 text-white font-bold'
                  : 'text-violet-400 hover:bg-violet-900/30 hover:text-violet-300'
              }`
            }
          >
            <Shield className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Admin Panel</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                Admin Panel
              </div>
            )}
          </NavLink>
        )}
        <NavLink
          to="/profile"
          onClick={() => setIsMobileOpen(false)}
          title={isCollapsed ? t('profile') : undefined}
          className={({ isActive }) =>
            `flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
            } py-2.5 rounded-xl text-xs font-semibold min-h-[40px] ${
              isActive
                ? 'bg-finman-blue text-white font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{t('profile')}</span>}
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          title={isCollapsed ? t('logout') : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
          } py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-rose-950 hover:text-rose-200 transition-colors cursor-pointer min-h-[40px]`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex ${
          isCollapsed ? 'w-20' : 'w-64'
        } flex-col h-screen sticky top-0 border-r border-slate-800 select-none transition-all duration-300 ease-in-out shrink-0 z-30`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer (Overlay + Backdrop) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
