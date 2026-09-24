import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import dashboardService from '../services/dashboardService';
import { formatCurrency } from '../utils/formatCurrency';
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export const FinancialHealth = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    dashboardService.getSummary()
      .then((value) => mounted && setSummary(value))
      .catch(() => mounted && setError('Unable to load your financial health data.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const score = summary?.financialHealthScore;
  const budget = summary?.budget;
  const hasData = summary && (summary.totalIncome > 0 || summary.totalExpenses > 0 || summary.totalAssets > 0 || summary.totalLiabilities > 0);
  const metrics = summary ? [
    ['Savings rate', summary.totalIncome > 0 ? Math.max(0, Math.round((summary.totalSavings / summary.totalIncome) * 100)) : 0],
    ['Budget adherence', budget?.totalBudget > 0 ? Math.max(0, Math.round(100 - Math.min(budget.utilizationPercent, 100))) : 0],
    ['Debt position', summary.totalIncome > 0 ? Math.max(0, Math.round(100 - Math.min((summary.totalLiabilities / summary.totalIncome) * 100, 100))) : 0],
    ['Recorded assets', summary.totalAssets > 0 ? 100 : 0],
  ] : [];

  return <MainLayout>
    <PageHeader title="Financial Health Diagnostic" subtitle="Rule-based analysis calculated from your PostgreSQL records" />
    {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
    {loading ? <div className="py-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : !hasData ? <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-sm text-slate-500">Add income, expenses, holdings, or liabilities to calculate your financial health score.</div> : <>
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-8 rounded-2xl shadow-xl mb-8"><span className="text-xs font-bold uppercase tracking-widest text-blue-400">Overall Stability Score</span><div className="flex items-baseline gap-4 mt-2"><span className="text-6xl font-black">{score ?? '—'}</span><span className="text-2xl font-bold text-slate-400">/ 100</span></div><p className="text-xs text-slate-300 mt-3">Calculated from recorded savings, budget utilization, liabilities, and holdings. It is not an ML prediction.</p></div>
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm mb-8"><h2 className="text-base font-bold text-slate-800 mb-5">Recorded Metric Breakdown</h2><div className="space-y-5">{metrics.map(([label, value]) => <div key={label}><div className="flex justify-between text-xs font-bold mb-2"><span>{label}</span><span>{value} / 100</span></div><div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div className={`h-full rounded-full ${value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-finman-blue' : 'bg-amber-500'}`} style={{ width: `${value}%` }} /></div></div>)}</div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white border border-emerald-200 p-6 rounded-2xl"><h3 className="text-xs font-black text-emerald-950 uppercase flex items-center gap-2 mb-4"><CheckCircle2 className="w-5 h-5 text-emerald-600" />Recorded strengths</h3><p className="text-xs text-slate-600">Income: {formatCurrency(summary.totalIncome)} · Savings: {formatCurrency(summary.totalSavings)} · Assets: {formatCurrency(summary.totalAssets)}</p></div><div className="bg-white border border-amber-200 p-6 rounded-2xl"><h3 className="text-xs font-black text-amber-950 uppercase flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-amber-600" />Review areas</h3><p className="text-xs text-slate-600">Budget utilization: {budget?.utilizationPercent || 0}% · Liabilities: {formatCurrency(summary.totalLiabilities)}</p></div></div>
    </>}
  </MainLayout>;
};
