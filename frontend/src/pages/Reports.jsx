import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import dashboardService from '../services/dashboardService';
import expenseService from '../services/expenseService';
import reportService from '../services/reportService';
import { formatCurrency } from '../utils/formatCurrency';
import { Loader2, AlertCircle, Download, Calendar, FileText } from 'lucide-react';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const Reports = () => {
  const [periodType, setPeriodType] = useState('Monthly'); // 'Daily', 'Monthly', 'Yearly', 'Custom'
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [data, setData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const queryParams = useMemo(() => {
    if (periodType === 'Monthly') {
      const start = new Date(selectedYear, selectedMonth - 1, 1);
      const end = new Date(selectedYear, selectedMonth, 0);
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { startDate: fmt(start), endDate: fmt(end) };
    } else if (periodType === 'Yearly') {
      return { startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-12-31` };
    } else if (periodType === 'Custom') {
      if (startDate && endDate) return { startDate, endDate };
      return {};
    }
    return {};
  }, [periodType, selectedMonth, selectedYear, startDate, endDate]);

  useEffect(() => {
    if (periodType === 'Daily') {
      setLoading(true);
      expenseService.getDailyReport(selectedDate)
        .then(d => { setDailyData(d); setData(null); })
        .catch(() => setError('Failed to load daily report.'))
        .finally(() => setLoading(false));
    } else {
      if (periodType === 'Custom' && (!startDate || !endDate)) {
        setData(null);
        return;
      }
      setLoading(true);
      Promise.all([
        dashboardService.getSummary(queryParams),
        dashboardService.getMonthlyTrends(queryParams),
        dashboardService.getCategoryExpenses(queryParams),
      ]).then(([summary, trends, categories]) => {
        setData({ summary, trends, categories });
        setDailyData(null);
      }).catch(() => setError('Unable to load reports.'))
        .finally(() => setLoading(false));
    }
  }, [periodType, queryParams, selectedDate]);

  const downloadPdf = () => {
    if (periodType === 'Daily') {
      reportService.downloadDailyPdf(selectedDate).catch(() => setError('Failed to generate daily PDF.'));
    } else {
      reportService.downloadPdf(queryParams).catch(() => setError('Failed to generate PDF.'));
    }
  };

  const periodLabel = () => {
    if (periodType === 'Daily') return selectedDate;
    if (periodType === 'Monthly') return `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    if (periodType === 'Yearly') return `Year ${selectedYear}`;
    return startDate && endDate ? `${startDate} — ${endDate}` : 'Custom';
  };

  return (
    <MainLayout>
      <PageHeader
        title="Financial Reports"
        subtitle="Summaries and trends calculated from PostgreSQL records"
        rightElement={
          <button
            onClick={downloadPdf}
            disabled={!data && !dailyData}
            className="flex items-center gap-2 px-4 py-2 bg-finman-blue text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-finman-blueDark transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Period Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-700 border-r border-slate-200 pr-4">
          <Calendar className="w-5 h-5 text-finman-blue" /> Report Period
        </div>
        <div className="flex items-center gap-2">
          {['Daily', 'Monthly', 'Yearly', 'Custom'].map(type => (
            <button
              key={type}
              onClick={() => { setPeriodType(type); setError(''); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${periodType === type ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-auto flex-wrap">
          {periodType === 'Daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              max={todayStr()}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-finman-blue"
            />
          )}
          {periodType === 'Monthly' && (
            <>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-finman-blue">
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-finman-blue">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          {periodType === 'Yearly' && (
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-finman-blue">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {periodType === 'Custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:border-finman-blue" />
              <span className="text-slate-400 text-xs">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:border-finman-blue" />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>
      ) : periodType === 'Daily' && dailyData ? (
        <DailyReportView data={dailyData} date={selectedDate} />
      ) : !data ? (
        <div className="py-24 text-center text-slate-400 text-sm font-semibold">Select a valid date range to view reports.</div>
      ) : (
        <PeriodReportView data={data} periodLabel={periodLabel()} />
      )}
    </MainLayout>
  );
};

function DailyReportView({ data, date }) {
  const { expenses = [], summary = {} } = data;
  const totalExpenses = Number(summary.total_expenses || 0);
  const txCount = Number(summary.transaction_count || 0);

  const byCat = {};
  expenses.forEach(e => {
    if (!byCat[e.category_name]) byCat[e.category_name] = 0;
    byCat[e.category_name] += Number(e.amount);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Spent</p>
          <strong className="text-2xl text-rose-600">{formatCurrency(totalExpenses)}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Transactions</p>
          <strong className="text-2xl text-slate-900">{txCount}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</p>
          <strong className="text-base text-slate-900">{date}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Spending by Category</h2>
          {Object.entries(byCat).length === 0 ? (
            <p className="text-sm text-slate-400 italic">No expenses recorded for this day.</p>
          ) : (
            Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const maxAmt = Math.max(...Object.values(byCat));
              const pct = maxAmt > 0 ? (amt / maxAmt) * 100 : 0;
              return (
                <div key={cat} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-slate-700">{cat}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(amt)}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-finman-blue rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-finman-blue" /> Transactions
          </h2>
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No transactions for this day.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {expenses.map(e => (
                <div key={e.expense_id} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{e.category_name}</p>
                    <p className="text-xs text-slate-500">{e.description || e.payment_mode || 'Manual'}</p>
                  </div>
                  <span className="font-black text-rose-600 text-sm">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PeriodReportView({ data, periodLabel }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {[
          ['Income', data.summary.totalIncome, false],
          ['Expenses', data.summary.totalExpenses, false],
          ['Net Cash Flow', data.summary.netCashFlow, false],
          ['Period Savings', data.summary.periodSavings, false],
          ['Deficit', data.summary.deficit, true],
        ].map(([label, value, isDeficit]) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <strong className={`text-xl ${isDeficit && value > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(value)}</strong>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Income vs Expenses</h2>
          {data.trends.length ? data.trends.map(item => (
            <div key={item.month} className="flex justify-between items-center border-b border-slate-100 py-3 text-sm">
              <span className="font-bold text-slate-700">{item.month}</span>
              <div className="flex gap-4">
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 rounded">+{formatCurrency(item.total_income)}</span>
                <span className="text-rose-600 font-bold bg-rose-50 px-2 rounded">-{formatCurrency(item.total_expenses)}</span>
              </div>
            </div>
          )) : <p className="text-sm font-medium text-slate-400 italic py-4">No monthly records in this period.</p>}
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Categories</h2>
          {data.categories.length ? data.categories.map(item => (
            <div key={item.category_name} className="flex justify-between items-center border-b border-slate-100 py-3 text-sm">
              <span className="font-bold text-slate-700">{item.category_name}</span>
              <strong className="text-slate-900">{formatCurrency(item.total_amount)}</strong>
            </div>
          )) : <p className="text-sm font-medium text-slate-400 italic py-4">No category records in this period.</p>}
        </div>
      </div>
    </div>
  );
}
