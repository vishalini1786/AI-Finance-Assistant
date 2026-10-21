import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { ScrollText, User, TrendingDown, TrendingUp } from 'lucide-react';

const EVENT_CONFIG = {
  new_user: { icon: User,        color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'New User'   },
  expense:  { icon: TrendingDown, color: 'text-rose-400',    bg: 'bg-rose-400/10',    label: 'Expense'    },
  income:   { icon: TrendingUp,   color: 'text-blue-400',    bg: 'bg-blue-400/10',    label: 'Income'     },
};

export const AdminAuditLogs = () => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    let m = true;
    adminService.getAuditLogs(100)
      .then((d) => { if (m) { setData(d.activity || []); setLoading(false); } })
      .catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  const filtered = filter === 'all' ? data : data.filter((a) => a.event_type === filter);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-black text-white">Audit Logs</h2>
          <p className="text-sm text-slate-400 mt-1">Recent platform activity across all users</p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {['all', 'new_user', 'expense', 'income'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'All Events' : (EVENT_CONFIG[f]?.label || f)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white">
                {filtered.length} event{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="divide-y divide-slate-700/20">
              {filtered.length === 0 && (
                <p className="text-center py-10 text-slate-500 text-sm">No events found</p>
              )}
              {filtered.map((item, i) => {
                const cfg = EVENT_CONFIG[item.event_type] || { icon: ScrollText, color: 'text-slate-400', bg: 'bg-slate-700', label: item.event_type };
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-700/20 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">{item.actor}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-500">
                        {new Date(item.event_time).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {new Date(item.event_time).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
