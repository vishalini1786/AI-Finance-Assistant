import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Cell 
} from 'recharts';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { dashboardSummary, initialExpenses, lineChartData, donutChartData, userProfile } from '../data/mockData';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  PiggyBank, 
  Sparkles, 
  ArrowRight, 
  Award,
  TrendingUp,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);
  const [hoveredTxId, setHoveredTxId] = useState(null);

  const totalDonutSpent = donutChartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <MainLayout>
      <PageHeader
        title={`Good morning, ${userProfile.name}! 👋`}
        subtitle="Here is your live AI financial command centre for August 2026"
      />

      {/* 1. Summary Cards Row with 3D Hover Lift */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in fade-in duration-500">
        <SummaryCard title="Total Balance" amount={dashboardSummary.totalBalance} indicator="+12.5% this month" icon={Wallet} type="blue" />
        <SummaryCard title="Monthly Income" amount={dashboardSummary.monthlyIncome} indicator="+8.3% this month" icon={ArrowUpRight} type="income" />
        <SummaryCard title="Monthly Expenses" amount={dashboardSummary.monthlyExpenses} indicator="-3.6% this month" icon={ArrowDownRight} type="expense" />
        <SummaryCard title="Total Savings" amount={dashboardSummary.totalSavings} indicator="+15.8% this month" icon={PiggyBank} type="teal" />
      </div>

      {/* 2. Main Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Line Chart with Hover Border Glow */}
        <div className="lg:col-span-2 bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400/40 transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Income vs Expenses
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-finman-blue px-2 py-0.5 rounded-md">Live Trend</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Cash flow comparative breakdown for 2026</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-finman-blue"></span> Income</span>
              <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Expense</span>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    borderRadius: '12px', 
                    border: '1px solid #334155',
                    color: '#FFF',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)' 
                  }}
                  itemStyle={{ color: '#F8FAFC', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="Income" 
                  stroke="#2563EB" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 7, strokeWidth: 3, stroke: '#2563EB', fill: '#FFFFFF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expense" 
                  name="Expenses" 
                  stroke="#EF4444" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 7, strokeWidth: 3, stroke: '#EF4444', fill: '#FFFFFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Donut Chart with Interactive Slices */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-bold text-slate-800">Expenses by Category</h2>
            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
              ₹{totalDonutSpent.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-2">Hover on a slice to inspect budget allocation</p>

          <div className="h-56 relative flex items-center justify-center">
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
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill} 
                      className="cursor-pointer transition-all duration-300 hover:opacity-75 hover:scale-105 origin-center"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Dynamic Center Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2 transition-all duration-300">
              {activeCategory ? (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block truncate max-w-[100px]">
                    {activeCategory.name}
                  </span>
                  <span className="text-xl font-black text-slate-900 block">
                    ₹{activeCategory.value.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold text-finman-blue bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    {Math.round((activeCategory.value / totalDonutSpent) * 100)}% share
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">TOTAL</span>
                  <span className="text-xl font-black text-slate-900 block">₹{totalDonutSpent.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] font-semibold text-slate-400">6 Active Buckets</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Legend Grid with Hover Sync */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px]">
            {donutChartData.map((item) => (
              <div 
                key={item.name} 
                onMouseEnter={() => setActiveCategory(item)}
                onMouseLeave={() => setActiveCategory(null)}
                className={`flex items-center gap-1.5 font-bold cursor-pointer rounded-lg p-1.5 transition-all duration-200 ${
                  activeCategory?.name === item.name 
                    ? 'bg-slate-900 text-white scale-105 shadow-md' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }}></span>
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Budget Utilization & Financial Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        
        {/* Budget Utilization Card */}
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
                <p className="text-xs text-slate-400">Overall monthly spending envelope</p>
              </div>
              <span className="text-xs font-black text-finman-blue bg-blue-50 px-3 py-1 rounded-full group-hover:bg-finman-blue group-hover:text-white transition-all">
                {dashboardSummary.budgetUtilization}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3.5 mb-3 overflow-hidden p-0.5 border border-slate-200/60">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110" 
                style={{ width: `${dashboardSummary.budgetUtilization}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>₹{dashboardSummary.budgetSpent.toLocaleString('en-IN')} Spent</span>
              <span className="text-slate-400">Limit: ₹{dashboardSummary.budgetTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-finman-blue">
            <span>Inspect Category Limits</span>
            <span className="group-hover:translate-x-1.5 transition-transform">→</span>
          </div>
        </div>

        {/* Financial Health Card */}
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
                <p className="text-xs text-slate-400">ML-driven evaluation model</p>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                Great (82/100)
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-4xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">82</span>
              <span className="text-sm font-bold text-slate-400">/ 100</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                <TrendingUp className="w-3.5 h-3.5" /> +4 pts vs last month
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Your savings discipline has placed you in the top 15% of users.</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
            <span>View Full Diagnostic Breakdown</span>
            <span className="group-hover:translate-x-1.5 transition-transform">→</span>
          </div>
        </div>
      </div>

      {/* 4. Recent Transactions & AI Cards with Row Highlight Animations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Transactions Table with Row Lift */}
        <div className="lg:col-span-2 bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Recent Transactions</h2>
              <p className="text-xs text-slate-400">Latest active debit and credit transactions</p>
            </div>
            <button 
              onClick={() => navigate('/expenses')} 
              className="text-xs font-bold text-finman-blue hover:text-finman-blueDark hover:underline flex items-center gap-1.5 group"
            >
              Open Expense Ledger 
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="space-y-2.5">
            {initialExpenses.slice(0, 5).map((tx) => (
              <div 
                key={tx.id} 
                onMouseEnter={() => setHoveredTxId(tx.id)}
                onMouseLeave={() => setHoveredTxId(null)}
                className={`p-3.5 rounded-xl flex items-center justify-between transition-all duration-200 border cursor-pointer ${
                  hoveredTxId === tx.id 
                    ? 'bg-slate-50/90 border-blue-200 shadow-md scale-[1.01] -translate-y-0.5' 
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-transform ${
                    tx.isIncome 
                      ? 'bg-emerald-50 text-emerald-600 group-hover:scale-110' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tx.merchant.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{tx.merchant}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{tx.category} • {tx.date}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-black block ${tx.isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{tx.mode}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight & Goals Cards */}
        <div className="space-y-6">
          <div 
            onClick={() => navigate('/ai-assistant')}
            className="group bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Financial Advisor
              </div>
              <span className="text-xs text-white/80 group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <h4 className="text-sm font-bold mt-2">Optimize Food & Leisure Budget</h4>
            <p className="text-xs text-blue-100/90 leading-relaxed font-medium mt-1">
              Your savings rate improved by 5.6% this month. Trimming food delivery by ₹1,200 will achieve your quarterly goal early.
            </p>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs font-bold text-amber-300 group-hover:underline">
              Chat with Assistant →
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Savings Target: 3-Month Streak</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Maintaining a consistent 50% savings ratio for 90 days.
              </p>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};