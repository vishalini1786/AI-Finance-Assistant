import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { Bot, CheckCircle, Zap, Info } from 'lucide-react';

export const AdminAiMonitoring = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    adminService.getAiMonitoring()
      .then((d) => { if (m) { setData(d); setLoading(false); } })
      .catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">AI Service Monitoring</h2>
          <p className="text-sm text-slate-400 mt-1">Overview of the AI assistant and Gemini service status</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{data?.provider || 'AI Provider'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-semibold text-emerald-400 capitalize">{data?.status || 'unknown'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Integrated AI Features</h3>
              <div className="space-y-3">
                {[
                  'AI Chat Assistant (Gemini-powered conversational finance advice)',
                  'Budget AI Engine — auto-generates budget recommendations',
                  'OCR document processing for financial receipts & bills',
                  'Financial Health Score computation & trend analysis',
                  'Smart Calendar event suggestions',
                  'Savings goal recommendations',
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                {data?.note || 'Detailed call-level AI usage metrics require a dedicated ai_call_log table. Extend the adminRepository to query it once implemented.'}
              </p>
            </div>

            {/* Performance Indicators (stub) */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Performance Indicators</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Avg Response', value: '~1.2s', color: 'text-emerald-400' },
                  { label: 'Model',        value: 'Gemini 1.5 Flash', color: 'text-violet-400' },
                  { label: 'Integration',  value: 'REST API', color: 'text-blue-400' },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 bg-slate-900/60 rounded-xl">
                    <p className="text-[10px] text-slate-500 mb-1">{item.label}</p>
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
