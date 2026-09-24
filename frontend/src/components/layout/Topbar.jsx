import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

export const Topbar = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    notificationService.getNotifications()
      .then((data) => {
        if (!mounted) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="text-xs font-semibold text-slate-400">Personal financial workspace</div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button type="button" onClick={() => setOpen((value) => !value)} className="relative p-2 text-slate-400 hover:text-finman-blue" aria-label="Notifications">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{unreadCount}</span>}
          </button>
          {open && <div className="absolute right-0 top-10 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3">
            <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-black text-slate-800">Notifications</h3><span className="text-[10px] text-slate-400">{unreadCount} unread</span></div>
            {notifications.length === 0 ? <p className="text-xs text-slate-400 py-4">No notifications yet.</p> : <div className="max-h-64 overflow-y-auto space-y-2">{notifications.map((notification) => <button key={notification.notification_id} type="button" onClick={async () => { if (!notification.is_read) { await notificationService.markRead(notification.notification_id); setNotifications((items) => items.map((item) => item.notification_id === notification.notification_id ? { ...item, is_read: true } : item)); setUnreadCount((count) => Math.max(0, count - 1)); } }} className={`w-full text-left p-2 rounded-lg ${notification.is_read ? 'bg-slate-50' : 'bg-blue-50'}`}><p className="text-xs font-bold text-slate-800">{notification.title}</p><p className="text-[11px] text-slate-500 mt-0.5">{notification.message}</p></button>)}</div>}
          </div>}
        </div>
        <button type="button" onClick={() => navigate('/profile')} className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-finman-blue">
          <UserCircle className="w-5 h-5" />
          <span>{currentUser?.name || 'Profile'}</span>
        </button>
        <button type="button" onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600" aria-label="Log out"><LogOut className="w-4 h-4" /></button>
      </div>
    </header>
  );
};
