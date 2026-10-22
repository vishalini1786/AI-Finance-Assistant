import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { Database, Cpu, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const MetricBox = ({ label, value, unit = '' }) => (
  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40 rounded-xl p-4 text-center">
    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">{label}</p>
    <p className="text-2xl font-black text-slate-900 dark:text-white">
      {value !== undefined ? `${value}${unit}` : '—'}
    </p>
  </div>
);

const TableRow = ({ table_name, row_count }) => {
  const count = parseInt(row_count, 10);
  const isNA = isNaN(count);
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700/30 last:border-0 text-xs">
      <div className="flex items-center gap-2">
        {isNA ? (
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
        )}
        <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{table_name}</span>
      </div>
      <span className={`font-bold ${isNA ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
        {isNA ? 'N/A' : count.toLocaleString()}{' '}
        {!isNA && <span className="text-slate-400 dark:text-slate-500 font-normal">rows</span>}
      </span>
    </div>
  );
};

export const AdminSystemHealth = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const d = await adminService.getSystemHealth();
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const uptimeStr = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">System Health</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Loading status…'}
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Health</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4">
            <p className="text-rose-700 dark:text-rose-300 text-sm font-semibold">{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Server Metrics Card */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-5">
                <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Node.js Server Runtime</h3>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operational · {data.env}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox label="Uptime" value={uptimeStr(data.uptime)} />
                <MetricBox label="Node Version" value={data.nodeVersion} />
                <MetricBox label="Heap Memory" value={data.memoryMB?.heapUsed} unit=" MB" />
                <MetricBox label="RSS Memory" value={data.memoryMB?.rss} unit=" MB" />
              </div>
            </div>

            {/* Database Table Counts Card */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/40">
                <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Database Table Row Counts</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {(data.tableCounts || []).map((row) => (
                  <TableRow key={row.table_name} {...row} />
                ))}
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSystemHealth;
