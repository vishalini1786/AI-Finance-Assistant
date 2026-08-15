import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { budgetCategories } from '../data/mockData';
import { Plus, Sparkles, X } from 'lucide-react';

export const Budget = () => {
  const [budgets, setBudgets] = useState(budgetCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: 'Food', amount: '' });

  const totalBudget = budgets.reduce((acc, b) => acc + b.budget, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallUtil = Math.round((totalSpent / totalBudget) * 100);

  const handleCreateBudget = (e) => {
    e.preventDefault();
    if (!newBudget.amount) return;

    setBudgets([
      ...budgets,
      {
        id: Date.now(),
        category: newBudget.category,
        budget: Number(newBudget.amount),
        spent: 0,
      },
    ]);
    setIsModalOpen(false);
    setNewBudget({ category: 'Food', amount: '' });
  };

  return (
    <MainLayout>
      <PageHeader
        title="Budget Management"
        subtitle="Set limits and monitor utilization across spending categories"
        rightElement={
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-finman-purple hover:bg-finman-purpleDark text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Create Budget
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard title="Total Budget" amount={totalBudget} indicator="August 2026" />
        <SummaryCard title="Total Spent" amount={totalSpent} indicator="This Month" type="expense" />
        <SummaryCard title="Total Remaining" amount={remaining} indicator="Safe margin" type="income" />
        <SummaryCard title="Overall Utilization" amount={`${overallUtil}%`} indicator="Healthy progress" type="purple" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Category</th>
              <th className="py-3.5 px-6">Budget</th>
              <th className="py-3.5 px-6">Spent</th>
              <th className="py-3.5 px-6">Remaining</th>
              <th className="py-3.5 px-6 w-1/3">Utilization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {budgets.map((b) => {
              const util = Math.round((b.spent / b.budget) * 100);
              const isOver = util >= 90;
              const isWarning = util >= 75 && util < 90;

              return (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-800">{b.category}</td>
                  <td className="py-4 px-6">₹{b.budget.toLocaleString('en-IN')}</td>
                  <td className="py-4 px-6 font-bold text-slate-900">₹{b.spent.toLocaleString('en-IN')}</td>
                  <td className="py-4 px-6 text-slate-500">₹{(b.budget - b.spent).toLocaleString('en-IN')}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-finman-purple'
                          }`}
                          style={{ width: `${Math.min(util, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-[11px] font-bold ${isOver ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-600'}`}>
                        {util}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-5 rounded-2xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-finman-purple shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-purple-950">AI Budget Recommendation</h4>
          <p className="text-xs text-purple-900 mt-1">
            Shopping is at 94% utilization with ₹480 remaining. We suggest cutting discretionary shopping expenses by ~₹700 next month to keep a buffer.
          </p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900">Create Monthly Budget</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateBudget} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-purple"
                >
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Bills">Bills</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Budget Limit (₹)</label>
                <input
                  type="number"
                  required
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  placeholder="8000"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-purple"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-finman-purple text-white font-bold rounded-xl hover:bg-finman-purpleDark">Set Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};