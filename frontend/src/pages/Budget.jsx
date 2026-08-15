import React, { useState, useMemo } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { budgetCategories } from '../data/mockData';
import { 
  Plus, 
  Sparkles, 
  X, 
  AlertTriangle, 
  Trash2, 
  Edit2, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  Sliders
} from 'lucide-react';

export const Budget = () => {
  const [budgets, setBudgets] = useState(budgetCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Table sorting & inline expansion state
  const [sortField, setSortField] = useState('percent');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  // Quick In-Table Budget Stepper (+₹1,000 / -₹1,000)
  const handleQuickAdjust = (id, delta, e) => {
    e.stopPropagation();
    setBudgets(budgets.map(b => {
      if (b.id === id) {
        const updatedBudget = Math.max(b.budget + delta, b.spent);
        return {
          ...b,
          budget: updatedBudget,
          percent: Math.round((b.spent / updatedBudget) * 100)
        };
      }
      return b;
    }));
  };

  const handleDeleteBudget = (id, e) => {
    e.stopPropagation();
    setBudgets(budgets.filter(b => b.id !== id));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const totalBudget = budgets.reduce((acc, b) => acc + b.budget, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallUtil = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const existingNames = budgets.map((b) => b.category.toLowerCase());

  const handleCreateBudget = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = categoryName.trim();
    if (!trimmed) {
      setErrorMessage('Please provide a category name.');
      return;
    }

    if (existingNames.includes(trimmed.toLowerCase())) {
      setErrorMessage(`A budget limit for "${trimmed}" already exists.`);
      return;
    }

    if (!budgetAmount || Number(budgetAmount) <= 0) {
      setErrorMessage('Please enter an amount greater than 0.');
      return;
    }

    const newBudgetItem = {
      id: Date.now(),
      category: trimmed,
      budget: Number(budgetAmount),
      spent: 0,
      percent: 0,
    };

    setBudgets([...budgets, newBudgetItem]);
    setIsModalOpen(false);
    setCategoryName('');
    setBudgetAmount('');
  };

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'remaining') {
        valA = a.budget - a.spent;
        valB = b.budget - b.spent;
      }

      if (typeof valA === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
  }, [budgets, sortField, sortOrder]);

  return (
    <MainLayout>
      <PageHeader
        title="Budget Allocation & Limits"
        subtitle="Plan category spending caps, adjust limits inline, and track utilization thresholds"
        rightElement={
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs">
              Cycle: August 2026
            </span>
            <button 
              onClick={() => { setIsModalOpen(true); setErrorMessage(''); }} 
              className="flex items-center gap-1.5 px-4 py-2 bg-finman-blue hover:bg-finman-blueDark text-white rounded-xl text-xs font-bold shadow-md hover:shadow-blue-500/20 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Custom Budget
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard title="Total Allocated Budget" amount={totalBudget} indicator="Monthly Cap" />
        <SummaryCard title="Total Spent" amount={totalSpent} indicator="This Month" type="expense" />
        <SummaryCard title="Unspent Buffer" amount={remaining} indicator="Safe liquidity" type="income" />
        <SummaryCard title="Overall Utilization" amount={`${overallUtil}%`} indicator="Overall Status" type="blue" />
      </div>

      {/* Over-Budget Alert Card */}
      <div className="bg-amber-50 border border-amber-200/90 p-5 rounded-2xl mb-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-xs font-black text-amber-950">Shopping category utilization at 94%</h4>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              Only ₹480 remaining before cap exhaustion. Consider reallocating budget from Education.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setSortField('percent')}
          className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-900 font-bold text-xs rounded-xl hover:bg-amber-100 shadow-2xs transition-transform hover:scale-105"
        >
          Review Critical Limits
        </button>
      </div>

      {/* Interactive Budget Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-finman-blue" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Category Limits & Live Gauges</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Click headers to sort • Click row to expand activity</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider select-none">
            <tr>
              {/* Category */}
              <th onClick={() => handleSort('category')} className="py-3.5 px-6 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {sortField === 'category' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                </div>
              </th>

              {/* Budget Limit */}
              <th onClick={() => handleSort('budget')} className="py-3.5 px-6 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span>Allocated Limit</span>
                  {sortField === 'budget' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                </div>
              </th>

              {/* Spent */}
              <th onClick={() => handleSort('spent')} className="py-3.5 px-6 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span>Spent</span>
                  {sortField === 'spent' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                </div>
              </th>

              {/* Remaining */}
              <th onClick={() => handleSort('remaining')} className="py-3.5 px-6 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span>Remaining</span>
                  {sortField === 'remaining' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                </div>
              </th>

              {/* Utilization Gauge */}
              <th onClick={() => handleSort('percent')} className="py-3.5 px-6 w-1/3 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span>Utilization %</span>
                  {sortField === 'percent' ? (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                </div>
              </th>

              <th className="py-3.5 px-6 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {sortedBudgets.map((b) => {
              const util = Math.round((b.spent / b.budget) * 100);
              const remainingAmount = b.budget - b.spent;
              const isOver = util >= 90;
              const isWarning = util >= 70 && util < 90;
              const isExpanded = expandedCategoryId === b.id;

              return (
                <React.Fragment key={b.id}>
                  <tr 
                    onClick={() => setExpandedCategoryId(isExpanded ? null : b.id)}
                    className="group hover:bg-slate-50/80 transition-all duration-200 cursor-pointer"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-finman-blue' : 'text-slate-300'}`} />
                      <span>{b.category}</span>
                    </td>

                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>₹{b.budget.toLocaleString('en-IN')}</span>
                        {/* Inline Adjuster Pills */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleQuickAdjust(b.id, -1000, e)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                            title="Decrease limit by ₹1,000"
                          >
                            -1k
                          </button>
                          <button 
                            onClick={(e) => handleQuickAdjust(b.id, 1000, e)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                            title="Increase limit by ₹1,000"
                          >
                            +1k
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-bold text-slate-800">
                      ₹{b.spent.toLocaleString('en-IN')}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`font-bold ${remainingAmount <= 500 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{remainingAmount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-finman-blue'
                            } group-hover:brightness-110`}
                            style={{ width: `${Math.min(util, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-[11px] font-black w-10 text-right ${isOver ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
                          {util}%
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleDeleteBudget(b.id, e)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Delete Budget Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Category Diagnostics Drawer */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-y border-slate-200/80 animate-in fade-in duration-200">
                      <td colSpan={6} className="p-5">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Spending Velocity</span>
                            <span className="text-xs font-bold text-slate-800">
                              ₹{Math.round(b.spent / 15)} / day (15 days elapsed)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Recommended Action</span>
                            <span className={`text-xs font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {isOver ? 'Freeze discretionary transactions' : 'Safe to proceed on budget target'}
                            </span>
                          </div>
                          <div className="flex justify-end items-center">
                            <span className="text-xs font-bold text-finman-blue">
                              {b.category} Cap: ₹{b.budget.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Budget Suggestion */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-finman-blue shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-900">AI Budget Suggestion</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              You are approaching your Shopping budget limit. Trimming non-essential purchases by ₹700 will preserve a healthy monthly liquidity ratio.
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-white border border-blue-200 text-finman-blue font-bold text-xs rounded-xl hover:bg-blue-50 shadow-sm shrink-0 transition-all hover:scale-105">
          View Recommendations →
        </button>
      </div>

      {/* Custom Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">Create Custom Budget</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateBudget} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Vacation, Fitness, Pet Care, Fuel"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Budget Limit (₹)</label>
                <input
                  type="number"
                  required
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-finman-blue text-white font-bold rounded-xl hover:bg-finman-blueDark shadow-md"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};