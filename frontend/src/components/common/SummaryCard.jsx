import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const SummaryCard = ({ 
  title, 
  amount, 
  indicator, 
  icon: Icon, 
  isCount = false, 
  type = "blue" 
}) => {
  const isPositive = indicator?.startsWith('+');
  const isNegative = indicator?.startsWith('-');

  // Theme palettes with mild pastel gradients, left accent borders, and glassmorphic badge styling
  const themes = {
    blue: {
      cardBg: 'bg-gradient-to-br from-blue-50/80 via-white to-slate-50/40',
      borderLeft: 'border-l-4 border-l-blue-600',
      borderBox: 'border-slate-200/80 hover:border-blue-300',
      iconBox: 'bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700',
      titleColor: 'text-blue-900/70',
      accentGlow: 'from-blue-400/10 to-indigo-500/5',
      badgeStyle: 'bg-blue-100/70 text-blue-700 border-blue-200/60',
    },
    income: {
      cardBg: 'bg-gradient-to-br from-emerald-50/80 via-white to-slate-50/40',
      borderLeft: 'border-l-4 border-l-emerald-500',
      borderBox: 'border-slate-200/80 hover:border-emerald-300',
      iconBox: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 group-hover:bg-emerald-700',
      titleColor: 'text-emerald-900/70',
      accentGlow: 'from-emerald-400/10 to-teal-500/5',
      badgeStyle: 'bg-emerald-100/70 text-emerald-700 border-emerald-200/60',
    },
    expense: {
      cardBg: 'bg-gradient-to-br from-rose-50/80 via-white to-slate-50/40',
      borderLeft: 'border-l-4 border-l-rose-500',
      borderBox: 'border-slate-200/80 hover:border-rose-300',
      iconBox: 'bg-rose-600 text-white shadow-md shadow-rose-500/20 group-hover:bg-rose-700',
      titleColor: 'text-rose-900/70',
      accentGlow: 'from-rose-400/10 to-pink-500/5',
      badgeStyle: 'bg-rose-100/70 text-rose-700 border-rose-200/60',
    },
    teal: {
      cardBg: 'bg-gradient-to-br from-teal-50/80 via-white to-slate-50/40',
      borderLeft: 'border-l-4 border-l-teal-500',
      borderBox: 'border-slate-200/80 hover:border-teal-300',
      iconBox: 'bg-teal-600 text-white shadow-md shadow-teal-500/20 group-hover:bg-teal-700',
      titleColor: 'text-teal-900/70',
      accentGlow: 'from-teal-400/10 to-cyan-500/5',
      badgeStyle: 'bg-teal-100/70 text-teal-700 border-teal-200/60',
    },
    orange: {
      cardBg: 'bg-gradient-to-br from-amber-50/80 via-white to-slate-50/40',
      borderLeft: 'border-l-4 border-l-amber-500',
      borderBox: 'border-slate-200/80 hover:border-amber-300',
      iconBox: 'bg-amber-600 text-white shadow-md shadow-amber-500/20 group-hover:bg-amber-700',
      titleColor: 'text-amber-900/70',
      accentGlow: 'from-amber-400/10 to-orange-500/5',
      badgeStyle: 'bg-amber-100/70 text-amber-700 border-amber-200/60',
    }
  };

  const theme = themes[type] || themes.blue;

  return (
    <div 
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl ${theme.cardBg} ${theme.borderLeft} ${theme.borderBox} cursor-pointer select-none`}
    >
      {/* Soft Ambient Radial Blur on Hover */}
      <div 
        className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${theme.accentGlow} rounded-full blur-xl transition-all duration-500 group-hover:scale-150 opacity-60 group-hover:opacity-100 pointer-events-none`}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <span className={`text-[11px] font-bold uppercase tracking-widest ${theme.titleColor} block mb-1 font-sans`}>
            {title}
          </span>
          <div className="mt-2 flex items-baseline">
            {!isCount && typeof amount === 'number' && (
              <span className="text-xl font-bold text-slate-500 mr-1 font-sans opacity-80">₹</span>
            )}
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-sans">
              {isCount 
                ? amount 
                : (typeof amount === 'number' ? amount.toLocaleString('en-IN') : amount)
              }
            </span>
          </div>
        </div>

        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0 ${theme.iconBox}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {indicator && (
        <div className="relative z-10 mt-4 flex items-center gap-2 pt-3 border-t border-slate-200/50">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            isPositive 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' 
              : isNegative 
              ? 'bg-rose-50 text-rose-700 border-rose-200/70' 
              : theme.badgeStyle
          }`}>
            {isPositive && <TrendingUp className="w-3 h-3 text-emerald-600" />}
            {isNegative && <TrendingDown className="w-3 h-3 text-rose-600" />}
            {!isPositive && !isNegative && <Minus className="w-3 h-3 text-slate-400" />}
            <span>{indicator}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wide">vs prev period</span>
        </div>
      )}
    </div>
  );
};