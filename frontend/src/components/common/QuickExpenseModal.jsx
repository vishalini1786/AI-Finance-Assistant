import React, { useEffect, useState } from 'react';
import expenseService from '../../services/expenseService';
import categoryService from '../../services/categoryService';
import { formatCurrency } from '../../utils/formatCurrency';
import { X, Loader2, Zap, RotateCcw, TrendingUp, Check } from 'lucide-react';

const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'Net Banking', 'Auto Debit', 'Other'];

// Quick category chips – loaded from DB but fall back to these defaults
const DEFAULT_QUICK_CATS = [
  { label: 'Food', icon: '🍛' },
  { label: 'Tea/Coffee', icon: '☕' },
  { label: 'Fuel', icon: '⛽' },
  { label: 'Travel', icon: '🚌' },
  { label: 'Medical', icon: '💊' },
  { label: 'Shopping', icon: '🛍️' },
  { label: 'Entertainment', icon: '🎬' },
  { label: 'Bills', icon: '📄' },
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * QuickExpenseModal — 1–2 minute expense entry.
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onSaved: () => void   — called after successful save
 */
export function QuickExpenseModal({ isOpen, onClose, onSaved }) {
  const [step, setStep] = useState('amount'); // 'amount' | 'category' | 'payment' | 'done'
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [frequent, setFrequent] = useState([]);
  const [yesterday, setYesterday] = useState([]);
  const [repeatSelected, setRepeatSelected] = useState({});
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'frequent' | 'yesterday'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      categoryService.getCategories(),
      expenseService.getFrequentExpenses(),
      expenseService.getYesterdaysExpenses(),
    ]).then(([cats, freq, yest]) => {
      setCategories(cats || []);
      setFrequent(freq || []);
      setYesterday(yest || []);
    }).catch(() => {});
  }, [isOpen]);

  const resetForm = () => {
    setStep('amount');
    setAmount('');
    setSelectedCategory(null);
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

  // Find DB category by label name
  const findCatByName = (name) => categories.find(c => c.name.toLowerCase().includes(name.toLowerCase())) || null;

  const handleQuickCategorySelect = (label) => {
    const dbCat = findCatByName(label);
    setSelectedCategory({ label, categoryId: dbCat?.category_id, name: dbCat?.name || label });
    setStep('payment');
  };

  const handleFrequentAdd = async (item) => {
    if (!item.category_id) return;
    try {
      setSaving(true);
      await expenseService.createExpense({
        categoryId: item.category_id,
        amount: item.avg_amount,
        expenseDate: todayStr(),
        paymentMode: 'UPI',
        description: item.description,
        sourceType: 'MANUAL',
      });
      onSaved?.();
      handleClose();
    } catch (e) {
      setError('Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const saveQuickExpense = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!selectedCategory?.categoryId) {
      setError('Please select a valid category.');
      return;
    }
    try {
      setSaving(true);
      await expenseService.createExpense({
        categoryId: selectedCategory.categoryId,
        amount: Number(amount),
        expenseDate: todayStr(),
        paymentMode,
        description,
        sourceType: 'MANUAL',
      });
      setStep('done');
    } catch (e) {
      setError('Failed to save expense.');
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
        selected.map(e =>
          expenseService.createExpense({
            categoryId: e.category_id,
            amount: Number(e.amount),
            expenseDate: todayStr(),
            paymentMode: e.payment_mode || 'MANUAL',
            description: e.description,
            sourceType: 'MANUAL',
          })
        )
      );
      onSaved?.();
      handleClose();
    } catch (e) {
      setError('Failed to save expenses.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-base">Quick Expense</span>
          </div>
          <button onClick={handleClose} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100">
          {[
            { id: 'quick', label: 'Quick Add', icon: <Zap className="w-3.5 h-3.5" /> },
            { id: 'frequent', label: `Frequent (${frequent.length})`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'yesterday', label: `Repeat Yesterday (${yesterday.length})`, icon: <RotateCcw className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'quick') setStep('amount'); }}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${activeTab === tab.id ? 'text-finman-blue border-b-2 border-finman-blue' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">{error}</div>
          )}

          {/* QUICK ADD TAB */}
          {activeTab === 'quick' && (
            <>
              {step === 'done' ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-base font-bold text-slate-900 mb-1">Expense Saved!</p>
                  <p className="text-sm text-slate-500 mb-4">₹{Number(amount).toFixed(2)} added to {selectedCategory?.name}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={resetForm} className="px-4 py-2 bg-finman-blue text-white text-sm font-bold rounded-lg hover:bg-finman-blueDark">Add Another</button>
                    <button onClick={() => { onSaved?.(); handleClose(); }} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200">Done</button>
                  </div>
                </div>
              ) : step === 'amount' ? (
                <>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Enter Amount</p>
                  <div className="relative mb-5">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">₹</span>
                    <input
                      autoFocus
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && amount) setStep('category'); }}
                      className="w-full border-2 border-slate-200 rounded-xl p-4 pl-10 text-3xl font-black outline-none focus:border-finman-blue text-slate-900"
                      placeholder="0"
                    />
                  </div>
                  <button
                    onClick={() => { if (amount && Number(amount) > 0) setStep('category'); }}
                    disabled={!amount || Number(amount) <= 0}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    Choose Category →
                  </button>
                </>
              ) : step === 'category' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Category</p>
                    <span className="text-lg font-black text-finman-blue">₹{amount}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {DEFAULT_QUICK_CATS.map(qc => (
                      <button
                        key={qc.label}
                        onClick={() => handleQuickCategorySelect(qc.label)}
                        className="p-3 text-center rounded-xl border-2 border-slate-100 hover:border-finman-blue hover:bg-blue-50 transition-all text-sm font-bold text-slate-700 flex flex-col items-center gap-1"
                      >
                        <span className="text-xl">{qc.icon}</span>
                        <span className="text-xs">{qc.label}</span>
                      </button>
                    ))}
                  </div>
                  {/* DB categories overflow */}
                  <select
                    onChange={e => {
                      const cat = categories.find(c => String(c.category_id) === e.target.value);
                      if (cat) {
                        setSelectedCategory({ label: cat.name, categoryId: cat.category_id, name: cat.name });
                        setStep('payment');
                      }
                    }}
                    defaultValue=""
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-finman-blue"
                  >
                    <option value="" disabled>Or choose from all categories...</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => setStep('amount')} className="mt-3 text-xs text-slate-400 hover:text-slate-600 font-medium">← Back</button>
                </>
              ) : step === 'payment' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Mode</p>
                    <div className="flex gap-1 text-sm">
                      <span className="font-black text-finman-blue">₹{amount}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-600">{selectedCategory?.name}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {PAYMENT_MODES.map(pm => (
                      <button
                        key={pm}
                        onClick={() => setPaymentMode(pm)}
                        className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${paymentMode === pm ? 'border-finman-blue bg-blue-50 text-finman-blue' : 'border-slate-100 text-slate-600 hover:border-slate-300'}`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-finman-blue mb-4"
                  />
                  <button
                    onClick={saveQuickExpense}
                    disabled={saving}
                    className="w-full py-3 bg-finman-blue text-white font-bold rounded-xl hover:bg-finman-blueDark disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add Expense ✓
                  </button>
                  <button onClick={() => setStep('category')} className="mt-3 text-xs text-slate-400 hover:text-slate-600 font-medium block">← Back</button>
                </>
              ) : null}
            </>
          )}

          {/* FREQUENT TAB */}
          {activeTab === 'frequent' && (
            <div>
              {frequent.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 italic">No frequent expenses yet. Record expenses regularly to see suggestions here.</p>
              ) : (
                <div className="space-y-2">
                  {frequent.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.description || item.category_name}</p>
                        <p className="text-xs text-slate-500">{item.category_name} · {item.occurrence_count}x in 30 days</p>
                      </div>
                      <button
                        onClick={() => handleFrequentAdd(item)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-finman-blue text-white text-xs font-bold rounded-lg hover:bg-finman-blueDark disabled:opacity-50"
                      >
                        +₹{Number(item.avg_amount).toFixed(0)}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* YESTERDAY TAB */}
          {activeTab === 'yesterday' && (
            <div>
              {yesterday.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 italic">No expenses recorded yesterday.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 font-medium mb-3">Select expenses to repeat today:</p>
                  <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                    {yesterday.map((e, i) => (
                      <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${repeatSelected[i] ? 'border-finman-blue bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                        <input
                          type="checkbox"
                          checked={!!repeatSelected[i]}
                          onChange={ev => setRepeatSelected(prev => ({ ...prev, [i]: ev.target.checked }))}
                          className="w-4 h-4 accent-finman-blue"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{e.category_name}</p>
                          <p className="text-xs text-slate-500">{e.description || e.payment_mode || 'Manual'}</p>
                        </div>
                        <span className="font-bold text-sm text-slate-800">{formatCurrency(e.amount)}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={saveRepeatYesterday}
                    disabled={saving || Object.values(repeatSelected).filter(Boolean).length === 0}
                    className="w-full py-3 bg-finman-blue text-white font-bold rounded-xl hover:bg-finman-blueDark disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add {Object.values(repeatSelected).filter(Boolean).length} Selected for Today
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
