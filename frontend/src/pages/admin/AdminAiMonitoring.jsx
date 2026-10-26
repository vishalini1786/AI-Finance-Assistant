import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import {
  Bot,
  CheckCircle,
  Zap,
  Info,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const AdminAiMonitoring = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkNotice, setCheckNotice] = useState(null);

  const fetchMonitoring = async (isCheck = false) => {
    if (isCheck) setChecking(true);
    else setLoading(true);
    try {
      const res = await adminService.getAiMonitoring(isCheck);
      setData(res);
      if (isCheck) {
        setCheckNotice({
          type: res?.healthy ? 'success' : 'warning',
          message: res?.healthy
            ? 'Live health check probe succeeded! Gemini Generative Language API is responding.'
            : (res?.healthDetails?.message || 'Health check probe finished.'),
        });
      }
    } catch (err) {
      if (isCheck) {
        setCheckNotice({
          type: 'error',
          message: err?.response?.data?.message || 'Failed to complete provider health check.',
        });
      }
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchMonitoring(false);
  }, []);

  const isConfigured = Boolean(data?.configured);
  const isHealthy = Boolean(data?.healthy);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">AI Service Monitoring</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Status of conversational AI models, API keys, and deterministic financial reasoning engines
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchMonitoring(true)}
            disabled={checking || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Testing Provider...' : 'Test Provider Connection'}</span>
          </button>
        </div>

        {checkNotice && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
              checkNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : checkNotice.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
            }`}
          >
            {checkNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span>{checkNotice.message}</span>
            </div>
            <button
              onClick={() => setCheckNotice(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status Card */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {data?.provider || 'Google Gemini AI Engine'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isConfigured && isHealthy
                            ? 'bg-emerald-500 animate-pulse'
                            : isConfigured && !isHealthy
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isConfigured && isHealthy
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isConfigured && !isHealthy
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {data?.statusLabel || (isConfigured ? 'Operational' : 'Missing Credentials (Unconfigured)')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Target Model
                  </span>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">
                    {data?.model || 'gemini-1.5-flash'}
                  </span>
                </div>
              </div>

              {/* Unconfigured Configuration Banner */}
              {!isConfigured && (
                <div className="mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
                  <div className="flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        GEMINI_API_KEY is not set on the server
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                        To enable generative conversational reasoning, set{' '}
                        <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-amber-900 dark:text-amber-100 font-bold">
                          GEMINI_API_KEY
                        </code>{' '}
                        in your <code className="font-mono font-bold">backend/.env</code> file (or environment variables on your Render deployment dashboard) and restart the server.
                      </p>
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Safe fallback active: FinMan is using deterministic SQL logic. All budgeting, spending analysis, transactions, and personalized insights remain 100% operational.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature List Card */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                Active Grounded AI Features
              </h3>
              <div className="space-y-3">
                {[
                  'Personalized Financial Insights (point-wise, calm, grounded in database records)',
                  'AI Chat Assistant (intent-aware budgeting, spending analysis, savings planning)',
                  'OCR Receipt & Financial Document Parsing with entity extraction',
                  'Deterministic Financial Health Score & Runway calculations',
                  'Smart Calendar bill scheduling & cash-flow warnings',
                  'Auditable Goal Contribution progress tracking',
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security and Grounding Note */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-finman-blue shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
                {data?.note ||
                  'FinMan enforces deterministic SQL totals and user isolation in all AI prompts, ensuring all figures match live database records.'}
              </p>
            </div>

            {/* Performance Indicators */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pipeline Indicators</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Probe Latency',
                    value: data?.healthDetails?.latencyMs
                      ? `${data.healthDetails.latencyMs}ms`
                      : isConfigured
                      ? 'Probe Ready'
                      : 'N/A (Deterministic)',
                    color: isConfigured
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400',
                  },
                  {
                    label: 'Model Core',
                    value: data?.model || 'gemini-1.5-flash',
                    color: 'text-violet-600 dark:text-violet-400',
                  },
                  {
                    label: 'Reasoning Mode',
                    value: isConfigured && isHealthy ? 'Gemini 1.5 + SQL Grounding' : 'Deterministic SQL Engine',
                    color: 'text-finman-blue dark:text-sky-400',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="text-center p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40 rounded-xl"
                  >
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-1">
                      {item.label}
                    </p>
                    <p className={`text-sm font-black ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAiMonitoring;
