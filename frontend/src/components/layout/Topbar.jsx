import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Plus, 
  Receipt, 
  PieChart, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Settings, 
  LogOut,
  X,
  CreditCard
} from 'lucide-react';
import { userProfile, initialExpenses } from '../../data/mockData';

export const Topbar = () => {
  const navigate = useNavigate();

  // State controls for interactive dropdowns
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  // Mock Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Budget Alert',
      message: 'Shopping budget has exceeded 90% utilization.',
      time: '10 mins ago',
      type: 'warning',
      unread: true,
      link: '/budget'
    },
    {
      id: 2,
      title: 'Bill Reminder',
      message: 'Electricity bill payment of ₹1,500 due on Aug 18.',
      time: '2 hours ago',
      type: 'bill',
      unread: true,
      link: '/calendar'
    },
    {
      id: 3,
      title: 'AI Insight Ready',
      message: 'Your monthly savings forecast improved by 5.6%.',
      time: '1 day ago',
      type: 'ai',
      unread: false,
      link: '/ai-assistant'
    },
    {
      id: 4,
      title: 'Income Credited',
      message: 'Monthly salary of ₹65,000 received successfully.',
      time: 'Yesterday',
      type: 'income',
      unread: false,
      link: '/expenses'
    }
  ]);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const quickActionRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
      if (quickActionRef.current && !quickActionRef.current.contains(e.target)) setIsQuickActionOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items based on search input
  const searchResults = initialExpenses.filter(item => 
    item.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
      
      {/* 1. INTERACTIVE GLOBAL SEARCH */}
      <div className="relative w-80 md:w-96" ref={searchRef}>
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 focus-within:ring-2 focus-within:ring-finman-blue/20 focus-within:border-finman-blue focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(e.target.value.length > 0);
            }}
            onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
            placeholder="Search records, categories, merchants..."
            className="bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 w-full font-medium"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}>
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && (
          <div className="absolute left-0 right-0 top-12 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Transactions Matching "{searchQuery}"
            </div>
            {searchResults.length > 0 ? (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      navigate('/expenses');
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.merchant}</p>
                      <p className="text-[10px] text-slate-400">{item.category} • {item.date}</p>
                    </div>
                    <span className={`text-xs font-bold ${item.isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.isIncome ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                No transactions found for "{searchQuery}"
              </div>
            )}
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
              <button 
                onClick={() => { navigate('/expenses'); setIsSearchOpen(false); }}
                className="text-[11px] font-bold text-finman-blue hover:underline"
              >
                Go to Expense Ledger →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDE CONTROLS */}
      <div className="flex items-center space-x-4">

        {/* 2. QUICK ACTION BUTTON */}
        <div className="relative" ref={quickActionRef}>
          <button
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-finman-blue rounded-lg text-xs font-bold transition-all border border-blue-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quick Action</span>
          </button>

          {isQuickActionOpen && (
            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <button
                onClick={() => { navigate('/expenses'); setIsQuickActionOpen(false); }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Receipt className="w-4 h-4 text-finman-blue" />
                <span>Log New Expense</span>
              </button>
              <button
                onClick={() => { navigate('/budget'); setIsQuickActionOpen(false); }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <PieChart className="w-4 h-4 text-amber-500" />
                <span>Set Category Budget</span>
              </button>
              <button
                onClick={() => { navigate('/ai-assistant'); setIsQuickActionOpen(false); }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Ask FinMan AI</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. INTERACTIVE NOTIFICATIONS DROPDOWN */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-rose-100 text-rose-600 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-finman-blue hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { navigate(n.link); setIsNotificationsOpen(false); }}
                    className={`p-3.5 hover:bg-slate-50 cursor-pointer flex items-start gap-3 transition-colors ${
                      n.unread ? 'bg-blue-50/30' : 'bg-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                      n.type === 'bill' ? 'bg-rose-100 text-rose-600' :
                      n.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {n.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                       n.type === 'bill' ? <Clock className="w-3.5 h-3.5" /> :
                       n.type === 'income' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 text-center border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={() => { navigate('/calendar'); setIsNotificationsOpen(false); }}
                  className="text-[11px] font-bold text-slate-600 hover:text-finman-blue"
                >
                  View Financial Calendar & Alerts →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. INTERACTIVE PROFILE & USER MENU */}
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-3 pl-3 border-l border-slate-200 cursor-pointer select-none py-1 hover:opacity-85 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-finman-blue text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {userProfile.avatar}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-xs font-bold text-slate-800 leading-none">{userProfile.name}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Premium Account</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{userProfile.name}</p>
                <p className="text-[11px] text-slate-400">vishalini@example.com</p>
                <div className="mt-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">Health Score</span>
                  <span className="text-xs font-bold text-finman-blue">{userProfile.healthScore} / 100</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { navigate('/health'); setIsProfileOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Financial Profile</span>
                </button>
                <button
                  onClick={() => { navigate('/dashboard'); setIsProfileOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Connected Accounts</span>
                </button>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>App Preferences</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Log Out (Demo)</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};