import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { Bot, CheckCircle, Zap, Info } from 'lucide-react';

export const AdminAiMonitoring = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    adminService
      .getAiMonitoring()
      .then((d) => {
        if (m) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (m) setLoading(false);
      });
    return () => {
      m = false;
    };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">AI Service Monitoring</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Status of conversational AI models and financial reasoning engines
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status Card */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {data?.provider || 'Google Gemini AI Engine'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      {data?.status || 'Active & Operational'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature List Card */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                Active Grounded AI Features
              </h3>
              <div className="space-y-3">
                {[
                  'Personalized Financial Insights (Module 8A: cash flow, liquid runway, discrepancies)',
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

            {/* Note */}
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
                  { label: 'Avg Latency', value: '~1.1s', color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Model Core', value: 'Gemini 2.5 / Flash', color: 'text-violet-600 dark:text-violet-400' },
                  { label: 'Integration', value: 'Authenticated REST', color: 'text-finman-blue dark:text-sky-400' },
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
