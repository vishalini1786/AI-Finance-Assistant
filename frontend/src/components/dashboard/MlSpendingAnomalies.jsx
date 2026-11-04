import React, { useEffect, useState, useCallback } from 'react';
// Spending Anomaly Review component.
// Displays unusual category transactions flagged by statistical dispersion (Z-score and IQR)
// and handles dismissals with persistent storage in ai_insights.
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Loader2,
  HelpCircle,
  X,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const SESSION_KEY = 'finman_dismissed_anomalies';

export const MlSpendingAnomalies = () => {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScannedAt, setLastScannedAt] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const loadAnomalies = useCallback(async (isManualScan = false) => {
    try {
      if (isManualScan) {
        setScanning(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await dashboardService.getSpendingAnomalies();
      setAnomalies(Array.isArray(data) ? data : []);
      setLastScannedAt(new Date());
    } catch (err) {
      setError('Unable to analyze spending patterns at this time. Please check ML service connectivity.');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    loadAnomalies(false);
  }, [loadAnomalies]);

  const handleDismiss = async (txId) => {
    const updated = [...dismissedIds, txId];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      await dashboardService.dismissAnomaly(txId);
    } catch (e) {
      console.warn('Failed to persist anomaly dismissal to backend:', e);
    }
  };

  const activeAnomalies = anomalies.filter(
    (a) => !dismissedIds.includes(a.transaction_id || a.id)
  );

  if (loading && anomalies.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-sm animate-pulse mb-8">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-700/60 rounded mb-4" />
        <div className="h-24 bg-slate-100 dark:bg-slate-700/40 rounded-xl" />
      </div>
    );
  }

  // Active anomalies detected
  if (activeAnomalies.length > 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-7 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-sm hover:shadow-md transition-all duration-300 mb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Spending That Looks Higher Than Usual
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {activeAnomalies.length} {activeAnomalies.length === 1 ? 'Item Flagged' : 'Items Flagged'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                FinMan checks your spending patterns and highlights transactions that are unusually high compared with your normal spending.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadAnomalies(true)}
              disabled={scanning}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-finman-blue dark:hover:text-sky-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-finman-blue' : ''}`} />
              <span>{scanning ? 'Checking...' : 'Check My Spending'}</span>
            </button>
            <button
              onClick={() => navigate('/expenses')}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-finman-blue flex items-center gap-1 px-2.5 py-1.5"
            >
              View Ledger <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAnomalies.map((item) => {
            const txId = item.transaction_id || item.id;
            return (
              <div
                key={txId}
                className="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                        {item.category_name}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1.5 truncate">
                        {item.description}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {item.date ? formatDate(item.date) : 'Recent Transaction'}
                      </p>
                    </div>

                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-amber-100 dark:border-amber-900/30 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 mb-3">
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                      This transaction is considerably higher than your usual spending in this category.
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-400 font-medium">Expected spending:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.expected_range || 'Normal range'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-100/80 dark:border-amber-900/30">
                  <button
                    type="button"
                    onClick={() => navigate('/expenses')}
                    className="text-xs font-bold text-finman-blue dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    View in Ledger <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(txId)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Meaningful Empty State when no anomalies exist
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm hover:shadow-md transition-all duration-300 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Spending That Looks Higher Than Usual
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                0 Flags • All Normal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              No unusual spending detected. All your recent expenses align with your typical category spending patterns.
            </p>
            {lastScannedAt && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-medium">
                Last checked: {lastScannedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => loadAnomalies(true)}
            disabled={scanning}
            className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-finman-blue dark:hover:text-sky-400 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-finman-blue' : ''}`} />
            <span>{scanning ? 'Checking...' : 'Check My Spending'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="text-xs font-bold text-finman-blue hover:text-finman-blueDark dark:text-sky-400 flex items-center gap-1 px-3 py-2"
          >
            View Expenses <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

