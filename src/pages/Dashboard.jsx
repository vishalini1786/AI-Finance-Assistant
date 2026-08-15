import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { dashboardSummary, initialExpenses, lineChartData, donutChartData, userProfile } from '../data/mockData';
import { Sparkles, ArrowRight } from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <PageHeader
        title={`Good morning, ${userProfile.name}!`}
        subtitle="Here's your personal financial overview for August 2026"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard title="Total Balance" amount={dashboardSummary.totalBalance} indicator="+12.5% this month" type="purple" />
        <SummaryCard title="Monthly Income" amount={dashboardSummary.monthlyIncome} indicator="+8.3% this month" type="income" />
        <SummaryCard title="Monthly Expenses" amount={dashboardSummary.monthlyExpenses} indicator="-3.6% this month" type="expense" />
        <SummaryCard title="Total Savings" amount={dashboardSummary.totalSavings} indicator="+15.8% this month" type="income" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 mb-4">Income vs Expenses</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800">Recent Transactions</h2>
              <button onClick={() => navigate('/expenses')} className="text-xs font-bold text-finman-purple hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {initialExpenses.slice(0, 4).map((tx) => (
                <div key={tx.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{tx.merchant}</p>
                    <p className="text-xs text-slate-400">{tx.category} • {tx.date}</p>
                  </div>
                  <span className="text-sm font-bold text-rose-500">-₹{tx.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 mb-2">Expenses by Category</h2>
            <div className="h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-semibold text-slate-400">Total Spent</span>
                <span className="text-lg font-black text-slate-900">₹32,450</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-finman-purple font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4" /> AI Financial Insight
            </div>
            <p className="text-xs text-purple-900 leading-relaxed">
              Your savings rate improved by 5.6% this month. Food and shopping are the two largest areas with potential for cutbacks.
            </p>
            <button onClick={() => navigate('/ai-assistant')} className="mt-3 text-xs font-bold text-finman-purple hover:underline">
              Analyze with AI Assistant →
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400">FINANCIAL HEALTH</span>
              <div className="text-2xl font-black text-finman-purple mt-1">{userProfile.healthScore} / 100</div>
              <span className="text-xs font-semibold text-emerald-600">Great condition</span>
            </div>
            <button onClick={() => navigate('/health')} className="text-xs font-bold bg-purple-50 text-finman-purple px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors">
              Details
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};