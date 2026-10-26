import React from 'react';

export const PageHeader = ({
  title,
  subtitle,
  description,
  rightElement,
  actions,
  children,
  icon: Icon,
}) => {
  const sub = subtitle || description;
  const right = rightElement || actions || children;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-finman-blue/10 dark:bg-finman-blue/20 text-finman-blue shrink-0">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          {sub && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
        </div>
      </div>
      {right && <div className="flex items-center space-x-3">{right}</div>}
    </div>
  );
};