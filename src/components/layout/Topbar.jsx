import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { userProfile } from '../../data/mockData';

export const Topbar = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5 w-80 focus-within:ring-2 focus-within:ring-finman-purple/30 focus-within:border-finman-purple transition-all">
        <Search className="w-4 h-4 text-slate-400 mr-2.5" />
        <input
          type="text"
          placeholder="Search records, categories..."
          className="bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 w-full"
        />
      </div>

      <div className="flex items-center space-x-5">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-finman-purple text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {userProfile.avatar}
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-bold text-slate-800 leading-none">{userProfile.name}</span>
            <span className="text-[10px] text-slate-400 font-medium">Personal Account</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
};