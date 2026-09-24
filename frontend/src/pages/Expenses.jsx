import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import expenseService from '../services/expenseService';
import incomeService from '../services/incomeService';
import documentService from '../services/documentService';
import categoryService from '../services/categoryService';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  Filter,
  Receipt,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other'];
const PAYMENT_MODES = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Auto Debit', 'Other'];

const todayIso = () => new Date().toISOString().slice(0, 10);

function dateForInput(value) {
  if (!value) return todayIso();
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
}

export const Expenses = () => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    categoryId: '',
    merchantName: '',
    amount: '',
    paymentMode: 'UPI',
    expenseDate: todayIso(),
    description: '',
    sourceType: 'MANUAL',
  });

  const [incomeForm, setIncomeForm] = useState({
    source: 'Salary',
    amount: '',
    incomeDate: todayIso(),
    description: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [expenseRows, incomeRows, categoryRows] = await Promise.all([
        expenseService.getExpenses(),
        incomeService.getIncome(),
        categoryService.getCategories(),
      ]);
      setExpenses(expenseRows || []);
      setIncome(incomeRows || []);
      setCategories(categoryRows || []);
      setError('');
    } catch (err) {
      setError('Unable to load income and expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!expenseForm.categoryId && categories.length > 0) {
      setExpenseForm((prev) => ({ ...prev, categoryId: String(categories[0].category_id) }));
    }
  }, [categories, expenseForm.categoryId]);

  const totals = useMemo(() => {
    const totalExpenses = expenses.reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const totalIncome = income.reduce((acc, item) => acc + Number(item.amount || 0), 0);
    return {
      totalExpenses,
      totalIncome,
      net: totalIncome - totalExpenses,
      expenseCount: expenses.length,
      incomeCount: income.length,
    };
  }, [expenses, income]);

  const filteredExpenses = useMemo(() => (
    expenses.filter((item) => {
      const q = searchTerm.toLowerCase();
      const title = `${item.merchant_name || ''} ${item.description || ''} ${item.category_name || ''}`.toLowerCase();
      const matchesSearch = title.includes(q);
      const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
      return matchesSearch && matchesCategory;
    })
  ), [expenses, searchTerm, selectedCategory]);

  const filteredIncome = useMemo(() => (
    income.filter((item) => {
      const q = searchTerm.toLowerCase();
      const title = `${item.source || ''} ${item.description || ''}`.toLowerCase();
      return title.includes(q);
    })
  ), [income, searchTerm]);

  const openAddModal = () => {
    setEditingId(null);
    setModalMode(`choice-${activeTab}`);
    setError('');

    if (activeTab === 'expenses') {
      setExpenseForm({
        categoryId: categories[0]?.category_id ? String(categories[0].category_id) : '',
        merchantName: '',
        amount: '',
        paymentMode: 'UPI',
        expenseDate: todayIso(),
        description: '',
        sourceType: 'MANUAL',
      });
    } else {
      setIncomeForm({
        source: 'Salary',
        amount: '',
        incomeDate: todayIso(),
        description: '',
      });
    }
  };

  const openEditExpense = (item) => {
    setEditingId(item.expense_id);
    setModalMode('expenses');
    setError('');
    setExpenseForm({
      categoryId: String(item.category_id || ''),
      merchantName: item.merchant_name || '',
      amount: String(item.amount || ''),
      paymentMode: item.payment_mode || 'UPI',
      expenseDate: dateForInput(item.expense_date),
      description: item.description || '',
      sourceType: item.source_type || 'MANUAL',
    });
  };

  const openEditIncome = (item) => {
    setEditingId(item.income_id);
    setModalMode('income');
    setError('');
    setIncomeForm({
      source: item.source || 'Other',
      amount: String(item.amount || ''),
      incomeDate: dateForInput(item.income_date),
      description: item.description || '',
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setSaving(false);
    setOcrLoading(false);
    setOcrMessage('');
  };

  const selectManualEntry = () => setModalMode(activeTab);

  const handleScan = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setOcrLoading(true);
      setOcrMessage('Processing document...');
      const result = await documentService.uploadReceipt(file);
      const extraction = result.extraction || {};
      if (activeTab === 'expenses') {
        setExpenseForm((previous) => ({
          ...previous,
          amount: extraction.amount == null ? previous.amount : String(extraction.amount),
          expenseDate: extraction.date || previous.expenseDate,
          merchantName: extraction.merchant || previous.merchantName,
          description: extraction.raw_text || previous.description,
          documentTransactionId: result.transaction?.document_transaction_id,
          sourceType: 'OCR',
        }));
      } else {
        setIncomeForm((previous) => ({
          ...previous,
          amount: extraction.amount == null ? previous.amount : String(extraction.amount),
          incomeDate: extraction.date || previous.incomeDate,
          description: extraction.raw_text || previous.description,
          documentTransactionId: result.transaction?.document_transaction_id,
        }));
      }
      setModalMode(activeTab);
      setOcrMessage('Review the extracted fields, correct them if needed, then save.');
    } catch (err) {
      setOcrMessage(err?.response?.data?.message || 'OCR is temporarily unavailable.');
    } finally {
      setOcrLoading(false);
    }
  };

  const saveExpense = async (event) => {
    event.preventDefault();
    if (!expenseForm.categoryId || !expenseForm.amount || !expenseForm.expenseDate) return;

    const payload = {
      categoryId: Number(expenseForm.categoryId),
      amount: Number(expenseForm.amount),
      expenseDate: expenseForm.expenseDate,
      merchantName: expenseForm.merchantName.trim() || undefined,
      paymentMode: expenseForm.paymentMode,
      description: expenseForm.description.trim() || undefined,
      documentTransactionId: expenseForm.documentTransactionId,
      sourceType: expenseForm.sourceType || 'MANUAL',
    };

    try {
      setSaving(true);
      if (editingId) {
        await expenseService.updateExpense(editingId, payload);
      } else {
        await expenseService.createExpense(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save expense record.');
      setSaving(false);
    }
  };

  const saveIncome = async (event) => {
    event.preventDefault();
    if (!incomeForm.source || !incomeForm.amount || !incomeForm.incomeDate) return;

    const payload = {
      source: incomeForm.source,
      amount: Number(incomeForm.amount),
      incomeDate: incomeForm.incomeDate,
      description: incomeForm.description.trim() || undefined,
    };

    try {
      setSaving(true);
      if (editingId) {
        await incomeService.updateIncome(editingId, payload);
      } else {
        await incomeService.createIncome(payload);
      }
      await loadData();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save income record.');
      setSaving(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await expenseService.deleteExpense(id);
      await loadData();
    } catch (err) {
      setError('Unable to delete expense record.');
    }
  };

  const deleteIncome = async (id) => {
    if (!window.confirm('Delete this income record?')) return;
    try {
      await incomeService.deleteIncome(id);
      await loadData();
    } catch (err) {
      setError('Unable to delete income record.');
    }
  };

  const categoryOptions = categories.map((item) => item.name);
  const activeCount = activeTab === 'expenses' ? filteredExpenses.length : filteredIncome.length;

  return (
    <MainLayout>
      <PageHeader
        title="Income & Expense Ledger"
        subtitle="PostgreSQL-backed financial records with authenticated CRUD"
        rightElement={
          <button
            onClick={openAddModal}
            disabled={activeTab === 'expenses' && categories.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-finman-blue hover:bg-finman-blueDark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md hover:shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> {activeTab === 'expenses' ? 'Add Expense' : 'Add Income'}
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
        <SummaryCard title="Total Income" amount={totals.totalIncome} indicator="Recorded income" icon={ArrowUpRight} type="income" />
        <SummaryCard title="Total Expenses" amount={totals.totalExpenses} indicator="Recorded expenses" icon={ArrowDownRight} type="expense" />
        <SummaryCard
          title="Net Cash Flow"
          amount={totals.net}
          indicator={totals.net < 0 ? `Deficit: ${formatCurrency(Math.abs(totals.net))}` : 'Income minus expenses'}
          type={totals.net < 0 ? 'expense' : 'blue'}
        />
        <SummaryCard title="Ledger Records" amount={totals.expenseCount + totals.incomeCount} isCount indicator="Persistent rows" type="teal" />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'expenses' ? 'bg-finman-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Income
          </button>
        </div>

        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 w-full lg:w-96 focus-within:ring-2 focus-within:ring-finman-blue/20 focus-within:border-finman-blue focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-800 w-full font-medium"
          />
        </div>

        {activeTab === 'expenses' && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors w-full lg:w-auto"
          >
            <option value="All">All Categories</option>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-finman-blue" />
            <p className="text-sm font-semibold">Loading ledger records...</p>
          </div>
        ) : activeCount === 0 ? (
          <div className="p-16 text-center">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No {activeTab === 'expenses' ? 'expense' : 'income'} records found</h4>
            <p className="text-xs text-slate-400 mt-1">Create a record and refresh to verify PostgreSQL persistence.</p>
          </div>
        ) : activeTab === 'expenses' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Merchant</th>
                  <th className="py-3.5 px-4">Payment Mode</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredExpenses.map((item) => (
                  <tr key={item.expense_id} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-4 px-4 text-slate-500 font-semibold">{formatDate(item.expense_date)}</td>
                    <td className="py-4 px-4">
                      <span className="bg-blue-50 text-finman-blue border border-blue-200/60 font-bold px-2.5 py-1 rounded-lg text-[11px] inline-block">
                        {item.category_name}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {item.merchant_name || item.description || 'Expense'}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-semibold">{item.payment_mode || 'Manual'}</td>
                    <td className="py-4 px-4 text-right font-black text-rose-600 text-sm">
                      -{formatCurrency(item.amount)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEditExpense(item)} className="p-1.5 hover:bg-blue-100/70 text-slate-400 hover:text-finman-blue rounded-lg transition-colors" title="Edit expense">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteExpense(item.expense_id)} className="p-1.5 hover:bg-rose-100/70 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Delete expense">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredIncome.map((item) => (
                  <tr key={item.income_id} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-4 px-4 text-slate-500 font-semibold">{formatDate(item.income_date)}</td>
                    <td className="py-4 px-4">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold px-2.5 py-1 rounded-lg text-[11px] inline-block">
                        {item.source}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">{item.description || '-'}</td>
                    <td className="py-4 px-4 text-right font-black text-emerald-600 text-sm">
                      +{formatCurrency(item.amount)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEditIncome(item)} className="p-1.5 hover:bg-emerald-100/70 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title="Edit income">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteIncome(item.income_id)} className="p-1.5 hover:bg-rose-100/70 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Delete income">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            <span>{activeCount} visible records</span>
          </div>
          <span>Data source: authenticated PostgreSQL records</span>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit' : 'Add'} {modalMode.includes('expenses') ? 'Expense' : 'Income'}
              </h3>
              <button onClick={closeModal} type="button">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {modalMode.startsWith('choice-') ? (
              <div className="space-y-3 text-xs">
                <p className="font-semibold text-slate-600">How would you like to add this {activeTab === 'expenses' ? 'expense' : 'income'}?</p>
                <button type="button" onClick={selectManualEntry} className="w-full p-4 rounded-xl border border-slate-200 text-left hover:border-finman-blue"><strong>Enter Manually</strong><span className="block text-slate-400 mt-1">Use the existing form.</span></button>
                <label className="block w-full p-4 rounded-xl border border-slate-200 text-left hover:border-finman-blue cursor-pointer"><strong>{activeTab === 'expenses' ? 'Scan Bill' : 'Scan Document'}</strong><span className="block text-slate-400 mt-1">Extract fields for your confirmation.</span><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleScan} disabled={ocrLoading} className="mt-3 block w-full text-xs" /></label>
                {ocrMessage && <p className="text-slate-500">{ocrMessage}</p>}
              </div>
            ) : modalMode === 'expenses' ? (
              <form onSubmit={saveExpense} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Merchant / Recipient</label>
                  <input
                    type="text"
                    value={expenseForm.merchantName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, merchantName: e.target.value })}
                    placeholder="e.g. grocery store, fuel station"
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <select
                      required
                      value={expenseForm.categoryId}
                      onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                    >
                      {categories.map((category) => (
                        <option key={category.category_id} value={category.category_id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={expenseForm.paymentMode}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                    >
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  />
                </div>
                <ModalActions saving={saving} onCancel={closeModal} submitText={editingId ? 'Update Expense' : 'Save Expense'} />
              </form>
            ) : (
              <form onSubmit={saveIncome} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source</label>
                  <select
                    value={incomeForm.source}
                    onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  >
                    {INCOME_SOURCES.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={incomeForm.incomeDate}
                      onChange={(e) => setIncomeForm({ ...incomeForm, incomeDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  />
                </div>
                <ModalActions saving={saving} onCancel={closeModal} submitText={editingId ? 'Update Income' : 'Save Income'} />
              </form>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
};

function ModalActions({ saving, onCancel, submitText }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
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
        {submitText}
      </button>
    </div>
  );
}
