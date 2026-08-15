import React from 'react';

export const PageHeader = ({ title, subtitle, rightElement }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {rightElement && <div className="flex items-center space-x-3">{rightElement}</div>}
    </div>
  );
};