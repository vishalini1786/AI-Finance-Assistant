import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { initialExpenses, dashboardSummary } from '../data/mockData';
import { Plus, Search, Trash2, Edit2, X, Download } from 'lucide-react';

export const Expenses = () => {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    category: 'Food',
    merchant: '',
    amount: '',
    mode: 'UPI',
    date: '15 Aug 2026',
  });

  const handleDelete = (id) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!formData.merchant || !formData.amount) return;

    const newEntry = {
      id: Date.now(),
      date: formData.date,
      category: formData.category,
      merchant: formData.merchant,
      amount: Number(formData.amount),
      mode: formData.mode,
    };

    setExpenses([newEntry, ...expenses]);
    setIsModalOpen(false);
    setFormData({ category: 'Food', merchant: '', amount: '', mode: 'UPI', date: '15 Aug 2026' });
  };

  const filtered = expenses.filter((e) => {
    const matchesSearch = e.merchant.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      <PageHeader
        title="Expense Management"
        subtitle="Track, filter, and record your daily spending"
        rightElement={
          <>
            <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-finman-purple hover:bg-finman-purpleDark text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard title="Total Spent" amount={dashboardSummary.monthlyExpenses} indicator="This Month" type="expense" />
        <SummaryCard title="Daily Average" amount={dashboardSummary.dailyAverage} indicator="This Month" />
        <SummaryCard title="Highest Category" amount={`Food (₹${dashboardSummary.highestCategoryAmount.toLocaleString('en-IN')})`} indicator="41% of total" type="purple" />
        <SummaryCard title="Total Transactions" amount={expenses.length} indicator="Active records" />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search merchant or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-800 w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Healthcare">Healthcare</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Date</th>
              <th className="py-3.5 px-6">Category</th>
              <th className="py-3.5 px-6">Merchant</th>
              <th className="py-3.5 px-6">Payment Mode</th>
              <th className="py-3.5 px-6 text-right">Amount</th>
              <th className="py-3.5 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-6 text-slate-400">{tx.date}</td>
                <td className="py-4 px-6">
                  <span className="bg-purple-50 text-finman-purple font-semibold px-2.5 py-1 rounded-lg text-[11px]">
                    {tx.category}
                  </span>
                </td>
                <td className="py-4 px-6 font-bold text-slate-800">{tx.merchant}</td>
                <td className="py-4 px-6 text-slate-500">{tx.mode}</td>
                <td className="py-4 px-6 text-right font-bold text-rose-500">₹{tx.amount.toLocaleString('en-IN')}</td>
                <td className="py-4 px-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-1 hover:text-finman-purple"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(tx.id)} className="p-1 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Expense</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Merchant / Description</label>
                <input
                  type="text"
                  required
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  placeholder="e.g. Swiggy, Uber, Amazon"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="500"
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-purple"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-finman-purple text-white font-bold rounded-xl hover:bg-finman-purpleDark">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};