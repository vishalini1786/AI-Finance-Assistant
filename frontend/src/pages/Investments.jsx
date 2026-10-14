import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import holdingService from '../services/holdingService';
import { formatCurrency } from '../utils/formatCurrency';
import { Loader2, Plus, Trash2, AlertCircle, TrendingUp, Edit2 } from 'lucide-react';

const emptyForm = { holdingType: 'MUTUAL_FUND', name: '', quantity: '1', currentValue: '', purchaseValue: '', purchaseDate: '' };
export const Investments = () => {
  const [holdings, setHoldings] = useState([]); const [form, setForm] = useState(emptyForm); const [showForm, setShowForm] = useState(false); const [editingId, setEditingId] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const load = async () => { try { setLoading(true); setHoldings(await holdingService.getHoldings()); setError(''); } catch { setError('Unable to load investments.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const total = useMemo(() => holdings.reduce((sum, item) => sum + Number(item.current_value || 0), 0), [holdings]);
  const submit = async (event) => { event.preventDefault(); try { setSaving(true); const payload = { ...form, quantity: Number(form.quantity), currentValue: Number(form.currentValue), purchaseValue: form.purchaseValue === '' ? null : Number(form.purchaseValue) }; if (editingId) await holdingService.updateHolding(editingId, payload); else await holdingService.createHolding(payload); setForm(emptyForm); setEditingId(null); setShowForm(false); await load(); } catch (err) { setError(err?.response?.data?.message || 'Unable to save investment.'); } finally { setSaving(false); } };
  const edit = (holding) => { setEditingId(holding.holding_id); setForm({ holdingType: holding.holding_type, name: holding.name, quantity: String(holding.quantity), currentValue: String(holding.current_value), purchaseValue: holding.purchase_value == null ? '' : String(holding.purchase_value), purchaseDate: holding.purchase_date || '' }); setShowForm(true); };
  const remove = async (id) => { if (!window.confirm('Delete this investment holding?')) return; try { await holdingService.deleteHolding(id); await load(); } catch { setError('Unable to delete investment.'); } };
  return <MainLayout><PageHeader title="Investments" subtitle="Authenticated holdings from financial_holdings" rightElement={<button onClick={() => setShowForm((value) => !value)} className="flex items-center gap-2 px-4 py-2 bg-finman-blue text-white rounded-lg text-xs font-bold"><Plus className="w-4 h-4" /> Add Holding</button>} />
    {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle className="inline w-4 h-4 mr-2" />{error}</div>}
    <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6"><p className="text-xs text-slate-500">Total current value</p><strong className="text-2xl text-slate-900">{formatCurrency(total)}</strong></div>
    {showForm && <form onSubmit={submit} className="mb-6 bg-white p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Investment Type</label>
        <select value={form.holdingType} onChange={(e) => setForm({ ...form, holdingType: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm w-full outline-none focus:border-finman-blue">
          {[{v:'STOCK', l:'Stock / Equities'},{v:'MUTUAL_FUND', l:'Mutual Fund / SIP'},{v:'CRYPTO', l:'Cryptocurrency'},{v:'REAL_ESTATE', l:'Real Estate / Property'},{v:'GOLD', l:'Gold / Silver'},{v:'BOND', l:'Bonds / FD'},{v:'OTHER', l:'Other Investment'}].map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">What did you invest in?</label>
        <input required placeholder="e.g. Reliance Shares, HDFC Mutual Fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm w-full outline-none focus:border-finman-blue" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Quantity (Units / Shares)</label>
        <input required type="number" min="0.0001" step="0.0001" placeholder="e.g. 10.5" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm w-full outline-none focus:border-finman-blue" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Current Value (Total)</label>
        <input required type="number" min="0" step="0.01" placeholder="e.g. 50000" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm w-full outline-none focus:border-finman-blue" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Value (Optional)</label>
        <input type="number" min="0" step="0.01" placeholder="e.g. 45000" value={form.purchaseValue} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm w-full outline-none focus:border-finman-blue" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date (Optional)</label>
        <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm w-full outline-none focus:border-finman-blue" />
      </div>
      <button disabled={saving} className="md:col-span-2 justify-self-end px-6 py-2.5 bg-finman-blue hover:bg-finman-blueDark text-white rounded-xl text-xs font-bold mt-2 shadow-md hover:shadow-blue-500/20 transition-all">{saving ? 'Saving...' : editingId ? 'Update Holding' : 'Save Investment'}</button>
    </form>}
    {loading ? <div className="py-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : holdings.length === 0 ? <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center"><TrendingUp className="mx-auto text-slate-300 w-10 h-10 mb-3" /><p className="text-sm font-semibold text-slate-500">No investments yet.</p><p className="text-xs text-slate-400 mt-1">Record your holdings to track your net worth.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{holdings.map((holding) => <div key={holding.holding_id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex justify-between"><div><span className="bg-blue-50 text-finman-blue border border-blue-200/60 font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider">{holding.holding_type.replace('_', ' ')}</span><h2 className="font-bold text-slate-900 mt-3 text-lg">{holding.name}</h2></div><div className="flex gap-2"><button onClick={() => edit(holding)} className="text-slate-400 hover:text-finman-blue"><Edit2 className="w-4 h-4" /></button><button onClick={() => remove(holding.holding_id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></div><p className="mt-4 text-3xl font-black text-slate-900">{formatCurrency(holding.current_value)}</p><p className="text-xs font-bold text-slate-500 mt-2">Quantity: {holding.quantity} {holding.purchase_value ? `· Invested: ${formatCurrency(holding.purchase_value)}` : ''}</p></div>)}</div>}
  </MainLayout>;
};
