import React, { useEffect, useState, useRef } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import bankTransactionService from '../services/bankTransactionService';
import categoryService from '../services/categoryService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  Loader2,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Search,
  X,
  RefreshCw,
  Landmark,
  Layers,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  PlusCircle,
  EyeOff,
  History,
  Trash2,
  Check,
} from 'lucide-react';

export const BankTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Upload workflow modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState(1); // 1 = select file, 2 = column mapping & review
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [reviewedRows, setReviewedRows] = useState([]);
  const [committing, setCommitting] = useState(false);
  const fileInputRef = useRef(null);

  // Reconciliation modal
  const [matchingTx, setMatchingTx] = useState(null);
  const [postingTx, setPostingTx] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Batches history modal
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await bankTransactionService.getTransactions({
        status: statusFilter,
        direction: directionFilter,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });

      setTransactions(data.items || []);
      setTotalCount(data.total || 0);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load bank transactions.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data || []);
      if (data && data.length > 0) {
        setSelectedCategory(data[0].category_id);
      }
    } catch (err) {
      // non-fatal
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, limit, statusFilter, directionFilter, startDate, endDate]);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  // Upload & parse workflow
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleParsePreview = async (mappingOverride = null) => {
    if (!selectedFile) {
      setError('Please choose a CSV or XLSX file to upload.');
      return;
    }

    try {
      setParsing(true);
      setError('');
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (mappingOverride) {
        formData.append('mapping', JSON.stringify(mappingOverride));
      }

      const preview = await bankTransactionService.parsePreview(formData);
      setPreviewData(preview);
      setColumnMapping(preview.mapping || {});

      // Initialize reviewed rows state (excluding duplicates by default if flag is set)
      const initialReviewed = (preview.rows || []).map((row) => ({
        ...row,
        excluded: row.isDuplicate || !row.isValid,
      }));
      setReviewedRows(initialReviewed);
      setUploadStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to parse file.');
    } finally {
      setParsing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!reviewedRows || reviewedRows.length === 0) return;

    try {
      setCommitting(true);
      setError('');

      const validSelected = reviewedRows
        .filter((r) => !r.excluded && r.isValid)
        .map((r) => ({
          transactionDate: r.transactionDate,
          description: r.description,
          amount: r.amount,
          direction: r.direction,
          referenceNo: r.referenceNo,
          sourceAccount: previewData?.filename || null,
        }));

      if (validSelected.length === 0) {
        setError('No transactions selected for import. Check at least one row.');
        setCommitting(false);
        return;
      }

      const ext = selectedFile?.name?.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'CSV';
      const result = await bankTransactionService.commitImport({
        filename: selectedFile?.name || 'Bank_Statement.csv',
        fileFormat: ext,
        transactions: validSelected,
      });

      setSuccess(`Import complete: ${result.importedCount} transactions imported, ${result.skippedCount} skipped.`);
      setShowUploadModal(false);
      resetUploadModal();
      await loadTransactions();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to import transactions.');
    } finally {
      setCommitting(false);
    }
  };

  const resetUploadModal = () => {
    setUploadStep(1);
    setSelectedFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setReviewedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Reconcile and Posting actions
  const openMatchModal = async (tx) => {
    try {
      setActionLoading(true);
      const detailed = await bankTransactionService.getTransaction(tx.bank_tx_id);
      setMatchingTx(detailed);
    } catch (err) {
      setError('Failed to fetch candidate matches.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmMatch = async (candidate) => {
    if (!matchingTx || !candidate) return;

    try {
      setActionLoading(true);
      setError('');

      const payload = {
        expenseId: candidate.match_type === 'EXPENSE' ? candidate.id : undefined,
        incomeId: candidate.match_type === 'INCOME' ? candidate.id : undefined,
        matchNotes: `Reconciled with ${candidate.match_type} #${candidate.id} (${candidate.description})`,
      };

      await bankTransactionService.matchTransaction(matchingTx.bank_tx_id, payload);
      setSuccess('Transaction successfully reconciled and matched.');
      setMatchingTx(null);
      await loadTransactions();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to match transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostToLedger = async () => {
    if (!postingTx) return;

    try {
      setActionLoading(true);
      setError('');

      const payload = {
        categoryId: postingTx.direction === 'DEBIT' ? selectedCategory : undefined,
        description: postingTx.description,
        date: postingTx.transaction_date,
        source: postingTx.direction === 'CREDIT' ? (postingTx.source_account || 'Bank Deposit') : undefined,
      };

      const res = await bankTransactionService.postToLedger(postingTx.bank_tx_id, payload);
      setSuccess(res.message || 'Transaction successfully posted to FinMan ledger.');
      setPostingTx(null);
      await loadTransactions();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to post transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExclude = async (bankTxId) => {
    try {
      setActionLoading(true);
      setError('');
      await bankTransactionService.excludeTransaction(bankTxId);
      setSuccess('Transaction excluded from financial reports.');
      await loadTransactions();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to exclude transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnmatch = async (bankTxId) => {
    try {
      setActionLoading(true);
      setError('');
      await bankTransactionService.unmatchTransaction(bankTxId);
      setSuccess('Transaction unmatched.');
      await loadTransactions();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to unmatch transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (bankTxId) => {
    try {
      setActionLoading(true);
      setError('');
      await bankTransactionService.deleteTransaction(bankTxId);
      setSuccess('Transaction deleted successfully.');
      await loadTransactions();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  const openBatchesHistory = async () => {
    try {
      setLoadingBatches(true);
      setShowBatchesModal(true);
      const data = await bankTransactionService.getBatches();
      setBatches(data || []);
    } catch (err) {
      setError('Failed to load batch history.');
    } finally {
      setLoadingBatches(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PageHeader
          title="Bank Transactions & Reconciliation"
          description="Upload bank statements (CSV/XLSX), detect duplicates, reconcile accounts, and post verified records to your financial ledger."
          icon={Landmark}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openBatchesHistory}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-500" />
                Upload History
              </button>
              <button
                type="button"
                onClick={() => {
                  resetUploadModal();
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-finman-blue text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-blue-600 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Bank Statement
              </button>
            </div>
          }
        />

        {/* Alerts */}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Imported Records
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {summary?.totalTransactions || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across all uploaded statements</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Credits (Deposits)</span>
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary?.totalCredits || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{summary?.creditCount || 0} incoming deposits</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Debits (Outflows)</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(summary?.totalDebits || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{summary?.debitCount || 0} outgoing debits</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Pending Review</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {summary?.pendingReviewCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unmatched bank entries</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Reconciled / Posted</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {(summary?.matchedCount || 0) + (summary?.postedCount || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Matched with FinMan records</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search narration, payee, or reference #..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-finman-blue"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNMATCHED">Pending Review (Unmatched)</option>
              <option value="MATCHED">Matched</option>
              <option value="POSTED">Posted to Ledger</option>
              <option value="EXCLUDED">Excluded</option>
            </select>

            <select
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Types (Debit & Credit)</option>
              <option value="DEBIT">Debits (Outflows)</option>
              <option value="CREDIT">Credits (Deposits)</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
              title="Start Date"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
              title="End Date"
            />
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-finman-blue mb-3" />
            <p className="text-sm font-medium">Loading bank transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-8">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No bank transactions found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Upload a bank statement in CSV or XLSX format to inspect, reconcile, and synchronize your accounts.
            </p>
            <button
              type="button"
              onClick={() => {
                resetUploadModal();
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-finman-blue text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-blue-600"
            >
              <UploadCloud className="w-4 h-4" /> Upload Statement
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Description / Narration</th>
                    <th className="py-3.5 px-4 text-center">Direction</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Reference #</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Reconciliation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {transactions.map((tx) => {
                    const isDebit = tx.direction === 'DEBIT';
                    return (
                      <tr
                        key={tx.bank_tx_id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 dark:text-white truncate" title={tx.description}>
                            {tx.description}
                          </div>
                          {tx.batch_filename && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              Batch: {tx.batch_filename}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isDebit
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {isDebit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {tx.direction}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black">
                          <span className={isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {tx.reference_no || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tx.status === 'POSTED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : tx.status === 'MATCHED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : tx.status === 'EXCLUDED'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tx.status === 'UNMATCHED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openMatchModal(tx)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1"
                                  title="Match to existing manual record"
                                >
                                  <LinkIcon className="w-3 h-3" /> Match
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPostingTx(tx)}
                                  className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1"
                                  title="Post to FinMan income/expense ledger"
                                >
                                  <PlusCircle className="w-3 h-3" /> Post
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExclude(tx.bank_tx_id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  title="Exclude transaction"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {(tx.status === 'MATCHED' || tx.status === 'EXCLUDED') && (
                              <button
                                type="button"
                                onClick={() => handleUnmatch(tx.bank_tx_id)}
                                className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[11px] font-semibold"
                                title="Reset to unmatched status"
                              >
                                Reset
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(tx.bank_tx_id)}
                              className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete record"
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

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {transactions.length} of {totalCount} records (Page {page} of {totalPages})
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Upload Statement (Step 1 & Step 2) */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-finman-blue" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {uploadStep === 1 ? 'Upload Bank Statement' : 'Review & Map Bank Statement'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: File Selection */}
              {uploadStep === 1 && (
                <div className="py-8 space-y-6">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-finman-blue transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-900/30"
                  >
                    <UploadCloud className="w-12 h-12 text-finman-blue mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : 'Choose a CSV or XLSX Bank Statement'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB selected`
                        : 'Drag and drop or click to browse (up to 10MB)'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls, .tsv, .txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Supported Bank Formats:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>HDFC, SBI, ICICI, Axis, Kotak, Chase, Citibank CSV statements</li>
                      <li>Excel Workbooks (.xlsx, .xls) with multi-column transaction ledgers</li>
                      <li>Auto-detects Date, Description, Debit, Credit, and Balance columns</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFile || parsing}
                      onClick={() => handleParsePreview()}
                      className="px-5 py-2 text-xs font-semibold rounded-xl bg-finman-blue text-white hover:bg-blue-600 transition-colors inline-flex items-center gap-2 disabled:opacity-40"
                    >
                      {parsing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Parse & Preview
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Mapping, Preview & Duplicate Review */}
              {uploadStep === 2 && previewData && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-4">
                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-center text-xs shrink-0">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Rows</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{previewData.totalRows}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Valid Rows</div>
                      <div className="font-bold text-emerald-600">{previewData.validRowsCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Duplicates</div>
                      <div className="font-bold text-amber-500">{previewData.duplicateCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Debits Total</div>
                      <div className="font-bold text-rose-500">{formatCurrency(previewData.totalDebits)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Credits Total</div>
                      <div className="font-bold text-emerald-600">{formatCurrency(previewData.totalCredits)}</div>
                    </div>
                  </div>

                  {/* Column Mapping Selectors */}
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs shrink-0">
                    <div className="font-bold text-blue-900 dark:text-blue-300 mb-2">Column Mapping Detected:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Date Column</label>
                        <select
                          value={columnMapping.dateColumn || ''}
                          onChange={(e) => {
                            const updated = { ...columnMapping, dateColumn: e.target.value };
                            setColumnMapping(updated);
                            handleParsePreview(updated);
                          }}
                          className="w-full text-xs p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Description Column</label>
                        <select
                          value={columnMapping.descriptionColumn || ''}
                          onChange={(e) => {
                            const updated = { ...columnMapping, descriptionColumn: e.target.value };
                            setColumnMapping(updated);
                            handleParsePreview(updated);
                          }}
                          className="w-full text-xs p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Debit Column</label>
                        <select
                          value={columnMapping.debitColumn || ''}
                          onChange={(e) => {
                            const updated = { ...columnMapping, debitColumn: e.target.value };
                            setColumnMapping(updated);
                            handleParsePreview(updated);
                          }}
                          className="w-full text-xs p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <option value="">None / Amount Column Used</option>
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Credit Column</label>
                        <select
                          value={columnMapping.creditColumn || ''}
                          onChange={(e) => {
                            const updated = { ...columnMapping, creditColumn: e.target.value };
                            setColumnMapping(updated);
                            handleParsePreview(updated);
                          }}
                          className="w-full text-xs p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <option value="">None / Amount Column Used</option>
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Rows Table */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 font-semibold text-slate-600 dark:text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3 text-center">Import</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-center">Type</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3">Duplicate / Match Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {reviewedRows.map((r, i) => (
                          <tr
                            key={i}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 ${
                              r.excluded ? 'opacity-50 bg-slate-50/50' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!r.excluded && r.isValid}
                                disabled={!r.isValid}
                                onChange={(e) => {
                                  const updated = [...reviewedRows];
                                  updated[i].excluded = !e.target.checked;
                                  setReviewedRows(updated);
                                }}
                                className="rounded text-finman-blue cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">{r.transactionDate || 'Invalid'}</td>
                            <td className="py-2 px-3 truncate max-w-xs">{r.description}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  r.direction === 'DEBIT'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {r.direction}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold">
                              {formatCurrency(r.amount)}
                            </td>
                            <td className="py-2 px-3">
                              {r.isDuplicate ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600" title={r.duplicateReason}>
                                  <AlertTriangle className="w-3 h-3" /> Duplicate Detected
                                </span>
                              ) : r.hasFinmanMatch ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                                  <LinkIcon className="w-3 h-3" /> Match Available
                                </span>
                              ) : r.isValid ? (
                                <span className="text-[10px] text-emerald-600 font-semibold">Ready</span>
                              ) : (
                                <span className="text-[10px] text-rose-600 font-semibold">{r.validationError}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commit Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUploadStep(1)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      Back to File
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = reviewedRows.map((r) => ({
                            ...r,
                            excluded: r.isDuplicate ? true : r.excluded,
                          }));
                          setReviewedRows(updated);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Skip All Duplicates
                      </button>
                      <button
                        type="button"
                        disabled={committing}
                        onClick={handleCommitImport}
                        className="px-5 py-2 text-xs font-semibold rounded-xl bg-finman-blue text-white hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                      >
                        {committing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Commit Selected ({reviewedRows.filter((r) => !r.excluded && r.isValid).length})
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Match with Existing Manual Record */}
        {matchingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-emerald-500" />
                    Reconcile Bank Transaction
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Match with an existing manual expense or income record
                  </p>
                </div>
                <button
                  onClick={() => setMatchingTx(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl my-4 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">{matchingTx.description}</div>
                <div className="flex items-center gap-3 text-slate-400 mt-1">
                  <span>Date: {formatDate(matchingTx.transaction_date)}</span>
                  <span>Amount: {formatCurrency(matchingTx.amount)}</span>
                  <span>{matchingTx.direction}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Suggested Matches ({matchingTx.candidateMatches?.length || 0})
                </div>

                {!matchingTx.candidateMatches || matchingTx.candidateMatches.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No existing FinMan records found matching this date (±3 days) and exact amount. You can click &quot;Post to Ledger&quot; instead to record it directly.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-52 overflow-y-auto">
                    {matchingTx.candidateMatches.map((cand) => (
                      <div key={cand.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {cand.description || cand.source || 'Manual Record'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(cand.date)} • {cand.category_name || cand.match_type}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(cand.amount)}
                          </span>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleConfirmMatch(cand)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700"
                          >
                            Link Match
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMatchingTx(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Post Unmatched Transaction to Ledger */}
        {postingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-blue-500" />
                  Post to FinMan Ledger
                </h3>
                <button
                  onClick={() => setPostingTx(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Description
                  </label>
                  <input
                    type="text"
                    value={postingTx.description}
                    onChange={(e) => setPostingTx({ ...postingTx, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formatCurrency(postingTx.amount)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={postingTx.transaction_date}
                      onChange={(e) => setPostingTx({ ...postingTx, transaction_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {postingTx.direction === 'DEBIT' && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select Expense Category *
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPostingTx(null)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handlePostToLedger}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm & Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Batch Upload History */}
        {showBatchesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-finman-blue" />
                  Bank Statement Upload Batches
                </h3>
                <button
                  onClick={() => setShowBatchesModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4">
                {loadingBatches ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-finman-blue" />
                  </div>
                ) : batches.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">No batches uploaded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                    {batches.map((b) => (
                      <div key={b.batch_id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span>{b.filename}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {b.file_format}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Uploaded on {formatDate(b.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600">{b.imported_count} imported</span>
                          {b.skipped_count > 0 && (
                            <span className="text-slate-400 ml-2">({b.skipped_count} skipped)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBatchesModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BankTransactions;
