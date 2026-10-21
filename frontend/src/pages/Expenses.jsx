import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import expenseService from '../services/expenseService';
import incomeService from '../services/incomeService';
import documentService, { DOCUMENT_UPLOAD_ACCEPT } from '../services/documentService';
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
  Coffee,
  AlertTriangle,
  TrendingDown,
  Wallet,
} from 'lucide-react';

const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other'];
const PAYMENT_MODES = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Auto Debit', 'Other'];

const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function dateForInput(value) {
  if (!value) return todayIso();
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
}

export const Expenses = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyMicroSpending, setOnlyMicroSpending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deficitWarning, setDeficitWarning] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [pendingDocumentScan, setPendingDocumentScan] = useState(null);

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

  useEffect(() => {
    const pendingOcr = location.state?.pendingOcr;
    if (!pendingOcr || categories.length === 0) return;
    setActiveTab('expenses');
    applyExpenseExtraction(pendingOcr);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, categories.length]);

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

  const microSpendingStats = useMemo(() => {
    const microItems = expenses.filter((e) => Number(e.amount || 0) <= 250);
    const total = microItems.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const count = microItems.length;
    const annualDrain = total * 12;
    const pctOfExpenses = totals.totalExpenses > 0 ? Math.round((total / totals.totalExpenses) * 100) : 0;
    return { count, total, annualDrain, pctOfExpenses, items: microItems };
  }, [expenses, totals.totalExpenses]);

  const filteredExpenses = useMemo(() => (
    expenses.filter((item) => {
      const q = searchTerm.toLowerCase();
      const title = `${item.merchant_name || ''} ${item.description || ''} ${item.category_name || ''}`.toLowerCase();
      const matchesSearch = title.includes(q);
      const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
      const matchesMicro = !onlyMicroSpending || Number(item.amount || 0) <= 250;
      return matchesSearch && matchesCategory && matchesMicro;
    })
  ), [expenses, searchTerm, selectedCategory, onlyMicroSpending]);

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

  const [ocrWarning, setOcrWarning] = useState(null);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setSaving(false);
    setOcrLoading(false);
    setOcrMessage('');
    setOcrWarning(null);
    setOcrConfirmed(false);
  };

  const selectManualEntry = () => setModalMode(activeTab);

  const applyExpenseExtraction = (scan) => {
    const { extraction = {}, transaction } = scan || {};
    setExpenseForm((previous) => {
      let catId = previous.categoryId;
      if (extraction.suggestedCategory) {
        const found = categories.find((c) => c.name.toLowerCase() === extraction.suggestedCategory.toLowerCase());
        if (found) catId = String(found.category_id);
      }
      return {
        ...previous,
        categoryId: catId,
        amount: extraction.amount == null ? previous.amount : String(extraction.amount),
        expenseDate: extraction.date || previous.expenseDate,
        merchantName: extraction.merchant || previous.merchantName,
        paymentMode: extraction.paymentMethod || previous.paymentMode || 'UPI',
        description: extraction.description || previous.description || '',
        documentTransactionId: transaction?.document_transaction_id,
        sourceType: 'OCR',
      };
    });
    setPendingDocumentScan(null);
    setModalMode('expenses');

    const numAmount = Number(extraction.amount);
    const isImplausible = isNaN(numAmount) || numAmount <= 0 || numAmount > 100000;
    const isLowConfidence = Boolean(extraction.isLowConfidence || (extraction.confidence != null && extraction.confidence < 0.60));

    if (isLowConfidence || isImplausible) {
      setOcrWarning({
        confidence: extraction.confidence,
        isImplausible,
        message: isImplausible
          ? 'The extracted amount appears implausible or missing. Please verify and confirm before saving.'
          : 'Low-confidence extraction: Please carefully verify the merchant, amount, and items before saving.',
      });
      setOcrConfirmed(false);
      setOcrMessage('');
    } else {
      setOcrWarning(null);
      setOcrConfirmed(true);
      setOcrMessage('Review the extracted fields, correct them if needed, then save.');
    }
  };

  const handleScan = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      setOcrLoading(true);
      setModalMode((currentMode) => currentMode || `choice-${activeTab}`);
      setOcrMessage('Processing document...');
      const result = await documentService.uploadReceipt(file);
      const extraction = result.extraction || {};
      const scan = { extraction, transaction: result.transaction };
      const candidate = extraction.transactionType
        || (extraction.isSalarySlip || extraction.documentType === 'SALARY_SLIP' ? 'INCOME' : 'UNKNOWN');
      if (candidate === 'INCOME') {
        setPendingDocumentScan(scan);
        setModalMode('type-warning');
        setOcrMessage('');
      } else {
        applyExpenseExtraction(scan);
      }
    } catch (err) {
      setOcrMessage(err?.response?.data?.message || 'Could not process this document. Enter the values manually or try again.');
    } finally {
      input.value = '';
      setOcrLoading(false);
    }
  };

  const reviewPendingAsIncome = () => {
    navigate('/income', { state: { pendingOcr: pendingDocumentScan } });
    setPendingDocumentScan(null);
    setModalMode(null);
  };

  const executeSaveExpense = async (force = false) => {
    if (saving) return;
    if (!expenseForm.categoryId || !expenseForm.amount || !expenseForm.expenseDate) return;

    if (expenseForm.sourceType === 'OCR' && ocrWarning && !ocrConfirmed) {
      setError('Please review the extracted values and check the verification box before saving.');
      return;
    }

    const expAmount = Number(expenseForm.amount);
    const expenseYearMonth = expenseForm.expenseDate.slice(0, 7); // 'YYYY-MM'

    if (!force) {
      // Find recorded income for the selected month
      const monthIncome = income
        .filter((i) => (i.income_date || '').startsWith(expenseYearMonth))
        .reduce((acc, i) => acc + Number(i.amount || 0), 0);

      // Find current expenses for the selected month (excluding editing record)
      const existingExpenses = expenses
        .filter((e) => (e.expense_date || '').startsWith(expenseYearMonth) && (!editingId || e.expense_id !== editingId))
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);

      const projectedTotal = existingExpenses + expAmount;

      if (monthIncome > 0 && projectedTotal > monthIncome) {
        setDeficitWarning({
          month: expenseYearMonth,
          monthIncome,
          currentExpenses: existingExpenses,
          newExpense: expAmount,
          projectedTotal,
          projectedDeficit: projectedTotal - monthIncome,
        });
        setModalMode('deficit-warning');
        return;
      }
    }

    const payload = {
      categoryId: Number(expenseForm.categoryId),
      amount: expAmount,
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

  const saveExpense = (event) => {
    event.preventDefault();
    executeSaveExpense(false);
  };

  const saveIncome = async (event) => {
    event.preventDefault();
    if (saving) return;
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
        title="Expense Records"
        subtitle="PostgreSQL-backed expense records, receipt scanning, and budget tracking"
        rightElement={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-finman-blue text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
              {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin text-finman-blue" /> : <Receipt className="w-4 h-4 text-finman-blue" />}
              <span>{ocrLoading ? 'Scanning...' : 'Scan Receipt'}</span>
              <input
                type="file"
                accept={DOCUMENT_UPLOAD_ACCEPT}
                className="hidden"
                onChange={handleScan}
                disabled={ocrLoading}
              />
            </label>
            <button
              onClick={openAddModal}
              disabled={categories.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-finman-blue hover:bg-finman-blueDark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
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

      {/* Micro-Spending Intelligence Card */}
      {activeTab === 'expenses' && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                  Micro-Spending Tracking (≤ ₹250)
                </span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  {microSpendingStats.count} purchases
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Totaled <strong className="text-amber-900">{formatCurrency(microSpendingStats.total)}</strong> ({microSpendingStats.pctOfExpenses}% of expenses) • Annualized drain:{' '}
                <strong className="text-amber-900">{formatCurrency(microSpendingStats.annualDrain)}/yr</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOnlyMicroSpending(!onlyMicroSpending)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              onlyMicroSpending
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{onlyMicroSpending ? 'Showing Only ≤ ₹250' : 'Filter Micro-Purchases (≤ ₹250)'}</span>
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <span className="px-4 py-2 rounded-xl text-xs font-black bg-finman-blue text-white shadow-sm">
            Expenses
          </span>
          <Link
            to="/income"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Income Page →</span>
          </Link>
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
                      <div>-{formatCurrency(item.amount)}</div>
                      {Number(item.amount) <= 250 && (
                        <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded mt-0.5">
                          ≤ ₹250
                        </span>
                      )}
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
                {modalMode === 'deficit-warning'
                  ? 'Spending Deficit Warning'
                  : `${editingId ? 'Edit' : 'Add'} ${modalMode.includes('expenses') ? 'Expense' : 'Income'}`}
              </h3>
              <button onClick={closeModal} type="button">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {modalMode === 'type-warning' && pendingDocumentScan ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                  <strong className="block mb-1">This document appears to be a salary slip, not an expense receipt. Would you like to process it as income instead?</strong>
                  <p>Review it as income, continue with expense entry, or cancel. No income or expense will be recorded until you confirm the reviewed form.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={reviewPendingAsIncome}
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    Review as Income
                  </button>
                  <button
                    type="button"
                    onClick={() => applyExpenseExtraction(pendingDocumentScan)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Continue as Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDocumentScan(null);
                      setModalMode(null);
                      setOcrMessage('');
                    }}
                    className="w-full px-4 py-2 text-slate-500 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : modalMode === 'deficit-warning' && deficitWarning ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-xs mb-1">
                      Projected Monthly Deficit Detected
                    </strong>
                    <p className="text-[11px] leading-relaxed text-rose-800">
                      Recording this expense will cause your spending for{' '}
                      <strong>{deficitWarning.month}</strong> to exceed your total recorded income by{' '}
                      <strong className="text-rose-950 font-black">{formatCurrency(deficitWarning.projectedDeficit)}</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recorded Month Income:</span>
                    <strong className="text-emerald-700">{formatCurrency(deficitWarning.monthIncome)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Month Expenses:</span>
                    <span className="text-slate-700 font-semibold">{formatCurrency(deficitWarning.currentExpenses)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5">
                    <span className="text-slate-500">New Expense Amount:</span>
                    <strong className="text-rose-600">+{formatCurrency(deficitWarning.newExpense)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                    <span className="text-rose-700">Projected Deficit:</span>
                    <span className="text-rose-700 font-black">-{formatCurrency(deficitWarning.projectedDeficit)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      setActiveTab('income');
                      setEditingId(null);
                      setIncomeForm({
                        source: 'Salary',
                        amount: '',
                        incomeDate: todayIso(),
                        description: '',
                      });
                      setModalMode('income');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Add Missing Income Instead</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMode('expenses')}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                  >
                    Go Back & Edit Expense
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => executeSaveExpense(true)}
                    className="w-full py-2 px-3 rounded-xl text-rose-600 hover:bg-rose-50 text-center font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Recording...' : 'Continue & Record Expense Anyway'}
                  </button>
                </div>
              </div>
            ) : modalMode.startsWith('choice-') ? (
              <div className="space-y-3 text-xs">
                <p className="font-semibold text-slate-600">How would you like to add this {activeTab === 'expenses' ? 'expense' : 'income'}?</p>
                <button type="button" onClick={selectManualEntry} className="w-full p-4 rounded-xl border border-slate-200 text-left hover:border-finman-blue"><strong>Enter Manually</strong><span className="block text-slate-400 mt-1">Use the existing form.</span></button>
                <label className="block w-full p-4 rounded-xl border border-slate-200 text-left hover:border-finman-blue cursor-pointer"><strong>Scan or Upload Document</strong><span className="block text-slate-400 mt-1">PNG, JPG/JPEG, or PDF. Review extracted fields before saving.</span><input type="file" accept={DOCUMENT_UPLOAD_ACCEPT} onChange={handleScan} disabled={ocrLoading} className="mt-3 block w-full text-xs" /></label>
                {ocrMessage && <p className="text-slate-500">{ocrMessage}</p>}
              </div>
            ) : modalMode === 'expenses' ? (
              <form onSubmit={saveExpense} className="space-y-4 text-xs">
                {ocrWarning && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs">Review Required: {ocrWarning.message}</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                          Extracted values require verification. Check that the amount, merchant, and details match your receipt.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={ocrConfirmed}
                        onChange={(e) => {
                          setOcrConfirmed(e.target.checked);
                          if (e.target.checked) setError('');
                        }}
                        className="rounded text-finman-blue focus:ring-finman-blue"
                      />
                      <span>I have verified the merchant and amount values</span>
                    </label>
                  </div>
                )}

                {ocrMessage && !ocrWarning && (
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
                    <Receipt className="w-4 h-4 shrink-0 text-finman-blue" />
                    <span>{ocrMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Merchant / Recipient</label>
                  <input
                    type="text"
                    value={expenseForm.merchantName}
                    onChange={(e) => {
                      setExpenseForm({ ...expenseForm, merchantName: e.target.value });
                    }}
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
                      onChange={(e) => {
                        setExpenseForm({ ...expenseForm, amount: e.target.value });
                      }}
                      className={`w-full border ${ocrWarning && !ocrConfirmed ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'} rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium`}
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
                <ModalActions saving={saving} onCancel={closeModal} submitText={expenseForm.sourceType === 'OCR' && ocrWarning && !ocrConfirmed ? 'Confirm & Save Expense' : (editingId ? 'Update Expense' : 'Save Expense')} />
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
