import React from 'react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  ...props 
}) => {
  const base = "inline-flex items-center justify-center font-bold transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/25 hover:shadow-lg hover:-translate-y-0.5",
    secondary: "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750",
    outline: "border-2 border-sky-500 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-xs sm:text-sm",
    lg: "px-7 py-3.5 text-sm sm:text-base"
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
};