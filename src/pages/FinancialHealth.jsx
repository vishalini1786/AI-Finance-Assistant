import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { userProfile, healthScoreBreakdown, healthTrendData } from '../data/mockData';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const FinancialHealth = () => {
  return (
    <MainLayout>
      <PageHeader
        title="Financial Health"
        subtitle="AI/ML-computed evaluation of overall financial stability"
        rightElement={
          <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
            Updated: {userProfile.lastUpdated}
          </span>
        }
      />

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Health Score</span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-5xl font-black text-finman-purple">{userProfile.healthScore}</span>
            <span className="text-xl font-bold text-slate-400">/ 100</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">Good Condition</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 max-w-md">
            Your financial health score is derived from your savings consistency, debt-to-income ratio, and budget adherence.
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-100 p-5 rounded-2xl max-w-sm">
          <div className="flex items-center gap-2 text-finman-purple font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4" /> AI Diagnostics
          </div>
          <p className="text-xs text-purple-900 leading-relaxed">
            Your score went from 78 to 82 this month due to improved savings rates and regular utility bill settlements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-6">Score Breakdown</h2>
          <div className="space-y-4">
            {healthScoreBreakdown.map((item) => (
              <div key={item.metric}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700">{item.metric}</span>
                  <span className="text-slate-900">{item.score} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-finman-purple h-2 rounded-full"
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4">6-Month Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#6D28D9" strokeWidth={3} dot={{ r: 5, fill: '#6D28D9' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50/60 border border-emerald-100 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths
          </h3>
          <ul className="text-xs text-emerald-900 space-y-2 font-medium">
            <li>✓ Strong savings rate sustained for 3 consecutive months</li>
            <li>✓ Consistent on-time debt and bill repayments</li>
            <li>✓ Stable primary income source</li>
          </ul>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Areas to Improve
          </h3>
          <ul className="text-xs text-amber-900 space-y-2 font-medium">
            <li>! Reduce dining-out and food delivery frequency</li>
            <li>! Increase emergency fund balance to 3 months of expenses</li>
            <li>! Audit unused digital subscriptions</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
};