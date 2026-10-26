import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import reportService from '../services/reportService';
import { formatCurrency } from '../utils/formatCurrency';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  FileText,
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CreditCard,
  Wallet,
  Info,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i);

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#64748B'
];

export const Reports = () => {
  const today = new Date();
  const [periodPreset, setPeriodPreset] = useState('this_month'); // 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'ytd' | 'previous_year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDrilldownCategory, setActiveDrilldownCategory] = useState(null);
  const [chartView, setChartView] = useState('bar'); // 'bar' | 'pie'

  // Build query params based on selected preset
  const queryParams = useMemo(() => {
    if (periodPreset === 'custom') {
      if (startDate && endDate) {
        return { period: 'custom', startDate, endDate };
      }
      return { period: 'custom' };
    }
    if (periodPreset === 'selected_month') {
      return { period: 'selected_month', month: selectedMonth, year: selectedYear };
    }
    return {
      period: periodPreset,
      month: selectedMonth,
      year: selectedYear,
    };
  }, [periodPreset, selectedMonth, selectedYear, startDate, endDate]);

  const loadReport = () => {
    if (periodPreset === 'custom' && (!startDate || !endDate)) {
      setReport(null);
      setLoading(false);
      return;
    }
    if (periodPreset === 'custom' && startDate > endDate) {
      setError('Start date cannot be after end date.');
      setReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    reportService.getComprehensiveReport(queryParams)
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load financial report.');
        setReport(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, [queryParams]);

  const handleDownloadPdf = () => {
    reportService.downloadPdf(queryParams).catch(() => {
      setError('Failed to generate and download PDF report.');
    });
  };

  const summary = report?.summary || {};
  const mom = report?.momComparison || {};
  const yoy = report?.yoyComparison || {};
  const categoryExpenses = report?.categoryExpenses || [];
  const monthlyTrends = report?.monthlyTrends || [];
  const assets = report?.assets || { total: 0, byCategory: [], items: [] };
  const liabilities = report?.liabilities || { total: 0, byCategory: [], items: [] };
  const observations = report?.observations || [];

  // Recharts Trends dataset
  const trendsChartData = useMemo(() => {
    return monthlyTrends.map((t) => ({
      month: t.month,
      Income: Number(t.total_income || 0),
      Expenses: Number(t.total_expenses || 0),
      NetSavings: Math.max(0, Number(t.total_income || 0) - Number(t.total_expenses || 0)),
    }));
  }, [monthlyTrends]);

  // Assets vs Liabilities Comparison data
  const positionChartData = useMemo(() => {
    return [
      { name: 'Total Assets', amount: summary.totalAssets || 0, fill: '#0EA5E9' },
      { name: 'Total Liabilities', amount: summary.totalLiabilities || 0, fill: '#F43F5E' },
      { name: 'Net Worth', amount: summary.netWorth || 0, fill: summary.netWorth >= 0 ? '#10B981' : '#E11D48' },
    ];
  }, [summary]);

  // Savings & Cash Flow comparison dataset
  const cashFlowChartData = useMemo(() => {
    return [
      { name: 'Net Cash Flow', amount: summary.netCashFlow || 0, fill: summary.netCashFlow >= 0 ? '#10B981' : '#F43F5E' },
      { name: 'Period Savings', amount: summary.periodSavings || 0, fill: '#3B82F6' },
      { name: 'Loan Repayments', amount: summary.loanRepayments || 0, fill: '#8B5CF6' },
    ];
  }, [summary]);

  return (
    <MainLayout>
      <PageHeader
        title="Financial Reports & Analytics"
        subtitle="Audited financial statements, position tracking, and historical comparisons"
        rightElement={
          <button
            onClick={handleDownloadPdf}
            disabled={loading || !report}
            className="flex items-center gap-2 px-4 py-2 bg-finman-blue text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-finman-blueDark transition-all shadow-sm hover:shadow"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Period Filter Ribbon */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-finman-blue flex-shrink-0" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reporting Period:
            </span>
            <span className="font-extrabold text-sm text-slate-800 dark:text-white">
              {report?.periodLabel || 'Select Period'}
            </span>
          </div>

          {/* Quick Period Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Previous Month' },
              { id: 'last_3_months', label: 'Last 3M' },
              { id: 'last_6_months', label: 'Last 6M' },
              { id: 'ytd', label: 'YTD' },
              { id: 'previous_year', label: 'Last Year' },
              { id: 'selected_month', label: 'Pick Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriodPreset(p.id);
                  setError('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  periodPreset === p.id
                    ? 'bg-slate-900 text-white dark:bg-finman-blue dark:text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Extended controls for 'selected_month' and 'custom' */}
        {(periodPreset === 'selected_month' || periodPreset === 'custom') && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
            {periodPreset === 'selected_month' && (
              <>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}

            {periodPreset === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="animate-spin w-8 h-8 text-finman-blue" />
          <p className="text-sm font-semibold">Generating financial reports & comparisons...</p>
        </div>
      ) : !report ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">No Records Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No transactions or asset valuations were recorded for {report?.periodLabel || 'this period'}. Select another date range or record income and expenses to view reports.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* FinMan Reports Advisor */}
          <PersonalizedInsights
            pageContext="REPORTS"
            title="FinMan Reports Advisor"
            subtitle="Period-specific financial observations, spending shifts, and balance sheet insights"
            className="mb-2"
          />

          {/* MODULE 1.2: FINANCIAL SUMMARY CARDS */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Period Financial Position
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Income */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Income</p>
                    <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                  <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(summary.totalIncome)}
                  </strong>
                </div>
                <ComparisonBadge delta={mom.income} />
              </div>

              {/* Total Expenses */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</p>
                    <span className="p-1.5 bg-rose-50 dark:bg-rose-950/50 rounded-lg text-rose-600">
                      <ArrowDownRight className="w-4 h-4" />
                    </span>
                  </div>
                  <strong className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(summary.totalExpenses)}
                  </strong>
                </div>
                <ComparisonBadge delta={mom.expenses} invertColors />
              </div>

              {/* Net Cash Flow */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Cash Flow</p>
                    <span className={`p-1.5 rounded-lg ${summary.netCashFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'}`}>
                      <Wallet className="w-4 h-4" />
                    </span>
                  </div>
                  <strong className={`text-xl font-black ${summary.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(summary.netCashFlow)}
                  </strong>
                </div>
                <ComparisonBadge delta={mom.netCashFlow} />
              </div>

              {/* Period Savings */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Period Savings</p>
                    <span className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  </div>
                  <strong className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {formatCurrency(summary.periodSavings)}
                  </strong>
                </div>
                <ComparisonBadge delta={mom.savings} />
              </div>

              {/* Total Assets */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Assets</p>
                  <strong className="text-xl font-black text-sky-600 dark:text-sky-400">
                    {formatCurrency(summary.totalAssets)}
                  </strong>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">{assets.items.length} active holdings</span>
              </div>

              {/* Total Liabilities */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Liabilities</p>
                  <strong className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {formatCurrency(summary.totalLiabilities)}
                  </strong>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">{liabilities.items.length} debt accounts</span>
              </div>

              {/* Net Worth */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-sky-50/50 dark:from-slate-800 dark:to-slate-900">
                <div>
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">Net Worth</p>
                  <strong className={`text-xl font-black ${summary.netWorth >= 0 ? 'text-indigo-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(summary.netWorth)}
                  </strong>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Assets minus Liabilities</span>
              </div>

              {/* Loan Repayments */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Loan Repayments</p>
                  <strong className="text-xl font-black text-slate-800 dark:text-white">
                    {formatCurrency(summary.loanRepayments)}
                  </strong>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Paid in period</span>
              </div>
            </div>
          </div>

          {/* MODULE 3: AUTOMATED FINANCIAL OBSERVATIONS */}
          {observations.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-finman-blue" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Automated Financial Observations ({report.periodLabel})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 text-xs flex items-start gap-2.5"
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      obs.type === 'POSITIVE' ? 'bg-emerald-500' :
                      obs.type === 'WARNING' ? 'bg-rose-500' : 'bg-finman-blue'
                    }`} />
                    <div>
                      <strong className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                        {obs.title}
                      </strong>
                      <span className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {obs.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODULE 2: INTERACTIVE CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2.1 Monthly Income vs Expenses (Grouped Bar Chart) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-finman-blue" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Income vs. Expenses Trend
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">Monthly Aggregates</span>
                </div>
                {trendsChartData.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400">No monthly activity recorded.</div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendsChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#fff' }}
                          formatter={(value) => [formatCurrency(value), '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* 2.2 Expense Category Analysis (Horizontal Bar Chart with Drilldown) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-finman-blue" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Spending Category Breakdown
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button
                      onClick={() => setChartView('bar')}
                      className={`px-2 py-0.5 text-xs font-bold rounded ${chartView === 'bar' ? 'bg-white dark:bg-slate-800 shadow-xs text-finman-blue' : 'text-slate-500'}`}
                    >
                      Bars
                    </button>
                    <button
                      onClick={() => setChartView('pie')}
                      className={`px-2 py-0.5 text-xs font-bold rounded ${chartView === 'pie' ? 'bg-white dark:bg-slate-800 shadow-xs text-finman-blue' : 'text-slate-500'}`}
                    >
                      Donut
                    </button>
                  </div>
                </div>

                {categoryExpenses.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400">No categorized expenses in this period.</div>
                ) : chartView === 'pie' ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryExpenses}
                          dataKey="total_amount"
                          nameKey="category_name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {categoryExpenses.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#fff' }}
                          formatter={(value, name) => [formatCurrency(value), name]}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {categoryExpenses.map((cat, idx) => (
                      <div
                        key={cat.category_name}
                        onClick={() => setActiveDrilldownCategory(cat)}
                        className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer group"
                      >
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-finman-blue flex items-center gap-1">
                            {cat.category_name}
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {formatCurrency(cat.total_amount)}
                            <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                              ({cat.percentage}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2.3 Savings vs Cash Flow (Bar Chart) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-finman-blue" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Savings & Cash Flow Dynamics
                    </h3>
                  </div>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowChartData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#fff' }}
                        formatter={(val) => [formatCurrency(val), 'Amount']}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {cashFlowChartData.map((entry, index) => (
                          <Cell key={`cf-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-finman-blue flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Definition:</strong> <em>Net Cash Flow</em> is Income minus total recognized expenses. <em>Period Savings</em> represents explicit goal contributions or unspent surplus retained in this period.
                  </span>
                </div>
              </div>
            </div>

            {/* 2.4 Assets vs Liabilities vs Net Worth */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-finman-blue" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Balance Sheet Position
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">Assets vs. Debts</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={positionChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#fff' }}
                        formatter={(val) => [formatCurrency(val), 'Value']}
                      />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {positionChartData.map((entry, index) => (
                          <Cell key={`pos-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Recorded Net Worth = {formatCurrency(summary.totalAssets)} (Assets) - {formatCurrency(summary.totalLiabilities)} (Liabilities) = <strong>{formatCurrency(summary.netWorth)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* MODULE 1.3 & 1.4: PERIOD COMPARISONS TABLE */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-finman-blue" /> Period-Over-Period Comparison
              </h3>
              <span className="text-xs text-slate-400 font-semibold">{mom.periodLabel || 'MoM'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Selected Period</th>
                    <th className="py-2.5 px-3">Previous Period</th>
                    <th className="py-2.5 px-3">Absolute Delta</th>
                    <th className="py-2.5 px-3">Percentage Shift</th>
                    <th className="py-2.5 px-3">Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                  <ComparisonRow title="Total Income" delta={mom.income} />
                  <ComparisonRow title="Total Expenses" delta={mom.expenses} invertColors />
                  <ComparisonRow title="Net Cash Flow" delta={mom.netCashFlow} />
                  <ComparisonRow title="Period Savings" delta={mom.savings} />
                  <ComparisonRow title="Assets" delta={mom.assets} />
                  <ComparisonRow title="Liabilities" delta={mom.liabilities} invertColors />
                  <ComparisonRow title="Net Worth" delta={mom.netWorth} />
                </tbody>
              </table>
            </div>
          </div>

          {/* MODULE 2.5: LIABILITIES & DEBT REPAYMENTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Liabilities */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-rose-500" /> Active Liabilities & Loans
                </h3>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Total: {formatCurrency(liabilities.total)}
                </span>
              </div>

              {liabilities.items.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No active liabilities or loans recorded.</div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {liabilities.items.map((item) => (
                    <div
                      key={item.liability_id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs"
                    >
                      <div>
                        <strong className="text-slate-800 dark:text-white font-bold block">{item.name}</strong>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.liability_type || 'Loan'} • {item.interest_rate ? `${item.interest_rate}% p.a.` : '0%'}
                          {item.due_date ? ` • Due: ${item.due_date}` : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-rose-600 dark:text-rose-400 font-extrabold block">
                          {formatCurrency(item.remaining_amount)}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          of {formatCurrency(item.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assets & Investments */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-500" /> Assets & Holdings Breakdown
                </h3>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  Total: {formatCurrency(assets.total)}
                </span>
              </div>

              {assets.items.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No investment holdings or assets recorded.</div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {assets.items.map((item) => (
                    <div
                      key={item.holding_id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs"
                    >
                      <div>
                        <strong className="text-slate-800 dark:text-white font-bold block">{item.name}</strong>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {(item.holding_type || 'Asset').replace('_', ' ')}
                          {item.purchase_date ? ` • Acquired: ${item.purchase_date}` : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-slate-900 dark:text-white font-extrabold block">
                          {formatCurrency(item.current_value)}
                        </strong>
                        {item.purchase_value && (
                          <span className="text-[10px] text-slate-400">
                            Cost: {formatCurrency(item.purchase_value)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Category Modal */}
      {activeDrilldownCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeDrilldownCategory.category_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Category details for {report?.periodLabel}
                </p>
              </div>
              <button
                onClick={() => setActiveDrilldownCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Category Spending</span>
                <strong className="text-base font-bold text-slate-900 dark:text-white">
                  {formatCurrency(activeDrilldownCategory.total_amount)}
                </strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Percentage of Total Expenses</span>
                <strong className="text-base font-bold text-finman-blue">
                  {activeDrilldownCategory.percentage}%
                </strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Transactions</span>
                <strong className="text-base font-bold text-slate-900 dark:text-white">
                  {activeDrilldownCategory.transaction_count}
                </strong>
              </div>
            </div>

            <button
              onClick={() => setActiveDrilldownCategory(null)}
              className="mt-6 w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition-colors"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

function ComparisonBadge({ delta, invertColors = false }) {
  if (!delta || !delta.hasPriorData) {
    return <span className="text-[10px] text-slate-400 mt-2 block font-medium">Insufficient prior data</span>;
  }

  const { absoluteChange, percentageChange, status } = delta;
  const isUp = absoluteChange > 0;
  const isDown = absoluteChange < 0;

  // For expenses & debts, "Up" is warning/negative and "Down" is positive
  const isPositive = invertColors ? isDown : isUp;
  const isNegative = invertColors ? isUp : isDown;

  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
    : isNegative
    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
    : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700';

  const icon = isUp ? (
    <TrendingUp className="w-3 h-3 inline mr-1" />
  ) : isDown ? (
    <TrendingDown className="w-3 h-3 inline mr-1" />
  ) : (
    <Minus className="w-3 h-3 inline mr-1" />
  );

  const pctLabel = percentageChange != null ? `${percentageChange > 0 ? '+' : ''}${percentageChange}%` : 'From zero';

  return (
    <div className="mt-2 flex items-center justify-between">
      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${colorClass}`}>
        {icon}
        {status} ({pctLabel})
      </span>
    </div>
  );
}

function ComparisonRow({ title, delta, invertColors = false }) {
  if (!delta) return null;
  const { current, previous, absoluteChange, percentageChange, status, hasPriorData } = delta;

  const isUp = absoluteChange > 0;
  const isDown = absoluteChange < 0;
  const isPositive = invertColors ? isDown : isUp;
  const isNegative = invertColors ? isUp : isDown;

  const badgeColor = isPositive
    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
    : isNegative
    ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
    : 'text-slate-500 bg-slate-100 dark:bg-slate-700';

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">{title}</td>
      <td className="py-2.5 px-3 font-semibold">{formatCurrency(current)}</td>
      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-semibold">{formatCurrency(previous)}</td>
      <td className="py-2.5 px-3 font-bold">
        {hasPriorData ? (
          <span className={absoluteChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
            {absoluteChange >= 0 ? '+' : ''}{formatCurrency(absoluteChange)}
          </span>
        ) : '—'}
      </td>
      <td className="py-2.5 px-3 font-semibold">
        {percentageChange != null ? `${percentageChange >= 0 ? '+' : ''}${percentageChange}%` : 'N/A (from zero)'}
      </td>
      <td className="py-2.5 px-3">
        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}

export default Reports;
