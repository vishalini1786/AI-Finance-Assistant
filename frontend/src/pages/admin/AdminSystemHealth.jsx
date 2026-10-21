import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { Database, Cpu, MemoryStick, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const MetricBox = ({ label, value, unit = '' }) => (
  <div className="bg-slate-900/60 rounded-xl p-4 text-center">
    <p className="text-xs text-slate-500 mb-1">{label}</p>
    <p className="text-2xl font-black text-white">
      {value !== undefined ? `${value}${unit}` : '—'}
    </p>
  </div>
);

const TableRow = ({ table_name, row_count }) => {
  const count = parseInt(row_count, 10);
  const isNA  = isNaN(count);
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/30 last:border-0">
      <div className="flex items-center gap-2">
        {isNA
          ? <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        }
        <span className="text-xs font-mono text-slate-300">{table_name}</span>
      </div>
      <span className={`text-xs font-bold ${isNA ? 'text-amber-400' : 'text-white'}`}>
        {isNA ? 'N/A' : count.toLocaleString()} {!isNA && <span className="text-slate-500 font-normal">rows</span>}
      </span>
    </div>
  );
};

export const AdminSystemHealth = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
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

  useEffect(() => { fetchHealth(); }, []);

  const uptimeStr = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">System Health</h2>
            <p className="text-sm text-slate-400 mt-1">
              {lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-rose-900/30 border border-rose-700/50 rounded-xl p-4">
            <p className="text-rose-400 text-sm font-semibold">{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Server Metrics */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Server Runtime</h3>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Operational · {data.env}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox label="Uptime"       value={uptimeStr(data.uptime)} />
                <MetricBox label="Node Version" value={data.nodeVersion} />
                <MetricBox label="Heap Used"    value={data.memoryMB?.heapUsed}  unit=" MB" />
                <MetricBox label="RSS Memory"   value={data.memoryMB?.rss}       unit=" MB" />
              </div>
            </div>

            {/* Database Table Counts */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Database Table Counts</h3>
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
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
