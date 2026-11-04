import React, { useEffect, useMemo, useState } from 'react';
import {
  MainLayout } from '../components/layout/MainLayout';
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
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CreditCard,
  Wallet,
  X,
  Sparkles
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

// Shared tooltip style — dark background, white text, high contrast
const TOOLTIP_STYLE = {
  backgroundColor: '#1E293B',
  borderRadius: '8px',
  border: '1px solid #334155',
  color: '#F1F5F9',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 600,
};

const TOOLTIP_LABEL_STYLE = { color: '#CBD5E1', fontWeight: 700, marginBottom: 4 };
const TOOLTIP_ITEM_STYLE = { color: '#F1F5F9' };

export const Reports = () => {
  const today = new Date();
  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDrilldownCategory, setActiveDrilldownCategory] = useState(null);

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
  const categoryExpenses = report?.categoryExpenses || [];
  const monthlyTrends = report?.monthlyTrends || [];
  const assets = report?.assets || { total: 0, byCategory: [], items: [] };
  const liabilities = report?.liabilities || { total: 0, byCategory: [], items: [] };
  const observations = report?.observations || [];

  // --- CHART 1: Monthly Income vs Expenses (grouped bar) ---
  // Sorted chronologically by the backend; monthlyTrends already ordered.
  const trendsChartData = useMemo(() => {
    return monthlyTrends.map((t) => ({
      month: t.month,
      Income: Number(t.total_income || 0),
      Expenses: Number(t.total_expenses || 0),
    }));
  }, [monthlyTrends]);

  // --- CHART 2: Category-wise Expense Distribution (vertical bar, sorted desc) ---
  // Percentage is computed correctly: (category_amount / total_expenses) * 100
  const categoryChartData = useMemo(() => {
    const totalExpenses = categoryExpenses.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
    return [...categoryExpenses]
      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
      .map((cat) => ({
        category: cat.category_name || 'Uncategorized',
        amount: Number(cat.total_amount || 0),
        // Correctly computed: category / total * 100; guard zero-division
        pct: totalExpenses > 0
          ? Number(((Number(cat.total_amount || 0) / totalExpenses) * 100).toFixed(1))
          : 0,
        transaction_count: cat.transaction_count,
        // pass original for drilldown
        _raw: cat,
      }));
  }, [categoryExpenses]);

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
            No transactions or asset valuations were recorded for this period. Select another date range or record income and expenses to view reports.
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

          {/* FINANCIAL SUMMARY CARDS */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Period Financial Position
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </div>
          </div>

          {/* AUTOMATED OBSERVATIONS */}
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

          {/* ================================================================
              TWO CHARTS SECTION
              Chart 1: Monthly Income vs Expenses (grouped bar)
              Chart 2: Category-wise Expense Distribution (vertical bar)
          ================================================================ */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Interactive Charts
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* CHART 1 — Monthly Income vs Expenses */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-finman-blue" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Monthly Income vs Expenses
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">Monthly Aggregates</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 ml-6">
                  How income and expenditure change over time. X-axis: month; Y-axis: ₹ amount.
                </p>

                {trendsChartData.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400 dark:text-slate-500">
                    No monthly activity recorded for this period.
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trendsChartData}
                        margin={{ top: 15, right: 15, left: 15, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                          height={40}
                          label={{
                            value: 'Month',
                            position: 'insideBottom',
                            offset: -5,
                            fill: '#64748B',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                          width={75}
                          label={{
                            value: 'Amount (₹)',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 5,
                            style: { textAnchor: 'middle', fill: '#64748B', fontSize: 12, fontWeight: 700 },
                          }}
                          tickFormatter={(val) =>
                            val >= 100000
                              ? `₹${(val / 100000).toFixed(1)}L`
                              : val >= 1000
                              ? `₹${(val / 1000).toFixed(0)}k`
                              : `₹${val}`
                          }
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelStyle={TOOLTIP_LABEL_STYLE}
                          itemStyle={TOOLTIP_ITEM_STYLE}
                          formatter={(value, name) => [formatCurrency(value), name]}
                          cursor={{ fill: 'rgba(148,163,184,0.1)' }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748B' }}
                        />
                        <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* CHART 2 — Category-wise Expense Distribution */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-finman-blue" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Category-wise Expense Distribution
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {categoryChartData.length} categories
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 ml-6">
                  Which expense categories account for the largest share of spending. Sorted highest to lowest.
                </p>

                {categoryChartData.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400 dark:text-slate-500">
                    No categorized expenses in this period.
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryChartData}
                        margin={{ top: 15, right: 15, left: 15, bottom: 45 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                          height={60}
                          label={{
                            value: 'Expense Category',
                            position: 'insideBottom',
                            offset: -20,
                            fill: '#64748B',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                          width={75}
                          label={{
                            value: 'Expenses (₹)',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 5,
                            style: { textAnchor: 'middle', fill: '#64748B', fontSize: 12, fontWeight: 700 },
                          }}
                          tickFormatter={(val) =>
                            val >= 100000
                              ? `₹${(val / 100000).toFixed(1)}L`
                              : val >= 1000
                              ? `₹${(val / 1000).toFixed(0)}k`
                              : `₹${val}`
                          }
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelStyle={TOOLTIP_LABEL_STYLE}
                          itemStyle={TOOLTIP_ITEM_STYLE}
                          formatter={(value, name, props) => {
                            const pct = props?.payload?.pct ?? 0;
                            const count = props?.payload?.transaction_count ?? 0;
                            return [
                              `${formatCurrency(value)} (${pct}% of total, ${count} txn${count !== 1 ? 's' : ''})`,
                              'Total Spent',
                            ];
                          }}
                          cursor={{ fill: 'rgba(148,163,184,0.1)' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                          {categoryChartData.map((entry, index) => (
                            <Cell
                              key={`cat-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                              cursor="pointer"
                              onClick={() => setActiveDrilldownCategory(entry._raw)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {categoryChartData.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Click a bar to see category details
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* PERIOD-OVER-PERIOD COMPARISON TABLE */}
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

          {/* LIABILITIES & ASSETS DETAIL TABLES */}
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

      {/* Category Drilldown Modal */}
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
                  {/* Correctly computed: category / total * 100 */}
                  {(() => {
                    const total = categoryExpenses.reduce((s, c) => s + Number(c.total_amount || 0), 0);
                    if (total <= 0) return '0%';
                    return `${((Number(activeDrilldownCategory.total_amount) / total) * 100).toFixed(1)}%`;
                  })()}
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
