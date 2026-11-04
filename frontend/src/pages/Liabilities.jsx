import React, { useEffect, useMemo, useState } from 'react';
import {
  MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import liabilityService from '../services/liabilityService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  CreditCard,
  Edit2,
  X,
  Calendar,
  CheckCircle2,
  DollarSign,
  History,
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  Archive,
  RefreshCw,
  Calculator,
  Info,
} from 'lucide-react';

const LIABILITY_TYPES = [
  { value: 'HOME_LOAN', label: 'Home Loan' },
  { value: 'VEHICLE_LOAN', label: 'Vehicle Loan' },
  { value: 'EDUCATION_LOAN', label: 'Education Loan' },
  { value: 'PERSONAL_LOAN', label: 'Personal Loan' },
  { value: 'CREDIT_CARD', label: 'Credit Card Outstanding' },
  { value: 'BNPL', label: 'Buy Now, Pay Later' },
  { value: 'OTHER', label: 'Other Debt' },
];

const FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'ONE_TIME', label: 'One Time' },
];

const CALCULATION_METHODS = [
  { value: 'REDUCING_BALANCE', label: 'Reducing Balance (Standard)' },
  { value: 'FLAT_RATE', label: 'Flat Rate' },
  { value: 'ZERO_INTEREST', label: 'Zero-Interest (0% APR)' },
  { value: 'DAILY_REDUCING', label: 'Daily Reducing Balance' },
];

