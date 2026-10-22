import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, UserCircle, Zap, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import { QuickExpenseModal } from '../common/QuickExpenseModal';

export const Topbar = ({ onToggleMobileMenu = () => {} }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    notificationService
      .getNotifications()
      .then((data) => {
        if (!mounted) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 transition-colors">
        {/* Left: Mobile hamburger menu & breadcrumb */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-finman-blue rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block">
            FinMan Financial Workspace
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick Expense button */}
          <button
            type="button"
            onClick={() => setQuickExpenseOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-finman-blue to-indigo-500 text-white text-xs font-bold rounded-xl hover:opacity-95 transition-opacity shadow-xs cursor-pointer"
            title="Quick Expense (1-2 min)"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden xs:inline sm:inline">Quick Expense</span>
          </button>

          {/* Notifications dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-finman-blue hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-12 z-50 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white">Notifications</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{unreadCount} unread</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No notifications yet.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {notifications.map((notification) => (
                      <button
                        key={notification.notification_id}
                        type="button"
                        onClick={async () => {
                          if (!notification.is_read) {
                            await notificationService.markRead(notification.notification_id);
                            setNotifications((items) =>
                              items.map((item) =>
                                item.notification_id === notification.notification_id
                                  ? { ...item, is_read: true }
                                  : item
                              )
                            );
                            setUnreadCount((count) => Math.max(0, count - 1));
                          }
                          const target = notification.link || (notification.notification_type === 'DAILY_REMINDER' ? '/expenses' : null);
                          if (target) {
                            setOpen(false);
                            navigate(target);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition cursor-pointer ${
                          notification.is_read
                            ? 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/70 border border-blue-200 dark:border-blue-900/60'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {notification.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {notification.message}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile link */}
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-finman-blue hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer max-w-[120px] sm:max-w-[180px]"
            aria-label="View user profile"
          >
            <UserCircle className="w-5 h-5 shrink-0 text-slate-500" />
            <span className="truncate hidden sm:inline">{currentUser?.name || 'Profile'}</span>
          </button>

          {/* Log out */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <QuickExpenseModal
        isOpen={quickExpenseOpen}
        onClose={() => setQuickExpenseOpen(false)}
        onSaved={() => {}}
      />
    </>
  );
};

export default Topbar;
