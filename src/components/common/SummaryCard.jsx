import React from 'react';

export const SummaryCard = ({ title, amount, indicator, type = "neutral" }) => {
  const isPositive = indicator?.startsWith('+');
  const isNegative = indicator?.startsWith('-');

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className="text-2xl font-extrabold text-slate-900 mt-2">
          {typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : amount}
        </div>
      </div>
      {indicator && (
        <span className={`text-xs font-semibold mt-3 ${
          type === 'purple' ? 'text-finman-purple' :
          type === 'expense' ? 'text-rose-500' :
          type === 'income' ? 'text-emerald-600' :
          isPositive ? 'text-emerald-600' :
          isNegative ? 'text-rose-500' : 'text-slate-500'
        }`}>
          {indicator}
        </span>
      )}
    </div>
  );
};