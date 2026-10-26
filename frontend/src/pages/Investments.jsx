import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import holdingService from '../services/holdingService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  TrendingUp,
  Edit2,
  X,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

const emptyForm = {
  holdingType: 'MUTUAL_FUND',
  name: '',
  quantity: '1',
  currentValue: '',
  purchaseValue: '',
  purchaseDate: '',
};

export const Investments = () => {
  const [holdings, setHoldings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await holdingService.getHoldings();
      setHoldings(data || []);
      setError('');
    } catch {
      setError('Unable to load investments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalCurrentValue = useMemo(
    () => holdings.reduce((sum, item) => sum + Number(item.current_value || 0), 0),
    [holdings]
  );

  const totalPurchaseValue = useMemo(
    () => holdings.reduce((sum, item) => sum + Number(item.purchase_value || 0), 0),
    [holdings]
  );

  const unrealizedGain = totalCurrentValue - totalPurchaseValue;

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');

      // Normalize purchase date to timezone-safe YYYY-MM-DD
      let normalizedDate = null;
      if (form.purchaseDate && form.purchaseDate.trim()) {
        normalizedDate = form.purchaseDate.trim().slice(0, 10);
      }

      const payload = {
        holdingType: form.holdingType,
        name: form.name.trim(),
        quantity: Number(form.quantity),
        currentValue: Number(form.currentValue),
        purchaseValue: form.purchaseValue === '' ? null : Number(form.purchaseValue),
        purchaseDate: normalizedDate,
      };

      if (editingId) {
        await holdingService.updateHolding(editingId, payload);
        setSuccess('Investment updated successfully.');
      } else {
        await holdingService.createHolding(payload);
        setSuccess('Investment added successfully.');
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save investment.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (holding) => {
    setEditingId(holding.holding_id);
    let dateStr = '';
    if (holding.purchase_date) {
      if (typeof holding.purchase_date === 'string') {
        dateStr = holding.purchase_date.slice(0, 10);
      } else if (holding.purchase_date instanceof Date) {
        dateStr = holding.purchase_date.toISOString().slice(0, 10);
      } else {
        dateStr = String(holding.purchase_date).slice(0, 10);
      }
    }

    setForm({
      holdingType: holding.holding_type,
      name: holding.name,
      quantity: String(holding.quantity),
      currentValue: String(holding.current_value),
      purchaseValue: holding.purchase_value == null ? '' : String(holding.purchase_value),
      purchaseDate: dateStr,
    });
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this investment holding?')) return;
    try {
      await holdingService.deleteHolding(id);
      setSuccess('Investment deleted.');
      setTimeout(() => setSuccess(''), 3000);
      await load();
    } catch {
      setError('Unable to delete investment.');
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Investments & Holdings"
        subtitle="Track asset values, cost basis, and portfolio holdings from PostgreSQL"
        rightElement={
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              } else {
                setEditingId(null);
                setForm(emptyForm);
                setShowForm(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-finman-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {showForm ? 'Close Form' : 'Add Holding'}
          </button>
        }
      />

      {/* Module 2: Compact AI Advisor for Investments */}
      <div className="mb-6">
        <PersonalizedInsights
          pageContext="INVESTMENTS"
          title="FinMan Investment Advisor"
          subtitle="Portfolio allocation, asset diversification, and valuation observations"
        />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Total Current Value
          </p>
          <strong className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(totalCurrentValue)}
          </strong>
          <span className="block text-[11px] text-slate-400 mt-1">
            Across {holdings.length} tracked holding{holdings.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Total Invested Capital
          </p>
          <strong className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(totalPurchaseValue)}
          </strong>
          <span className="block text-[11px] text-slate-400 mt-1">Recorded purchase cost basis</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Unrealized Value Gain
          </p>
          <strong
            className={`text-2xl font-black ${
              unrealizedGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {unrealizedGain >= 0 ? '+' : ''}
            {formatCurrency(unrealizedGain)}
          </strong>
          <span className="block text-[11px] text-slate-400 mt-1">
            Current valuation minus cost basis
          </span>
        </div>
      </div>

      {/* Add / Edit Investment Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in zoom-in-95"
        >
          <div className="md:col-span-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                {editingId ? 'Edit Investment Holding' : 'Add New Investment'}
              </h3>
              <p className="text-xs text-slate-400">
                {editingId ? 'Update valuation or purchase details' : 'Record an asset to reflect in your net worth'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Investment Type *
            </label>
            <select
              value={form.holdingType}
              onChange={(e) => setForm({ ...form, holdingType: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            >
              {[
                { v: 'STOCK', l: 'Stock / Equities' },
                { v: 'MUTUAL_FUND', l: 'Mutual Fund / SIP' },
                { v: 'CRYPTO', l: 'Cryptocurrency' },
                { v: 'REAL_ESTATE', l: 'Real Estate / Property' },
                { v: 'GOLD', l: 'Gold / Silver / Commodities' },
                { v: 'BOND', l: 'Bonds / Fixed Deposit' },
                { v: 'OTHER', l: 'Other Asset' },
              ].map((t) => (
                <option key={t.v} value={t.v}>
                  {t.l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Asset Name *
            </label>
            <input
              required
              placeholder="e.g. Reliance Industries, Nifty 50 Index Fund"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quantity (Units / Shares) *
            </label>
            <input
              required
              type="number"
              min="0.0001"
              step="0.0001"
              placeholder="e.g. 10.5"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Current Total Valuation (₹) *
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50000"
              value={form.currentValue}
              onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Original Purchase Value (₹) (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 45000"
              value={form.purchaseValue}
              onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Purchase Date (Optional)
            </label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-finman-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Saving...' : editingId ? 'Update Holding' : 'Save Investment'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Holdings List */}
      {loading ? (
        <div className="py-24 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-finman-blue" />
        </div>
      ) : holdings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
          <TrendingUp className="mx-auto text-slate-300 dark:text-slate-600 w-12 h-12 mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No investment holdings recorded yet.</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Track your mutual funds, equities, crypto, and assets to measure your net worth accurately.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-finman-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition"
          >
            Record First Holding
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {holdings.map((holding) => {
            const current = Number(holding.current_value || 0);
            const purchase = holding.purchase_value != null ? Number(holding.purchase_value) : null;
            const diff = purchase != null ? current - purchase : null;

            return (
              <div
                key={holding.holding_id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="bg-blue-50 dark:bg-blue-950/60 text-finman-blue dark:text-sky-400 border border-blue-200/60 dark:border-blue-900 font-bold px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">
                      {holding.holding_type.replace('_', ' ')}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => edit(holding)}
                        className="p-1 rounded-lg text-slate-400 hover:text-finman-blue hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit holding"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(holding.holding_id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Delete holding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base truncate">
                    {holding.name}
                  </h3>

                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(current)}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Quantity:</span>
                      <strong className="text-slate-700 dark:text-slate-200">{holding.quantity}</strong>
                    </div>

                    {purchase != null && (
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Invested Cost:</span>
                        <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(purchase)}</strong>
                      </div>
                    )}

                    {diff != null && (
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Net Gain / Loss:</span>
                        <strong className={diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {diff >= 0 ? '+' : ''}
                          {formatCurrency(diff)}
                        </strong>
                      </div>
                    )}

                    {holding.purchase_date && (
                      <div className="flex justify-between text-slate-400 dark:text-slate-500 text-[11px] pt-1">
                        <span>Purchase Date:</span>
                        <span>{formatDate(holding.purchase_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
};

export default Investments;
