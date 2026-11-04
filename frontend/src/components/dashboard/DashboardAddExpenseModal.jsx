import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import categoryService from '../../services/categoryService';
import expenseService from '../../services/expenseService';
import dashboardService from '../../services/dashboardService';

const PAYMENT_MODES = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'Auto Debit', 'Other'];

const getTodayString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

export const DashboardAddExpenseModal = ({ isOpen, onClose, onExpenseCreated }) => {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    amount: '',
    categoryId: '',
    expenseDate: getTodayString(),
    paymentMode: 'UPI',
    merchantName: '',
    description: '',
  });

  const [predicting, setPredicting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [mlUnavailable, setMlUnavailable] = useState(false);
  const [userOverrodeCategory, setUserOverrodeCategory] = useState(false);

  // Load categories
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoadingCategories(true);
    categoryService
      .getCategories()
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setCategories(list);
        if (list.length > 0 && !form.categoryId) {
          setForm((prev) => ({ ...prev, categoryId: String(list[0].category_id) }));
        }
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
      })
      .finally(() => {
        if (mounted) setLoadingCategories(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Debounced ML Category Prediction
  useEffect(() => {
    if (!isOpen) return;
    const text = `${form.merchantName || ''} ${form.description || ''}`.trim();
    if (text.length < 2) {
      setAiSuggestion(null);
      setMlUnavailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPredicting(true);
        setMlUnavailable(false);
        const res = await dashboardService.predictCategory({
          description: form.description || form.merchantName,
          merchant: form.merchantName || form.description,
          amount: Number(form.amount) || 0,
          paymentMode: form.paymentMode || 'UPI',
        });

        if (res && res.available === false) {
          setMlUnavailable(true);
          setAiSuggestion(null);
          return;
        }

        const predictedName = res?.category || res?.prediction?.category;
        const confidence = typeof res?.confidence === 'number' ? res.confidence : res?.prediction?.confidence;

        if (predictedName && categories.length > 0) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === predictedName.toLowerCase()
          );
          if (match) {
            setAiSuggestion({
              name: match.name,
              categoryId: match.category_id,
              confidence: confidence,
              modelName: res?.model_name || 'TF-IDF + Logistic Regression',
            });
            setMlUnavailable(false);

            // Auto-select if the user hasn't explicitly chosen another category
            if (!userOverrodeCategory) {
              setForm((prev) => ({ ...prev, categoryId: String(match.category_id) }));
            }
          }
        }
      } catch (err) {
        setMlUnavailable(true);
        setAiSuggestion(null);
      } finally {
        setPredicting(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [form.merchantName, form.description, isOpen, categories, userOverrodeCategory]);

  const resetForm = () => {
    setForm({
      amount: '',
      categoryId: categories.length > 0 ? String(categories[0].category_id) : '',
      expenseDate: getTodayString(),
      paymentMode: 'UPI',
      merchantName: '',
      description: '',
    });
    setAiSuggestion(null);
    setMlUnavailable(false);
    setUserOverrodeCategory(false);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = Number(form.amount);
    if (!form.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid expense amount.');
      return;
    }

    if (!form.categoryId) {
      setError('Please select an expense category.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await expenseService.createExpense({
        categoryId: Number(form.categoryId),
        amount: parsedAmount,
        expenseDate: form.expenseDate,
        paymentMode: form.paymentMode,
        merchantName: form.merchantName.trim() || undefined,
        description: form.description.trim() || undefined,
        sourceType: 'MANUAL',
      });

      // Dispatch event to update other components
      window.dispatchEvent(new CustomEvent('finman:expense-updated'));
      onExpenseCreated?.();
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-finman-blue/30 border border-finman-blue/50 flex items-center justify-center">
              <Plus className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Add Personal Expense</h2>
              <p className="text-[10px] text-slate-300">Live Machine Learning Category Classification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Merchant & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Merchant / Payee
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Apollo Pharmacy, Swiggy, Uber"
                value={form.merchantName}
                onChange={(e) => setForm({ ...form, merchantName: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Medicine purchase, Dinner"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue font-medium"
              />
            </div>
          </div>

          {/* AI SUGGESTED CATEGORY SECTION */}
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-finman-blue dark:text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  AI Suggested Category
                </span>
              </div>
              {aiSuggestion && typeof aiSuggestion.confidence === 'number' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {(aiSuggestion.confidence * 100).toFixed(1)}% Confidence
                </span>
              )}
            </div>

            {predicting ? (
              <div className="flex items-center gap-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-finman-blue" />
                <span>Predicting category with trained Scikit-learn model...</span>
              </div>
            ) : mlUnavailable ? (
              <div className="flex items-start gap-2 py-1 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">ML suggestion service is temporarily unavailable.</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    You can proceed by choosing a category manually below.
                  </p>
                </div>
              </div>
            ) : aiSuggestion ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/30 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Predicted Category:</span>
                    <span className="text-sm font-extrabold text-finman-blue dark:text-sky-400">
                      {aiSuggestion.name}
                    </span>
                  </div>

                  {String(form.categoryId) === String(aiSuggestion.categoryId) ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                      <Check className="w-3.5 h-3.5" />
                      <span>Category Selected</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, categoryId: String(aiSuggestion.categoryId) }));
                        setUserOverrodeCategory(false);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-finman-blue hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Suggestion</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    Currently selected:{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {categories.find((c) => String(c.category_id) === String(form.categoryId))?.name || 'None'}
                    </strong>
                    {String(form.categoryId) !== String(aiSuggestion.categoryId) && ' (Manual override)'}
                  </span>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">
                    TF-IDF + Logistic Regression
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-400 py-1">
                Type a merchant (e.g. &ldquo;Apollo Pharmacy&rdquo;, &ldquo;Uber&rdquo;, &ldquo;Swiggy&rdquo;) or note to see AI category suggestion.
              </p>
            )}
          </div>

          {/* Amount and Category Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue font-bold"
              />
            </div>

            <div>
              <label htmlFor="dashboard-expense-category-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                id="dashboard-expense-category-select"
                required
                value={form.categoryId}
                onChange={(e) => {
                  setUserOverrodeCategory(true);
                  setForm({ ...form, categoryId: e.target.value });
                }}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue font-medium"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id} className="bg-white dark:bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode *
              </label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue font-medium"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode} className="bg-white dark:bg-slate-900">
                    {mode}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-finman-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow-md disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Recording...' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
