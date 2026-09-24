import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import budgetService from '../services/budgetService';
import categoryService from '../services/categoryService';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Plus,
  X,
  AlertTriangle,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  Sliders,
} from 'lucide-react';

const currentDate = new Date();
const defaultMonth = currentDate.getMonth() + 1;
const defaultYear = currentDate.getFullYear();
const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const Budget = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    budgetAmount: '',
    month: defaultMonth,
    year: defaultYear,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [budgetRows, categoryRows] = await Promise.all([
        budgetService.getBudgets(),
        categoryService.getCategories(),
      ]);
      setBudgets(budgetRows || []);
      setCategories(categoryRows || []);
      setError('');
    } catch (err) {
      setError('Unable to load budget records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!formData.categoryId && categories.length > 0) {
      setFormData((prev) => ({ ...prev, categoryId: String(categories[0].category_id) }));
    }
  }, [categories, formData.categoryId]);

  const totals = useMemo(() => {
    const totalBudget = budgets.reduce((acc, item) => acc + Number(item.budget_amount || 0), 0);
    const totalSpent = budgets.reduce((acc, item) => acc + Number(item.actual_spent || 0), 0);
    return {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      utilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      overCount: budgets.filter((item) => item.is_exceeded).length,
    };
  }, [budgets]);

  const openCreate = () => {
    setEditingBudget(null);
    setError('');
    setFormData({
      categoryId: categories[0]?.category_id ? String(categories[0].category_id) : '',
      budgetAmount: '',
      month: defaultMonth,
      year: defaultYear,
    });
    setIsModalOpen(true);
  };

  const openEdit = (budget) => {
    setEditingBudget(budget);
    setError('');
    setFormData({
      categoryId: String(budget.category_id),
      budgetAmount: String(budget.budget_amount),
      month: Number(budget.month),
      year: Number(budget.year),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    setSaving(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      categoryId: Number(formData.categoryId),
      budgetAmount: Number(formData.budgetAmount),
      month: Number(formData.month),
      year: Number(formData.year),
    };

    try {
      setSaving(true);
      if (editingBudget) {
        await budgetService.updateBudget(editingBudget.budget_id, payload);
      } else {
        await budgetService.createBudget(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save budget record.');
      setSaving(false);
    }
  };

  const handleDelete = async (budgetId) => {
    if (!window.confirm('Delete this budget record?')) return;
    try {
      await budgetService.deleteBudget(budgetId);
      await loadData();
    } catch (err) {
      setError('Unable to delete budget record.');
    }
  };

  const sortedBudgets = useMemo(() => (
    [...budgets].sort((a, b) => {
      if (Number(b.year) !== Number(a.year)) return Number(b.year) - Number(a.year);
      if (Number(b.month) !== Number(a.month)) return Number(b.month) - Number(a.month);
      return String(a.category_name).localeCompare(String(b.category_name));
    })
  ), [budgets]);

  const criticalBudgets = budgets.filter((item) => Number(item.utilization_percent || 0) >= 90);

  return (
    <MainLayout>
      <PageHeader
        title="Budget Allocation & Limits"
        subtitle="Category spending caps calculated from real expense records"
        rightElement={
          <button
            onClick={openCreate}
            disabled={categories.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-finman-blue hover:bg-finman-blueDark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md hover:shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Budget
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard title="Total Allocated Budget" amount={totals.totalBudget} indicator="Budget limits" />
        <SummaryCard title="Total Spent" amount={totals.totalSpent} indicator="Matched expenses" type="expense" />
        <SummaryCard title="Remaining" amount={totals.remaining} indicator="Budget minus spent" type="income" />
        <SummaryCard title="Overall Utilization" amount={`${totals.utilization}%`} indicator={`${totals.overCount} over budget`} type="blue" />
      </div>

      {criticalBudgets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/90 p-5 rounded-2xl mb-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-amber-950">Budget attention needed</h4>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                {criticalBudgets.length} category budget is at or above 90% utilization.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-white border border-amber-200 px-3 py-1.5 rounded-xl">
            Review rows below
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-finman-blue" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Category Limits & Live Gauges</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Expense totals are computed by backend queries</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-finman-blue" />
            <p className="text-sm font-semibold">Loading budgets...</p>
          </div>
        ) : sortedBudgets.length === 0 ? (
          <div className="p-16 text-center">
            <Sliders className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No budgets created</h4>
            <p className="text-xs text-slate-400 mt-1">Create a category budget to start tracking utilization.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Period</th>
                  <th className="py-3.5 px-6">Allocated Limit</th>
                  <th className="py-3.5 px-6">Spent</th>
                  <th className="py-3.5 px-6">Remaining</th>
                  <th className="py-3.5 px-6 w-1/3">Utilization</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {sortedBudgets.map((budget) => {
                  const util = Number(budget.utilization_percent || 0);
                  const remaining = Number(budget.remaining_amount || 0);
                  const isOver = budget.is_exceeded;
                  const isWarning = util >= 70 && !isOver;
                  const monthLabel = MONTHS.find((month) => month.value === Number(budget.month))?.label || budget.month;

                  return (
                    <tr key={budget.budget_id} className="group hover:bg-slate-50/80 transition-all duration-200">
                      <td className="py-4 px-6 font-bold text-slate-900">{budget.category_name}</td>
                      <td className="py-4 px-6 text-slate-500 font-semibold">{monthLabel} {budget.year}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{formatCurrency(budget.budget_amount)}</td>
                      <td className="py-4 px-6 font-bold text-slate-800">{formatCurrency(budget.actual_spent)}</td>
                      <td className="py-4 px-6">
                        <span className={`font-bold ${remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isOver ? `Over by ${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-finman-blue'
                              }`}
                              style={{ width: `${Math.min(util, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-black w-14 text-right ${isOver ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
                            {util}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(budget)}
                            className="p-1.5 hover:bg-blue-100/70 text-slate-400 hover:text-finman-blue rounded-lg transition-colors"
                            title="Edit Budget"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(budget.budget_id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete Budget"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-finman-blue shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-900">Budget Data Source</h4>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Spending values come from the expenses table for the same user, category, month, and year.
            </p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">{editingBudget ? 'Edit Budget' : 'Create Budget'}</h3>
              <button onClick={closeModal} type="button">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  required
                  value={formData.categoryId}
                  disabled={Boolean(editingBudget)}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>{category.name}</option>
                  ))}
                </select>
                {editingBudget && (
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Create a new budget to change category.</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Budget Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={formData.budgetAmount}
                  onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-finman-blue text-white font-bold rounded-xl hover:bg-finman-blueDark shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingBudget ? 'Update Budget' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
