import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/formatDate';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import dashboardService from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Sparkles,
  ArrowRight,
  Award,
  TrendingUp,
  ChevronRight,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const CATEGORY_COLORS = ['#EF4444', '#2563EB', '#F59E0B', '#0D9488', '#8B5CF6', '#94A3B8'];

const emptySummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netCashFlow: 0,
  periodSavings: 0,
  deficit: 0,
  totalSavings: 0,
  netWorth: 0,
  budget: {
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    utilizationPercent: 0,
    isOverBudget: false,
  },
  financialHealthScore: null,
  projects: {
    activeProjects: 0,
    totalTargetBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    projects: [],
  },
};

function formatMonthLabel(value) {
  if (!value) return '';
  const [year, month] = String(value).split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

function buildInsight(summary) {
  if (summary.totalIncome <= 0 && summary.totalExpenses <= 0) {
    return 'Add income and expense records to unlock personalized financial insights.';
  }

  if (summary.netCashFlow < 0) {
    return `Your recorded expenses exceed your recorded income by ${formatCurrency(summary.deficit)} for this period. This is a deficit, not savings.`;
  }

  if (summary.budget?.isOverBudget) {
    return 'One or more monthly budget envelopes are over target. Open Budgets to inspect the affected categories.';
  }

  if (summary.totalSavings > 0) {
    return `Your current recorded surplus is ${formatCurrency(summary.totalSavings)}. Keep income and expense records updated for sharper guidance.`;
  }

  return 'FinMan is ready, but needs more financial history before producing a useful recommendation.';
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState(null);
  const [hoveredTxId, setHoveredTxId] = useState(null);
  const [summary, setSummary] = useState(emptySummary);
  const [transactions, setTransactions] = useState([]);
  const [categoryExpenses, setCategoryExpenses] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [summaryData, recentData, categoryData, trendData] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getRecentTransactions(),
          dashboardService.getCategoryExpenses(),
          dashboardService.getMonthlyTrends(),
        ]);

        if (!isMounted) return;

        const unwrappedSummary = summaryData?.summary || summaryData || {};
        setSummary({ ...emptySummary, ...unwrappedSummary });
        setTransactions(recentData || []);
        setCategoryExpenses(categoryData || []);
        setMonthlyTrends(trendData || []);
        setError('');
      } catch (err) {
        if (isMounted) {
          setError('Unable to load your financial data.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const donutChartData = useMemo(() => (
    categoryExpenses.map((item, index) => ({
      name: item.category_name,
      value: Number(item.total_amount || 0),
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))
  ), [categoryExpenses]);

  const lineChartData = useMemo(() => (
    monthlyTrends.map((item) => ({
      name: formatMonthLabel(item.month),
      income: Number(item.total_income || 0),
      expense: Number(item.total_expenses || 0),
    }))
  ), [monthlyTrends]);

  const totalDonutSpent = donutChartData.reduce((acc, curr) => acc + curr.value, 0);
  const projects = summary.projects?.projects || [];
  const firstName = currentUser?.name?.split(' ')[0] || 'there';
  const healthScore = summary.financialHealthScore;
  const budget = summary.budget || emptySummary.budget;

  return (
    <MainLayout>
      <PageHeader
        title={`Good morning, ${firstName}`}
        subtitle="Your PostgreSQL-backed financial overview"
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-finman-blue mb-3" />
          <p className="text-sm font-semibold">Loading financial data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 animate-in fade-in duration-500">
            <SummaryCard title="Net Cash Flow" amount={summary.netCashFlow || 0} indicator="Income minus expenses" icon={Wallet} type={summary.netCashFlow < 0 ? 'expense' : 'blue'} />
            <SummaryCard title="Total Income" amount={summary.totalIncome || 0} indicator="All recorded income" icon={ArrowUpRight} type="income" />
            <SummaryCard title="Total Expenses" amount={summary.totalExpenses || 0} indicator="All recorded expenses" icon={ArrowDownRight} type="expense" />
            <SummaryCard title={summary.deficit > 0 ? "Deficit" : "Period Savings"} amount={summary.deficit > 0 ? summary.deficit : summary.periodSavings || 0} indicator={summary.deficit > 0 ? 'Negative net cash flow' : 'Positive net cash flow'} icon={PiggyBank} type={summary.deficit > 0 ? 'expense' : 'teal'} />
              {summary.predictionMessage ? (
                <div className="bg-orange-50 border border-orange-200/90 rounded-2xl p-4 flex flex-col justify-center text-orange-800 shadow-sm col-span-1 min-h-[90px]">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">AI Prediction</span>
                  </div>
                  <p className="text-[11px] font-medium leading-tight">{summary.predictionMessage}</p>
                </div>
              ) : (
                <SummaryCard title="Predicted Expense" amount={summary.predictedExpense || 0} indicator="ML Random Forest" icon={Sparkles} type="orange" />
              )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400/40 transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Income vs Expenses
                    <span className="text-[10px] font-bold uppercase bg-blue-50 text-finman-blue px-2 py-0.5 rounded-md">Database Trend</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Last 6 months from income and expense records</p>
                </div>
              </div>

              <div className="h-72 w-full">
                {lineChartData.every((item) => item.income === 0 && item.expense === 0) ? (
                  <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm font-semibold text-slate-400">
                    No income or expense history yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600 }} />
                      <Line type="monotone" dataKey="income" name="Income" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }} />
                      <Line type="monotone" dataKey="expense" name="Expenses" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-base font-bold text-slate-800">Expenses by Category</h2>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {formatCurrency(totalDonutSpent)}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-2">Current month category distribution</p>

              <div className="h-56 relative flex items-center justify-center">
                {donutChartData.length === 0 ? (
                  <div className="text-center text-sm font-semibold text-slate-400">
                    No category spending yet.
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={82}
                          paddingAngle={4}
                          dataKey="value"
                          onMouseEnter={(_, index) => setActiveCategory(donutChartData[index])}
                          onMouseLeave={() => setActiveCategory(null)}
                        >
                          {donutChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer transition-all duration-300 hover:opacity-75" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2 transition-all duration-300">
                      {activeCategory ? (
                        <div>
                          <span className="text-[11px] font-bold uppercase text-slate-400 block truncate max-w-[100px]">{activeCategory.name}</span>
                          <span className="text-xl font-black text-slate-900 block">{formatCurrency(activeCategory.value)}</span>
                          <span className="text-[10px] font-bold text-finman-blue bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            {Math.round((activeCategory.value / totalDonutSpent) * 100)}% share
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Total</span>
                          <span className="text-xl font-black text-slate-900 block">{formatCurrency(totalDonutSpent)}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{donutChartData.length} categories</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {donutChartData.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {donutChartData.map((item) => {
                      const pct = totalDonutSpent > 0 ? Math.round((item.value / totalDonutSpent) * 100) : 0;
                      const isHovered = activeCategory?.name === item.name;
                      return (
                        <div
                          key={item.name}
                          onMouseEnter={() => setActiveCategory(item)}
                          onMouseLeave={() => setActiveCategory(null)}
                          className={`flex items-center justify-between gap-1.5 p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                            isHovered
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                              : 'bg-slate-50/70 border-slate-100 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                            <span className="truncate font-bold">{item.name}</span>
                          </div>
                          <div className="shrink-0 text-right font-bold flex items-center gap-1">
                            <span>{formatCurrency(item.value)}</span>
                            <span className={`text-[9px] px-1 py-0.5 rounded ${isHovered ? 'bg-slate-800 text-sky-400' : 'bg-slate-200 text-slate-600'}`}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                Project Workspaces
              </h2>
              <div className="flex gap-3">
                <button onClick={() => navigate('/projects')} className="text-xs font-bold text-finman-blue hover:underline">
                  View All Projects
                </button>
                <button onClick={() => navigate('/projects')} className="text-xs font-bold bg-finman-blue text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Create Project
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <SummaryCard title="Active Projects" amount={summary.projects?.activeProjects || 0} isCount indicator="Project records" type="blue" />
              <SummaryCard title="Project Capital" amount={summary.projects?.totalTargetBudget || 0} indicator="Total target budget" type="income" />
              <SummaryCard title="Project Spending" amount={summary.projects?.totalSpent || 0} indicator="Project expenses only" type="expense" />
              <SummaryCard title="Project Remaining" amount={summary.projects?.totalRemaining || 0} indicator="Target minus spent" type="teal" />
            </div>

            {projects.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200/90 border-dashed text-center">
                <p className="text-sm text-slate-500 font-medium mb-3">No project workspaces yet.</p>
                <button onClick={() => navigate('/projects')} className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg">
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div
                    key={project.project_id}
                    onClick={() => navigate(`/projects/${project.project_id}`)}
                    className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-slate-900 text-sm truncate pr-2">{project.project_name}</h3>
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${project.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>

                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>{formatCurrency(project.total_spent)}</span>
                      <span>/ {formatCurrency(project.target_budget)}</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${project.is_over_budget ? 'bg-rose-500' : 'bg-finman-blue'}`}
                        style={{ width: `${Math.min(project.utilization_percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                      <span className={`text-[10px] font-bold ${project.is_over_budget ? 'text-rose-600' : 'text-slate-400'}`}>
                        {project.is_over_budget ? 'Over budget' : `${project.utilization_percentage}% used`}
                      </span>
                      <span className="text-[10px] font-bold text-finman-blue flex items-center gap-1">
                        View Project <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div
              onClick={() => navigate('/budget')}
              className="group relative overflow-hidden bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400/50 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-finman-blue transition-colors flex items-center gap-2">
                      Budget Utilization
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h2>
                    <p className="text-xs text-slate-400">Current month budget envelope</p>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full transition-all ${budget.isOverBudget ? 'bg-rose-50 text-rose-600' : 'text-finman-blue bg-blue-50'}`}>
                    {budget.utilizationPercent}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3.5 mb-3 overflow-hidden p-0.5 border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${budget.isOverBudget ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                    style={{ width: `${Math.min(budget.utilizationPercent || 0, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>{formatCurrency(budget.totalSpent)} spent</span>
                  <span className="text-slate-400">Limit: {formatCurrency(budget.totalBudget)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-finman-blue">
                <span>Inspect Category Limits</span>
                <span className="group-hover:translate-x-1.5 transition-transform">-&gt;</span>
              </div>
            </div>

            <div
              onClick={() => navigate('/health')}
              className="group relative overflow-hidden bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-400/50 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                      Financial Health Score
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-600" />
                    </h2>
                    <p className="text-xs text-slate-400">Rule-based score from real records</p>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {healthScore == null ? 'Not enough data' : `${healthScore}/100`}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-4xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {healthScore == null ? '--' : healthScore}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ 100</span>
                  {healthScore != null && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                      <TrendingUp className="w-3.5 h-3.5" /> Live score
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  {healthScore == null
                    ? 'Add income, expense, budget, asset, and liability records to calculate a score.'
                    : 'Calculated from savings rate, budget adherence, debt load, and recorded assets.'}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>View Diagnostic Breakdown</span>
                <span className="group-hover:translate-x-1.5 transition-transform">-&gt;</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Recent Transactions</h2>
                  <p className="text-xs text-slate-400">Latest expense records from PostgreSQL</p>
                </div>
                <button
                  onClick={() => navigate('/expenses')}
                  className="text-xs font-bold text-finman-blue hover:text-finman-blueDark hover:underline flex items-center gap-1.5 group"
                >
                  Open Ledger
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="space-y-2.5">
                {transactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">
                    No transactions yet.
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const title = tx.merchant_name || tx.description || tx.category_name || 'Expense';
                    const date = tx.expense_date ? formatDate(tx.expense_date) : '-';

                    return (
                      <div
                        key={tx.expense_id}
                        onMouseEnter={() => setHoveredTxId(tx.expense_id)}
                        onMouseLeave={() => setHoveredTxId(null)}
                        className={`p-3.5 rounded-xl flex items-center justify-between transition-all duration-200 border cursor-pointer ${
                          hoveredTxId === tx.expense_id
                            ? 'bg-slate-50/90 border-blue-200 shadow-md scale-[1.01] -translate-y-0.5'
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-700">
                            {title.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{title}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{tx.category_name} - {date}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black block text-rose-600">
                            -{formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{tx.payment_mode || 'Manual'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div
                onClick={() => navigate('/ai-assistant')}
                className="group bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Financial Advisor
                  </div>
                  <span className="text-xs text-white/80 group-hover:translate-x-1 transition-transform">-&gt;</span>
                </div>
                <h4 className="text-sm font-bold mt-2">Live Context Ready</h4>
                <p className="text-xs text-blue-100/90 leading-relaxed font-medium mt-1">
                  {buildInsight(summary)}
                </p>
                <div className="mt-4 pt-3 border-t border-white/10 text-xs font-bold text-amber-300 group-hover:underline">
                  Chat with Assistant -&gt;
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Data Integrity</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    No demo financial totals are displayed on this dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
};

