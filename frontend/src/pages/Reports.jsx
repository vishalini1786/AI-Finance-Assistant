import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import dashboardService from '../services/dashboardService';
import reportService from '../services/reportService';
import { formatCurrency } from '../utils/formatCurrency';
import { Loader2, AlertCircle, Download } from 'lucide-react';

export const Reports = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      dashboardService.getSummary(),
      dashboardService.getMonthlyTrends(),
      dashboardService.getCategoryExpenses(),
    ]).then(([summary, trends, categories]) => {
      if (mounted) setData({ summary, trends, categories });
    }).catch(() => mounted && setError('Unable to load reports from your financial records.'));
    return () => { mounted = false; };
  }, []);

  if (!data) {
    return <MainLayout><PageHeader title="Financial Reports" subtitle="Summaries and trends calculated from PostgreSQL records" />{error ? <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle className="inline w-4 h-4 mr-2" />{error}</div> : <div className="py-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>}</MainLayout>;
  }

  const summaryCards = [
    ['Income', data.summary.totalIncome],
    ['Expenses', data.summary.totalExpenses],
    ['Net cash flow', data.summary.netCashFlow],
    ['Period savings', data.summary.periodSavings],
    ['Deficit', data.summary.deficit],
  ];

  return <MainLayout>
    <PageHeader title="Financial Reports" subtitle="Summaries and trends calculated from PostgreSQL records" rightElement={<button onClick={() => reportService.downloadPdf().catch(() => setError('Unable to generate the PDF report.'))} className="flex items-center gap-2 px-4 py-2 bg-finman-blue text-white rounded-lg text-xs font-bold"><Download className="w-4 h-4" /> Download PDF Report</button>} />
    {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle className="inline w-4 h-4 mr-2" />{error}</div>}
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">{summaryCards.map(([label, value]) => <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500">{label}</p><strong className={`text-xl ${label === 'Deficit' && value > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(value)}</strong></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200"><h2 className="font-bold mb-4">Monthly income vs expenses</h2>{data.trends.length ? data.trends.map((item) => <div key={item.month} className="flex justify-between border-b border-slate-100 py-2 text-xs"><span>{item.month}</span><span className="text-emerald-600">{formatCurrency(item.total_income)}</span><span className="text-rose-600">{formatCurrency(item.total_expenses)}</span></div>) : <p className="text-sm text-slate-400">No monthly records yet.</p>}</div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200"><h2 className="font-bold mb-4">Current-month categories</h2>{data.categories.length ? data.categories.map((item) => <div key={item.category_name} className="flex justify-between border-b border-slate-100 py-2 text-xs"><span>{item.category_name}</span><strong>{formatCurrency(item.total_amount)}</strong></div>) : <p className="text-sm text-slate-400">No category records yet.</p>}</div>
      </div>
    </div>
  </MainLayout>;
};
