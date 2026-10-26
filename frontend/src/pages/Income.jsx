import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import incomeService from '../services/incomeService';
import documentService, { DOCUMENT_UPLOAD_ACCEPT } from '../services/documentService';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  Filter,
  Loader2,
  AlertCircle,
  TrendingUp,
  Wallet,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';

const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Investment', 'Other'];

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
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const Income = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('form');
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrWarning, setOcrWarning] = useState(null);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);
  const [pendingDocumentScan, setPendingDocumentScan] = useState(null);
  const [salaryDetails, setSalaryDetails] = useState(null);

  const [form, setForm] = useState({
    source: 'Salary',
    amount: '',
    incomeDate: todayIso(),
    description: '',
    sourceType: 'MANUAL',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const rows = await incomeService.getIncome();
      setIncomes(rows || []);
      setError('');
    } catch (err) {
      setError('Unable to load income records. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      source: 'Salary',
      amount: '',
      incomeDate: todayIso(),
      description: '',
    });
    setError('');
    setOcrMessage('');
    setSalaryDetails(null);
    setEntryMode('choice');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.income_id);
    setForm({
      source: item.source || 'Other',
      amount: String(item.amount || ''),
      incomeDate: dateForInput(item.income_date),
      description: item.description || '',
    });
    setError('');
    setEntryMode('form');
    setSalaryDetails(null);
    setOcrMessage('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setSaving(false);
    setOcrLoading(false);
    setEntryMode('form');
    setOcrMessage('');
    setOcrWarning(null);
    setOcrConfirmed(false);
    setSalaryDetails(null);
    setPendingDocumentScan(null);
  };

  const applyIncomeExtraction = (scan) => {
    const { extraction = {} } = scan || {};
    const isSalarySlip = extraction.isSalarySlip
      || extraction.documentType === 'SALARY_SLIP'
      || extraction.suggestedCategory === 'Salary';
    const amount = isSalarySlip
      ? (extraction.netSalary == null ? '' : String(extraction.netSalary))
      : (extraction.amount == null ? null : String(extraction.amount));
    const sourceDescription = isSalarySlip
      ? `Salary${extraction.merchant ? ` from ${extraction.merchant}` : ' from salary slip'}`
      : (extraction.merchant ? `Income from ${extraction.merchant}` : '');

    setForm((previous) => ({
      ...previous,
      source: isSalarySlip ? 'Salary' : (extraction.transactionType === 'INCOME' ? 'Other' : previous.source),
      amount: amount === null ? previous.amount : amount,
      incomeDate: extraction.date || previous.incomeDate,
      description: sourceDescription || previous.description,
      sourceType: 'OCR',
    }));
    setSalaryDetails(isSalarySlip ? {
      grossSalary: extraction.grossSalary,
      deductions: extraction.deductions,
      netSalary: extraction.netSalary,
    } : null);
    setPendingDocumentScan(null);
    setEntryMode('form');

    const numAmount = Number(amount);
    const isImplausible = isNaN(numAmount) || numAmount <= 0;
    const isLowConfidence = Boolean(extraction.isLowConfidence || (extraction.confidence != null && extraction.confidence < 0.60));

    if (isLowConfidence || isImplausible) {
      setOcrWarning({
        confidence: extraction.confidence,
        isImplausible,
        message: isImplausible
          ? 'The extracted income amount appears implausible or missing. Please verify and confirm before saving.'
          : 'Low-confidence extraction: Please carefully verify the employer/payer, amount, and date before saving.',
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
      setOcrMessage('Processing document...');
      const result = await documentService.uploadReceipt(file);
      const scan = { extraction: result.extraction || {}, transaction: result.transaction };
      if (scan.extraction.transactionType === 'EXPENSE') {
        setPendingDocumentScan(scan);
        setEntryMode('type-warning');
        setOcrMessage('');
      } else {
        applyIncomeExtraction(scan);
      }
    } catch (err) {
      setOcrMessage(err?.response?.data?.message || 'Could not process this document. Enter the values manually or try again.');
    } finally {
      input.value = '';
      setOcrLoading(false);
    }
  };

  const reviewPendingAsExpense = () => {
    navigate('/expenses', { state: { pendingOcr: pendingDocumentScan } });
    setPendingDocumentScan(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    const pendingOcr = location.state?.pendingOcr;
    if (!pendingOcr) return;
    setEditingId(null);
    setIsModalOpen(true);
    const candidate = pendingOcr.extraction?.transactionType;
    if (candidate === 'EXPENSE') {
      setPendingDocumentScan(pendingOcr);
      setEntryMode('type-warning');
    } else {
      applyIncomeExtraction(pendingOcr);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.source || !form.amount || !form.incomeDate) {
      setError('Source, amount, and date are required fields.');
      return;
    }

    const numAmount = Number(form.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (form.sourceType === 'OCR' && ocrWarning && !ocrConfirmed) {
      setError('Please review the extracted values and check the verification box before saving.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        source: form.source,
        amount: numAmount,
        incomeDate: form.incomeDate,
        description: form.description.trim() || undefined,
      };

      if (editingId) {
        await incomeService.updateIncome(editingId, payload);
      } else {
        await incomeService.createIncome(payload);
      }

      await loadData();
      closeModal();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save income record. Please check your input.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setSaving(true);
      await incomeService.deleteIncome(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      setError('Failed to delete income record.');
    } finally {
      setSaving(false);
    }
  };

  // Distinct months for filter
  const availableMonths = useMemo(() => {
    const set = new Set();
    incomes.forEach((item) => {
      if (item.income_date) {
        set.add(item.income_date.slice(0, 7)); // 'YYYY-MM'
      }
    });
    return Array.from(set).sort().reverse();
  }, [incomes]);

  // Filtered income list
  const filteredIncomes = useMemo(() => {
    return incomes.filter((item) => {
      const matchSearch =
        searchTerm === '' ||
        (item.source && item.source.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSource = selectedSource === 'All' || item.source === selectedSource;

      const matchMonth =
        selectedMonth === 'All' || (item.income_date && item.income_date.startsWith(selectedMonth));

      return matchSearch && matchSource && matchMonth;
    });
  }, [incomes, searchTerm, selectedSource, selectedMonth]);

  // Metrics
  const totalIncome = useMemo(() => {
    return filteredIncomes.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }, [filteredIncomes]);

  const topSource = useMemo(() => {
    if (!filteredIncomes.length) return '—';
    const sourceMap = {};
    filteredIncomes.forEach((i) => {
      sourceMap[i.source] = (sourceMap[i.source] || 0) + Number(i.amount || 0);
    });
    const sorted = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${formatCurrency(sorted[0][1])})` : '—';
  }, [filteredIncomes]);

  return (
    <MainLayout>
      <PageHeader
        title="Income Records"
        subtitle="Track salary, freelance contracts, and recurring revenue streams"
        rightElement={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
              {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Receipt className="w-4 h-4 text-emerald-600" />}
              <span>{ocrLoading ? 'Scanning...' : 'Scan Document'}</span>
              <input
                type="file"
                accept={DOCUMENT_UPLOAD_ACCEPT}
                className="hidden"
                onChange={handleScan}
                disabled={ocrLoading}
              />
            </label>
            <button
              id="add-income-main-btn"
              onClick={openAddModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Income</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/50 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards — Matching 4-card alignment and styling of Expenses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard
          title="Total Income"
          amount={totalIncome}
          indicator={`${filteredIncomes.length} records recorded`}
          icon={ArrowUpRight}
          type="income"
        />
        <SummaryCard
          title="Average Entry"
          amount={filteredIncomes.length ? Math.round(totalIncome / filteredIncomes.length) : 0}
          indicator="Mean inflow per record"
          icon={TrendingUp}
          type="teal"
        />
        <SummaryCard
          title="Top Source"
          amount={topSource}
          isCount={true}
          indicator="Highest revenue category"
          icon={Layers}
          type="blue"
        />
        <SummaryCard
          title="Income Records"
          amount={filteredIncomes.length}
          isCount={true}
          indicator="Matching filters"
          icon={Wallet}
          type="orange"
        />
      </div>

      {/* FinMan Income Advisor */}
      <PersonalizedInsights
        pageContext="INCOME"
        title="FinMan Income Advisor"
        subtitle="Insights on income stability, source concentration, and profile alignment"
        className="mb-8"
      />

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search source or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Sources</option>
              {INCOME_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Income Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
            <span className="text-xs font-medium">Loading income history...</span>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No income entries found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchTerm || selectedSource !== 'All' || selectedMonth !== 'All'
                ? 'Try adjusting your filters or search keywords.'
                : 'Start tracking your earnings by clicking the Add Income button above.'}
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Income
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-6 font-bold">Source</th>
                  <th className="py-3.5 px-4 font-bold">Date</th>
                  <th className="py-3.5 px-4 font-bold">Description</th>
                  <th className="py-3.5 px-6 font-bold text-right">Amount</th>
                  <th className="py-3.5 px-6 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredIncomes.map((item) => (
                  <tr key={item.income_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {item.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(item.income_date)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {item.description || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      +{formatCurrency(item.amount)}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Income"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.income_id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Delete Income"
                        >
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
      </div>

      {/* Add / Edit Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                {editingId ? 'Edit Income Entry' : 'Add New Income'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {entryMode === 'choice' ? (
              <div className="space-y-3 pt-4 text-xs">
                <p className="font-semibold text-slate-600 dark:text-slate-300">How would you like to add this income?</p>
                <button
                  type="button"
                  onClick={() => setEntryMode('form')}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-emerald-500"
                >
                  <strong>Enter Manually</strong>
                  <span className="block text-slate-400 mt-1">Open the income entry form.</span>
                </button>
                <label className="block w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-emerald-500 cursor-pointer">
                  <strong>{ocrLoading ? 'Scanning document...' : 'Scan or Upload Document'}</strong>
                  <span className="block text-slate-400 mt-1">PNG, JPG/JPEG, or PDF. Review extracted fields before saving.</span>
                  <input
                    type="file"
                    accept={DOCUMENT_UPLOAD_ACCEPT}
                    onChange={handleScan}
                    disabled={ocrLoading}
                    className="mt-3 block w-full text-xs"
                  />
                </label>
                {ocrMessage && <p role="status" className="text-rose-600">{ocrMessage}</p>}
              </div>
            ) : entryMode === 'type-warning' && pendingDocumentScan ? (
              <div className="space-y-4 pt-4 text-xs">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                  <strong className="block mb-1">This document appears to be an expense receipt, not an income document.</strong>
                  <p>Review it as an expense, continue with income entry, or cancel. No financial record has been saved.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={reviewPendingAsExpense}
                    className="w-full px-4 py-2.5 rounded-xl bg-finman-blue text-white font-bold hover:bg-finman-blueDark"
                  >
                    Review as Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => applyIncomeExtraction(pendingDocumentScan)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Continue as Income
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              {ocrMessage && <p role="status" className="rounded-lg bg-blue-50 p-3 text-blue-800">{ocrMessage}</p>}
              {ocrWarning && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{ocrWarning.message}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-amber-900 dark:text-amber-100">
                    <input
                      type="checkbox"
                      checked={ocrConfirmed}
                      onChange={(e) => setOcrConfirmed(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span>I have verified the income details and confirm they are correct</span>
                  </label>
                </div>
              )}
              {/* Source */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Income Source *
                </label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                >
                  {INCOME_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={salaryDetails ? 'Enter the take-home/net amount' : 'e.g. 50000'}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 font-bold"
                  required
                />
                {salaryDetails && (
                  <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-[11px] text-emerald-900">
                    <p className="font-bold">Salary slip amounts found — record one income amount only.</p>
                    {salaryDetails.grossSalary != null && <p>Gross pay: {formatCurrency(salaryDetails.grossSalary)}</p>}
                    {salaryDetails.deductions != null && <p>Deductions: {formatCurrency(salaryDetails.deductions)}</p>}
                    {salaryDetails.netSalary != null
                      ? <p>Net/take-home pay: {formatCurrency(salaryDetails.netSalary)}</p>
                      : <p>Net pay was not identified. Enter the amount you want to record.</p>}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Income Date *
                </label>
                <input
                  type="date"
                  value={form.incomeDate}
                  onChange={(e) => setForm({ ...form, incomeDate: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Monthly salary from Tech Corp"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Income'
                  )}
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">Delete Income Entry?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              This action cannot be undone. Your dashboard totals and cash flow will update immediately.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Keep Record
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Income;
