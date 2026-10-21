import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import {
  Users, TrendingUp, TrendingDown, FileText, Target,
  FolderKanban, Activity, Zap, ArrowUpRight,
} from 'lucide-react';

// ── Tiny stat card ────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color = 'violet', sub }) => {
  const colors = {
    violet: 'from-violet-600 to-purple-700',
    emerald: 'from-emerald-500 to-teal-600',
    blue:    'from-blue-500 to-indigo-600',
    rose:    'from-rose-500 to-pink-600',
    amber:   'from-amber-500 to-orange-600',
    cyan:    'from-cyan-500 to-sky-600',
  };

  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-colors">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shrink-0 shadow-md`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white">
          {value !== undefined && value !== null ? String(value) : '—'}
        </p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ── Simple bar chart using CSS ────────────────────────────────────
const MiniBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
        No growth data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => parseInt(d.new_users, 10) || 0), 1);

  return (
    <div className="h-44 flex flex-col justify-between pt-3 pb-1 w-full">
      {/* Chart grid and bars */}
      <div className="flex-1 flex items-end gap-1.5 sm:gap-2.5 w-full relative">
        {/* Subtle background guides */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full h-0" />
          <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full h-0" />
          <div className="border-b border-slate-200 dark:border-slate-700 w-full h-0" />
        </div>

        {data.map((d, i) => {
          const count = parseInt(d.new_users, 10) || 0;
          const pct = count > 0 ? Math.max(Math.round((count / max) * 100), 10) : 0;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer z-10"
            >
              {/* Optional count display on bar */}
              {count > 0 && (
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mb-1 leading-none transition-transform group-hover:scale-110">
                  {count}
                </span>
              )}

              {/* The bar itself */}
              <div className="w-full max-w-[28px] flex items-end justify-center">
                {count > 0 ? (
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-violet-600 via-purple-500 to-indigo-400 shadow-md shadow-violet-500/25 dark:shadow-violet-900/40 transition-all duration-300 group-hover:brightness-110"
                    style={{ height: `${pct}%`, minHeight: '12px' }}
                  />
                ) : (
                  <div
                    className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60 group-hover:bg-violet-300 dark:group-hover:bg-violet-700 transition-colors"
                    title={`${d.month}: 0 users`}
                  />
                )}
              </div>

              {/* Month label */}
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-2 truncate w-full text-center group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                {d.month_short || d.month?.split(' ')[0]}
              </span>

              {/* Hover Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-950 text-white border border-slate-700/80 text-[11px] px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                <span className="font-bold text-violet-300">{count}</span>
                <span className="text-slate-300">{count === 1 ? 'user' : 'users'}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{d.month}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Activity feed ─────────────────────────────────────────────────
const ActivityFeed = ({ activity }) => {
  const typeConfig = {
    new_user: { color: 'bg-emerald-500',  label: 'New User'  },
    expense:  { color: 'bg-rose-500',     label: 'Expense'   },
    income:   { color: 'bg-blue-500',     label: 'Income'    },
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
      {(!activity || activity.length === 0) && (
        <p className="text-xs text-slate-400 dark:text-slate-500">No recent activity.</p>
      )}
      {(activity || []).map((item, i) => {
        const cfg = typeConfig[item.event_type] || { color: 'bg-slate-500', label: item.event_type };
        return (
          <div key={i} className="flex items-start gap-3 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${cfg.color}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.actor}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.detail}</p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
              {new Date(item.event_time).toLocaleDateString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const AdminOverview = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let mounted = true;
    adminService.getOverview()
      .then((d) => { if (mounted) { setData(d); setLoading(false); } })
      .catch((e) => { if (mounted) { setError(e.response?.data?.message || e.message); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/50 rounded-xl p-6 text-center">
          <p className="text-rose-600 dark:text-rose-400 font-semibold text-sm">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  const s = data?.stats || {};

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Overview</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Platform-wide metrics and recent activity</p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"      value={s.total_users}           icon={Users}       color="violet" sub={`${s.new_users_7d || 0} new this week`} />
          <StatCard label="Onboarded"        value={s.onboarded_users}       icon={Activity}    color="emerald" />
          <StatCard label="Total Expenses"   value={s.total_expenses}        icon={TrendingDown} color="rose" sub={`${s.expenses_30d || 0} last 30d`} />
          <StatCard label="Total Incomes"    value={s.total_incomes}         icon={TrendingUp}   color="blue" sub={`${s.incomes_30d || 0} last 30d`} />
          <StatCard label="Documents"        value={s.total_documents}       icon={FileText}    color="amber" />
          <StatCard label="Projects"         value={s.total_projects}        icon={FolderKanban} color="cyan" />
          <StatCard label="Savings Goals"    value={s.total_goals}           icon={Target}      color="violet" />
          <StatCard label="Budget Plans"     value={s.total_budgets}         icon={Zap}         color="emerald" />
        </div>

        {/* Two column: chart + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">User Growth (12 months)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Monthly new registrations</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                <ArrowUpRight className="w-3 h-3" /> {s.new_users_7d || 0} this week
              </span>
            </div>
            <MiniBarChart data={data?.growth || []} />
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Recent Platform Activity</h3>
            <ActivityFeed activity={data?.activity} />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Platform Financial Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Income Recorded</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                ₹{parseFloat(s.total_income_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Expenses Recorded</p>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                ₹{parseFloat(s.total_expense_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Net Platform Balance</p>
              <p className={`text-lg font-black ${parseFloat(s.total_income_amount || 0) - parseFloat(s.total_expense_amount || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ₹{(parseFloat(s.total_income_amount || 0) - parseFloat(s.total_expense_amount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Admin Accounts</p>
              <p className="text-lg font-black text-violet-600 dark:text-violet-400">{s.total_admins || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