const REPAYMENT_METHODS = [
  { value: 'AUTO_DEBIT', label: 'Auto-Debit / ECS' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / UPI' },
  { value: 'CHEQUE', label: 'Post-dated Cheque' },
  { value: 'CASH', label: 'Cash / Manual' },
];

const emptyForm = {
  name: '',
  liabilityType: 'PERSONAL_LOAN',
  lender: '',
  totalAmount: '',
  remainingAmount: '',
  interestRate: '',
  emiAmount: '',
  paymentFrequency: 'MONTHLY',
  interestCalculationMethod: 'REDUCING_BALANCE',
  repaymentMethod: 'AUTO_DEBIT',
  firstPaymentDate: '',
  startDate: '',
  dueDate: '',
  tenureMonths: '',
  status: 'ACTIVE',
  notes: '',
};

const emptyPaymentForm = {
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMode: 'BANK_TRANSFER',
  notes: '',
};

export const Liabilities = () => {
  const [liabilities, setLiabilities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [paymentLiability, setPaymentLiability] = useState(null);
  const [paymentData, setPaymentData] = useState(emptyPaymentForm);
  const [repaymentCalc, setRepaymentCalc] = useState(null);
  const [calculatingRepayment, setCalculatingRepayment] = useState(false);

  const [detailLiability, setDetailLiability] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const liveEstimatedEmi = useMemo(() => {
    const p = Number(formData.remainingAmount || formData.totalAmount);
    const r = Number(formData.interestRate);
    const n = Number(formData.tenureMonths);
    const method = formData.interestCalculationMethod;
    if (!p || p <= 0 || !n || n <= 0) return null;
    if (method === 'ZERO_INTEREST' || r <= 0) {
      return Math.round((p / n) * 100) / 100;
    }
    if (method === 'FLAT_RATE') {
      const totalInterest = p * (r / 100) * (n / 12);
      return Math.round(((p + totalInterest) / n) * 100) / 100;
    }
    const monthlyRate = r / (12 * 100);
    const factor = Math.pow(1 + monthlyRate, n);
    if (!isFinite(factor) || factor <= 1) return Math.round((p / n) * 100) / 100;
    const emi = (p * monthlyRate * factor) / (factor - 1);
    return Math.round(emi * 100) / 100;
  }, [formData.totalAmount, formData.remainingAmount, formData.interestRate, formData.tenureMonths, formData.interestCalculationMethod]);

  const fetchRepaymentCalculation = async (liabilityId, amount, paymentDate) => {
    if (!liabilityId || !amount || Number(amount) <= 0) {
      setRepaymentCalc(null);
      return;
    }
    try {
      setCalculatingRepayment(true);
      const res = await liabilityService.calculateRepayment(liabilityId, {
        amount,
        paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
      });
      setRepaymentCalc(res?.breakdown || null);
    } catch (err) {
      console.warn('Dynamic repayment calculation notice:', err?.message || err);
    } finally {
      setCalculatingRepayment(false);
    }
  };

  const currentBreakdown = useMemo(() => {
    if (repaymentCalc) return repaymentCalc;
    if (!paymentLiability || !paymentData.amount || Number(paymentData.amount) <= 0) return null;
    const p = Number(paymentLiability.remaining_amount) || 0;
    const r = Number(paymentLiability.interest_rate) || 0;
    const amt = Number(paymentData.amount) || 0;
    const method = paymentLiability.interest_calculation_method || 'REDUCING_BALANCE';
    if (method === 'ZERO_INTEREST' || r <= 0) {
      const princ = Math.min(amt, p);
      return {
        interestPortion: 0,
        principalPortion: Math.round(princ * 100) / 100,
        remainingPrincipalAfterPayment: Math.round(Math.max(0, p - princ) * 100) / 100,
        daysElapsed: 30,
        explanation: 'Zero-interest loan: 100% of repayment applies directly to reduce principal.',
      };
    }
    const approxInterest = Math.round((p * (r / (12 * 100))) * 100) / 100;
    const intPortion = Math.min(amt, approxInterest);
    const princPortion = Math.min(amt - intPortion, p);
    return {
      interestPortion: intPortion,
      principalPortion: Math.round(princPortion * 100) / 100,
      remainingPrincipalAfterPayment: Math.round(Math.max(0, p - princPortion) * 100) / 100,
      daysElapsed: 30,
      explanation: `Calculated monthly interest on ${formatCurrency(p)} at ${r}% p.a.`,
    };
  }, [repaymentCalc, paymentLiability, paymentData.amount]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await liabilityService.getLiabilities({
        search,
        liabilityType: typeFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      setLiabilities(data.liabilities || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load liabilities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowAddEditModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.liability_id);
    setFormData({
      name: item.name || '',
      liabilityType: item.liability_type || 'PERSONAL_LOAN',
      lender: item.lender || '',
      totalAmount: String(item.total_amount || ''),
      remainingAmount: String(item.remaining_amount || ''),
      interestRate: item.interest_rate !== null ? String(item.interest_rate) : '',
      emiAmount: item.emi_amount ? String(item.emi_amount) : '',
      paymentFrequency: item.payment_frequency || 'MONTHLY',
      interestCalculationMethod: item.interest_calculation_method || 'REDUCING_BALANCE',
      repaymentMethod: item.repayment_method || 'AUTO_DEBIT',
      firstPaymentDate: item.first_payment_date ? item.first_payment_date.slice(0, 10) : '',
      startDate: item.start_date || '',
      dueDate: item.due_date || '',
      tenureMonths: item.tenure_months ? String(item.tenure_months) : '',
      status: item.status || 'ACTIVE',
      notes: item.notes || '',
    });
    setShowAddEditModal(true);
  };

  const handleSaveLiability = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');

      const totalNum = Number(formData.totalAmount);
      const remainingNum = formData.remainingAmount !== '' ? Number(formData.remainingAmount) : totalNum;

      if (remainingNum > totalNum) {
        setError('Outstanding balance cannot exceed original principal amount.');
        setSaving(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        liabilityType: formData.liabilityType,
        lender: formData.lender.trim() || null,
        totalAmount: totalNum,
        remainingAmount: remainingNum,
        interestRate: formData.interestRate !== '' ? Number(formData.interestRate) : 0,
        emiAmount: formData.emiAmount !== '' ? Number(formData.emiAmount) : null,
        paymentFrequency: formData.paymentFrequency,
        interestCalculationMethod: formData.interestCalculationMethod || 'REDUCING_BALANCE',
        repaymentMethod: formData.repaymentMethod || 'AUTO_DEBIT',
        firstPaymentDate: formData.firstPaymentDate || null,
        startDate: formData.startDate || null,
        dueDate: formData.dueDate || null,
        tenureMonths: formData.tenureMonths !== '' ? Number(formData.tenureMonths) : null,
        status: formData.status,
        notes: formData.notes.trim() || null,
      };

      if (editingId) {
        await liabilityService.updateLiability(editingId, payload);
        setSuccess('Liability updated successfully.');
      } else {
        await liabilityService.createLiability(payload);
        setSuccess('Liability added successfully.');
      }

      setShowAddEditModal(false);
      setFormData(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save liability.');
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (item) => {
    setPaymentLiability(item);
    const defaultAmount = item.emi_amount ? String(item.emi_amount) : String(item.remaining_amount || '');
    const today = new Date().toISOString().slice(0, 10);
    setPaymentData({
      amount: defaultAmount,
      paymentDate: today,
      paymentMode: item.repayment_method || 'BANK_TRANSFER',
      notes: '',
    });
    fetchRepaymentCalculation(item.liability_id, defaultAmount, today);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentLiability) return;

    try {
      setSaving(true);
      setError('');

      const pAmount = Number(paymentData.amount);
      if (isNaN(pAmount) || pAmount <= 0) {
        setError('Payment amount must be greater than zero.');
        setSaving(false);
        return;
      }

      const payload = {
        amount: pAmount,
        paymentDate: paymentData.paymentDate || null,
        paymentMode: paymentData.paymentMode || 'BANK_TRANSFER',
        notes: paymentData.notes.trim() || null,
      };

      const result = await liabilityService.recordPayment(paymentLiability.liability_id, payload);
      const b = result?.breakdown;
      setSuccess(`Payment of ${formatCurrency(pAmount)} recorded successfully. Principal: ${formatCurrency(b?.principalPortion ?? 0)}, Interest: ${formatCurrency(b?.interestPortion ?? 0)}.`);
      setPaymentLiability(null);
      setRepaymentCalc(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (liabilityId) => {
    try {
      setLoadingDetails(true);
      const details = await liabilityService.getLiability(liabilityId);
      setDetailLiability(details);
    } catch (err) {
      setError('Unable to load liability repayment details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDelete = async (liabilityId) => {
    try {
      setSaving(true);
      setError('');
      await liabilityService.deleteLiability(liabilityId);
      setSuccess('Liability removed successfully.');
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete liability.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (liabilityId) => {
    try {
      setSaving(true);
      setError('');
      await liabilityService.archiveLiability(liabilityId);
      setSuccess('Liability archived.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to archive liability.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PageHeader
          title="Liabilities & Loans"
          subtitle="Manage loans, mortgages, credit card debt, and repayment schedules with verified accounting precision."
          icon={CreditCard}
          rightElement={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-finman-blue text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-blue-600 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Liability
              </button>
            </div>
          }
        />

        {/* Personalized AI Advisor */}
        <PersonalizedInsights pageContext="ASSETS_LIABILITIES" />

        {/* Feedback Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-start justify-between text-rose-700 dark:text-rose-400 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start justify-between text-emerald-700 dark:text-emerald-400 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Outstanding Debt</span>
              <CreditCard className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(summary?.totalLiabilities || 0)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              From {summary?.activeCount || 0} active debt obligations
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Monthly EMI Commitments</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(summary?.totalMonthlyEmi || 0)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Normalized monthly payment burden
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Upcoming Due Date</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            {summary?.upcomingPayment ? (
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {formatCurrency(summary.upcomingPayment.amount)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                  Due {formatDate(summary.upcomingPayment.dueDate)} • {summary.upcomingPayment.name}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-lg font-semibold text-slate-400 dark:text-slate-500">None Scheduled</div>
                <p className="text-xs text-slate-400 mt-1">All scheduled dues cleared</p>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Total Repaid to Date</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary?.totalRepaid || 0)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Principal: {formatCurrency(summary?.totalPrincipalRepaid || 0)}
            </p>
          </div>
        </div>

        {/* Filters, Search, and Sort Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by loan name or lender..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-finman-blue dark:text-white"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ACTIVE">Active Obligations</option>
              <option value="PAID_OFF">Paid Off</option>
              <option value="ARCHIVED">Archived</option>
              <option value="ALL">All Statuses</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Liability Types</option>
              {LIABILITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="due_date">Due Date</option>
              <option value="remaining_amount">Outstanding Balance</option>
              <option value="total_amount">Original Principal</option>
              <option value="interest_rate">Interest Rate</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={`Sort ${sortOrder === 'ASC' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Liabilities Table / Cards */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-finman-blue mb-3" />
            <p className="text-sm font-medium">Loading verified debt records...</p>
          </div>
        ) : liabilities.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-8">
            <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No liabilities found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              {statusFilter === 'ACTIVE'
                ? "You have zero active debt obligations recorded. Click below to add a loan or liability."
                : 'No liabilities match the selected search or filter criteria.'}
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-finman-blue text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" /> Add Liability
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Liability / Lender</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4 text-right">Original Principal</th>
                    <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3.5 px-4 text-center">Interest</th>
                    <th className="py-3.5 px-4 text-right">EMI / Commitments</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {liabilities.map((item) => {
                    const progress = item.progress_percentage || 0;
                    const isPaidOff = item.status === 'PAID_OFF' || item.remaining_amount <= 0;
                    return (
                      <tr
                        key={item.liability_id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{item.name}</span>
                          </div>
                          {item.lender && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              <span>{item.lender}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {LIABILITY_TYPES.find((t) => t.value === item.liability_type)?.label || item.liability_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                          {formatCurrency(item.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className={`font-bold ${isPaidOff ? 'text-emerald-500' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(item.remaining_amount)}
                          </div>
                          <div className="w-24 ml-auto mt-1.5 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{progress}% repaid</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.interest_rate > 0 ? `${item.interest_rate}%` : '0%'}
                          </div>
                          <div className="text-[9px] text-slate-400 capitalize">
                            {item.interest_calculation_method ? item.interest_calculation_method.toLowerCase().replace('_', ' ') : 'reducing'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.emi_amount > 0 ? formatCurrency(item.emi_amount) : '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 lowercase">
                            {item.payment_frequency}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.due_date ? (
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                              {formatDate(item.due_date)}
                            </div>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.status === 'PAID_OFF'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : item.status === 'ARCHIVED'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaidOff && (
                              <button
                                type="button"
                                onClick={() => openPaymentModal(item)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title="Record Repayment"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openDetails(item.liability_id)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              title="Repayment History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {item.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleArchive(item.liability_id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Archive"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.liability_id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Liability */}
        {showAddEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-finman-blue" />
                  {editingId ? 'Edit Liability' : 'Add New Liability'}
                </h3>
                <button
                  onClick={() => setShowAddEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveLiability} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Liability Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Home Loan, Chase Sapphire"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-finman-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Liability Type *
                    </label>
                    <select
                      value={formData.liabilityType}
                      onChange={(e) => setFormData({ ...formData, liabilityType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      {LIABILITY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lender / Financial Institution
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India, ICICI"
                      value={formData.lender}
                      onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-finman-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PAID_OFF">Paid Off</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Original Principal Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 2500000"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-finman-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Outstanding Balance (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Defaults to principal amount"
                      value={formData.remainingAmount}
                      onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-finman-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Interest Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      disabled={formData.interestCalculationMethod === 'ZERO_INTEREST'}
                      placeholder={formData.interestCalculationMethod === 'ZERO_INTEREST' ? '0% (Zero Interest)' : 'e.g. 8.5'}
                      value={formData.interestCalculationMethod === 'ZERO_INTEREST' ? '0' : formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-finman-blue disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Calculation Method
                    </label>
                    <select
                      value={formData.interestCalculationMethod}
                      onChange={(e) => {
                        const m = e.target.value;
                        setFormData({
                          ...formData,
                          interestCalculationMethod: m,
                          interestRate: m === 'ZERO_INTEREST' ? '0' : formData.interestRate,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      {CALCULATION_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Frequency
                    </label>
                    <select
                      value={formData.paymentFrequency}
                      onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        EMI Amount (₹)
                      </label>
                      {liveEstimatedEmi && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, emiAmount: String(liveEstimatedEmi) })}
                          className="text-[10px] text-finman-blue font-semibold hover:underline"
                        >
                          Use Calc: {formatCurrency(liveEstimatedEmi)}
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={liveEstimatedEmi ? `Calculated: ${liveEstimatedEmi}` : 'e.g. 21500'}
                      value={formData.emiAmount}
                      onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-finman-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Repayment Method
                    </label>
                    <select
                      value={formData.repaymentMethod}
                      onChange={(e) => setFormData({ ...formData, repaymentMethod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      {REPAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {liveEstimatedEmi && (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                      <Calculator className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>
                        Live Estimated EMI: <strong className="font-bold">{formatCurrency(liveEstimatedEmi)}</strong> / month ({formData.interestCalculationMethod === 'ZERO_INTEREST' ? '0% APR' : `${formData.interestRate || 0}% reducing balance`})
                      </span>
                    </div>
                    {formData.emiAmount !== String(liveEstimatedEmi) && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, emiAmount: String(liveEstimatedEmi) })}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Apply EMI
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Loan Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      First Payment Date
                    </label>
                    <input
                      type="date"
                      value={formData.firstPaymentDate}
                      onChange={(e) => setFormData({ ...formData, firstPaymentDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Next Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tenure (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 240"
                      value={formData.tenureMonths}
                      onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Account number, branch details, or terms..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAddEditModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-finman-blue text-white hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingId ? 'Update Liability' : 'Create Liability'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Repayment */}
        {paymentLiability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Record Repayment
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {paymentLiability.name} • Outstanding: <span className="font-semibold text-rose-500">{formatCurrency(paymentLiability.remaining_amount)}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPaymentLiability(null);
                    setRepaymentCalc(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="space-y-4 mt-4">
                {/* User Input: Total Payment Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Payment Amount (₹) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={paymentData.amount}
                      onChange={(e) => {
                        const newAmt = e.target.value;
                        setPaymentData((prev) => ({ ...prev, amount: newAmt }));
                        fetchRepaymentCalculation(paymentLiability.liability_id, newAmt, paymentData.paymentDate);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-hidden focus:border-finman-blue"
                    />
                    {calculatingRepayment && (
                      <Loader2 className="w-4 h-4 text-finman-blue animate-spin absolute right-3 top-3" />
                    )}
                  </div>
                </div>

                {/* Automatic Computed Breakdown Cards */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Automatic Financial Breakdown</span>
                    <span className="text-[10px] lowercase font-normal text-slate-400">
                      {paymentLiability.interest_calculation_method?.toLowerCase()?.replace('_', ' ') || 'reducing balance'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                      <div className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                        Principal Portion (Debt Reduction)
                      </div>
                      <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(currentBreakdown?.principalPortion ?? 0)}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                        Reduces outstanding loan balance
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                      <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                        Interest Portion (Financing Cost)
                      </div>
                      <div className="text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                        {formatCurrency(currentBreakdown?.interestPortion ?? 0)}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                        Logged as personal expense once
                      </div>
                    </div>
                  </div>

                  {/* Projected Remaining Balance */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Projected Outstanding Balance:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatCurrency(currentBreakdown?.remainingPrincipalAfterPayment ?? paymentLiability.remaining_amount)}
                    </span>
                  </div>

                  {/* Explanation Note */}
                  {currentBreakdown?.explanation && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>{currentBreakdown.explanation}</span>
                    </div>
                  )}

                  {/* Payoff Alert */}
                  {currentBreakdown && Number(currentBreakdown.remainingPrincipalAfterPayment) <= 0 && Number(paymentData.amount) > 0 && (
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>This payment will completely settle and close this loan!</span>
                    </div>
                  )}

                  {/* Underpayment Warning */}
                  {currentBreakdown && Number(currentBreakdown.principalPortion) <= 0 && Number(paymentData.amount) > 0 && (
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Payment is less than accrued interest. Principal will not decrease.</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentData.paymentDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setPaymentData((prev) => ({ ...prev, paymentDate: newDate }));
                        fetchRepaymentCalculation(paymentLiability.liability_id, paymentData.amount, newDate);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentData.paymentMode}
                      onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer / UPI</option>
                      <option value="AUTO_DEBIT">Auto-Debit / ECS</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Transaction reference or receipt note"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentLiability(null);
                      setRepaymentCalc(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !paymentData.amount || Number(paymentData.amount) <= 0}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Details & Payment History */}
        {detailLiability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {detailLiability.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {detailLiability.lender || 'Independent Loan'} • {detailLiability.liability_type}
                  </p>
                </div>
                <button
                  onClick={() => setDetailLiability(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center shrink-0">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Principal</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(detailLiability.total_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</div>
                  <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(detailLiability.remaining_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Repaid</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {detailLiability.progress_percentage}%
                  </div>
                </div>
              </div>

              <div className="mb-3 px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1 shrink-0">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Interest Calculation:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {detailLiability.interest_rate > 0 ? `${detailLiability.interest_rate}% p.a.` : '0%'} ({detailLiability.interest_calculation_method || 'REDUCING_BALANCE'})
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Repayment Mode / Frequency:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {detailLiability.repayment_method || 'AUTO_DEBIT'} • {detailLiability.payment_frequency}
                  </span>
                </div>
                {detailLiability.first_payment_date && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400">First Payment Date:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(detailLiability.first_payment_date)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Repayment History ({detailLiability.payments?.length || 0})
                </h4>

                {!detailLiability.payments || detailLiability.payments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No repayments recorded yet for this liability.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {detailLiability.payments.map((p) => (
                      <div key={p.payment_id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(p.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(p.payment_date)} • {p.payment_mode}
                            {p.notes ? ` • ${p.notes}` : ''}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          <div>Principal: {formatCurrency(p.principal_amount)}</div>
                          <div className="text-[10px] text-slate-400">Interest: {formatCurrency(p.interest_amount)}</div>
                          {p.remaining_principal !== null && p.remaining_principal !== undefined && (
                            <div className="text-[10px] text-slate-400 font-medium">Balance: {formatCurrency(p.remaining_principal)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailLiability(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Delete */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Delete Liability?
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                This will permanently remove this liability record and its associated repayment history.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Liabilities;
