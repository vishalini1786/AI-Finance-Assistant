import React from 'react';

export const Input = ({ label, error, icon: Icon, className = '', ...props }) => {
  return (
    <div className="w-full text-xs">
      {label && <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>}
      <div className={`flex items-center px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 transition-colors ${
        error ? 'border-rose-400 focus-within:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus-within:border-sky-500'
      } ${className}`}>
        {Icon && <Icon className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />}
        <input className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400" {...props} />
      </div>
      {error && <p className="text-[11px] text-rose-500 font-semibold mt-1">{error}</p>}
    </div>
  );
};