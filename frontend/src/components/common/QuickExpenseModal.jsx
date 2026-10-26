import React, { useEffect, useState } from 'react';
import expenseService from '../../services/expenseService';
import categoryService from '../../services/categoryService';
import { formatCurrency } from '../../utils/formatCurrency';
import { X, Loader2, Zap, RotateCcw, TrendingUp, Check, Calendar } from 'lucide-react';

const PAYMENT_MODES = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'Auto Debit', 'Other'];

// Icon mapping for dynamic category buttons
const CATEGORY_ICONS = {
  food: '🍛',
  dining: '🍽️',
  shopping: '🛍️',
  medical: '💊',
  health: '🏥',
  education: '📚',
  transportation: '🚌',
  travel: '✈️',
  entertainment: '🎬',
  bills: '📄',
  utilities: '💡',
  insurance: '🛡️',
  investments: '📈',
  others: '📦',
  other: '📦',
};

const getCategoryIcon = (categoryName = '') => {
  const lower = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '💳';
};

const todayStr = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

export function QuickExpenseModal({ isOpen, onClose, onSaved }) {
  const [step, setStep] = useState('amount'); // 'amount' | 'category' | 'payment' | 'done'
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expenseDate, setExpenseDate] = useState(todayStr());
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [frequent, setFrequent] = useState([]);
  const [yesterday, setYesterday] = useState([]);
  const [repeatSelected, setRepeatSelected] = useState({});
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'frequent' | 'yesterday'
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoadingData(true);
    setError('');
    Promise.all([
      categoryService.getCategories(),
      expenseService.getFrequentExpenses(),
      expenseService.getYesterdaysExpenses(),
    ])
      .then(([cats, freq, yest]) => {
        const catList = Array.isArray(cats) ? cats : [];
        setCategories(catList);
        setFrequent(Array.isArray(freq) ? freq : []);
        setYesterday(Array.isArray(yest) ? yest : []);
        // If a category was previously chosen but we re-opened, match it
        if (catList.length > 0 && !selectedCategory) {
          const foodCat = catList.find((c) => c.name.toLowerCase().includes('food'));
          if (foodCat) {
            setSelectedCategory({
              categoryId: foodCat.category_id,
              name: foodCat.name,
              icon: getCategoryIcon(foodCat.name),
            });
          }
        }
      })
      .catch((err) => {
        console.error('[QuickExpenseModal] Failed to load metadata:', err);
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [isOpen]);

  const resetForm = () => {
    setStep('amount');
    setAmount('');
    setSelectedCategory(null);
    setExpenseDate(todayStr());
    setPaymentMode('UPI');
    setDescription('');
    setRepeatSelected({});
    setActiveTab('quick');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectCategory = (cat) => {
    if (!cat) return;
    setSelectedCategory({
      categoryId: cat.category_id,
      name: cat.name,
      icon: getCategoryIcon(cat.name),
    });
    setError('');
    setStep('payment');
  };

  const handleFrequentAdd = async (item) => {
    if (!item.category_id) return;
    try {
      setSaving(true);
      await expenseService.createExpense({
        categoryId: item.category_id,
        amount: Number(item.avg_amount),
        expenseDate: todayStr(),
        paymentMode: 'UPI',
        description: item.description,
        sourceType: 'MANUAL',
      });
      window.dispatchEvent(new CustomEvent('finman:expense-updated'));
      onSaved?.();
      handleClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const saveQuickExpense = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive expense amount.');
      setStep('amount');
      return;
    }

    if (!selectedCategory || !selectedCategory.categoryId) {
      setError('Please select a valid expense category.');
      setStep('category');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await expenseService.createExpense({
        categoryId: Number(selectedCategory.categoryId),
        amount: parsedAmount,
        expenseDate: expenseDate || todayStr(),
        paymentMode,
        description: description.trim() || undefined,
        sourceType: 'MANUAL',
      });

      // Dispatch global event so Dashboard, Budgets, and Insights refresh immediately
      window.dispatchEvent(new CustomEvent('finman:expense-updated'));
      onSaved?.();
      setStep('done');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save quick expense.');
    } finally {
      setSaving(false);
    }
  };

  const saveRepeatYesterday = async () => {
    const selected = yesterday.filter((_, i) => repeatSelected[i]);
    if (selected.length === 0) return;
    try {
      setSaving(true);
      await Promise.all(
        selected.map((item) =>
          expenseService.createExpense({
            categoryId: item.category_id,
            amount: Number(item.amount),
            expenseDate: todayStr(),
            paymentMode: item.payment_mode || 'UPI',
            description: item.description,
            sourceType: 'MANUAL',
          })
        )
      );
      window.dispatchEvent(new CustomEvent('finman:expense-updated'));
      onSaved?.();
      handleClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save yesterday expenses.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Quick Expense</h2>
              <p className="text-[10px] text-slate-300">Fast transaction logging</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {[
            { id: 'quick', label: 'Quick Add', icon: <Zap className="w-3.5 h-3.5 text-yellow-500" /> },
            { id: 'frequent', label: `Frequent (${frequent.length})`, icon: <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> },
            { id: 'yesterday', label: `Repeat Yesterday (${yesterday.length})`, icon: <RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'quick') setStep('amount');
              }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-finman-blue border-finman-blue bg-white dark:bg-slate-900 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* QUICK ADD TAB */}
          {activeTab === 'quick' && (
            <>
              {step === 'done' ? (
                <div className="py-6 text-center animate-in fade-in zoom-in-95">
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">Expense Recorded!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    {formatCurrency(Number(amount))} categorized under <strong className="text-slate-700 dark:text-slate-200">{selectedCategory?.name}</strong>.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-finman-blue hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition shadow-sm"
                    >
                      Add Another
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : step === 'amount' ? (
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Enter Amount
                  </p>
                  <div className="relative mb-5">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 dark:text-slate-500 select-none">
                      ₹
                    </span>
                    <input
                      autoFocus
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && amount && Number(amount) > 0) setStep('category');
                      }}
                      className="w-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-4 pl-10 text-3xl font-black outline-none focus:border-finman-blue transition"
                      placeholder="0"
                    />
                  </div>

                  {/* Preset Quick Amount Chips */}
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {[50, 100, 250, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(String(preset))}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                          amount === String(preset)
                            ? 'bg-blue-50 dark:bg-blue-900/40 border-finman-blue text-finman-blue'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (amount && Number(amount) > 0) setStep('category');
                      else setError('Please enter a valid amount.');
                    }}
                    disabled={!amount || Number(amount) <= 0}
                    className="w-full py-3 bg-finman-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow-md disabled:opacity-40 cursor-pointer"
                  >
                    Next: Choose Category →
                  </button>
                </div>
              ) : step === 'category' ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Select Category
                    </p>
                    <span className="text-base font-black text-finman-blue dark:text-sky-400">
                      {formatCurrency(Number(amount))}
                    </span>
                  </div>

                  {loadingData ? (
                    <div className="py-12 flex justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-finman-blue" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 mb-4 max-h-64 overflow-y-auto pr-1">
                      {categories.map((cat) => {
                        const isSelected = selectedCategory?.categoryId === cat.category_id;
                        const icon = getCategoryIcon(cat.name);
                        return (
                          <button
                            key={cat.category_id}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className={`p-3 text-center rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                              isSelected
                                ? 'border-finman-blue bg-blue-50 dark:bg-blue-900/40 text-finman-blue font-black ring-2 ring-blue-500/30'
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:border-finman-blue/60 hover:bg-blue-50/50'
                            }`}
                          >
                            <span className="text-2xl pointer-events-none select-none">{icon}</span>
                            <span className="text-xs font-bold truncate max-w-full pointer-events-none">
                              {cat.name}
                            </span>
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-finman-blue text-white flex items-center justify-center text-[10px]">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStep('amount')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                    >
                      ← Back to Amount
                    </button>
                    {selectedCategory && (
                      <button
                        type="button"
                        onClick={() => setStep('payment')}
                        className="px-4 py-2 bg-finman-blue text-white font-bold text-xs rounded-xl hover:bg-blue-600 transition"
                      >
                        Next: Payment Mode →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* PAYMENT STEP */
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedCategory?.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {selectedCategory?.name}
                        </span>
                        <span className="text-[10px] text-slate-400">Selected Category</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-finman-blue dark:text-sky-400">
                      {formatCurrency(Number(amount))}
                    </span>
                  </div>

                  {/* Payment Mode Selection */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_MODES.map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPaymentMode(pm)}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                            paymentMode === pm
                              ? 'border-finman-blue bg-blue-50 dark:bg-blue-900/40 text-finman-blue dark:text-sky-400 ring-1 ring-blue-500'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Input */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue"
                    />
                  </div>

                  {/* Description Input */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Note / Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Lunch with team, Groceries at DMart"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs outline-none focus:border-finman-blue"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('category')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                    >
                      ← Change Category
                    </button>
                    <button
                      type="button"
                      onClick={saveQuickExpense}
                      disabled={saving}
                      className="px-6 py-2.5 bg-finman-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow-md disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {saving ? 'Recording...' : 'Save Expense'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* FREQUENT EXPENSES TAB */}
          {activeTab === 'frequent' && (
            <div>
              {frequent.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p className="text-xs font-semibold">No frequent expenses identified yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Keep tracking expenses to see your common spends here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {frequent.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {item.description || item.category_name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.category_name} • Avg: {formatCurrency(item.avg_amount)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFrequentAdd(item)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-finman-blue text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REPEAT YESTERDAY TAB */}
          {activeTab === 'yesterday' && (
            <div>
              {yesterday.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p className="text-xs font-semibold">No expenses recorded yesterday.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Yesterday&apos;s logged expenses will show up here to repeat with one click.</p>
                </div>
              ) : (
                <div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
                    {yesterday.map((item, idx) => {
                      const isChecked = Boolean(repeatSelected[idx]);
                      return (
                        <label
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setRepeatSelected({
                                  ...repeatSelected,
                                  [idx]: e.target.checked,
                                })
                              }
                              className="rounded border-slate-300 text-finman-blue focus:ring-finman-blue w-4 h-4"
                            />
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                {item.description || item.category_name}
                              </span>
                              <span className="text-[10px] text-slate-400">{item.category_name}</span>
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-white shrink-0 ml-2">
                            {formatCurrency(item.amount)}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={saveRepeatYesterday}
                    disabled={saving || Object.values(repeatSelected).filter(Boolean).length === 0}
                    className="w-full py-2.5 bg-finman-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Repeat Selected ({Object.values(repeatSelected).filter(Boolean).length})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickExpenseModal;
