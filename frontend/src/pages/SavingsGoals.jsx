import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import goalService from '../services/goalService';
import { formatCurrency } from '../utils/formatCurrency';
import { Loader2, Plus, Trash2, AlertCircle, Target, Edit2 } from 'lucide-react';

const emptyForm = { goalName: '', targetAmount: '', currentAmount: '0', targetDate: '', status: 'IN_PROGRESS' };

export const SavingsGoals = () => {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try { setLoading(true); setGoals(await goalService.getGoals()); setError(''); }
    catch { setError('Unable to load savings goals.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, targetAmount: Number(form.targetAmount), currentAmount: Number(form.currentAmount) };
      if (editingId) await goalService.updateGoal(editingId, payload);
      else await goalService.createGoal(payload);
      setForm(emptyForm); setEditingId(null); setShowForm(false); await load();
    } catch (err) { setError(err?.response?.data?.message || 'Unable to save savings goal.'); }
    finally { setSaving(false); }
  };

  const edit = (goal) => {
    setEditingId(goal.goal_id);
    setForm({ goalName: goal.goal_name, targetAmount: String(goal.target_amount), currentAmount: String(goal.current_amount), targetDate: goal.target_date || '', status: goal.status });
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try { await goalService.deleteGoal(id); await load(); } catch { setError('Unable to delete savings goal.'); }
  };

  return <MainLayout><PageHeader title="Savings & Goals" subtitle="Track real savings goals and progress from PostgreSQL" rightElement={<button onClick={() => setShowForm((value) => !value)} className="flex items-center gap-2 px-4 py-2 bg-finman-blue text-white rounded-lg text-xs font-bold"><Plus className="w-4 h-4" /> Add Goal</button>} />
    {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle className="inline w-4 h-4 mr-2" />{error}</div>}
    {showForm && <form onSubmit={submit} className="mb-6 bg-white p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4"><input required placeholder="Goal name" value={form.goalName} onChange={(e) => setForm({ ...form, goalName: e.target.value })} className="border rounded-lg p-2.5 text-sm" /><input required type="number" min="0.01" step="0.01" placeholder="Target amount" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} className="border rounded-lg p-2.5 text-sm" /><input type="number" min="0" step="0.01" placeholder="Current saved amount" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} className="border rounded-lg p-2.5 text-sm" /><input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className="border rounded-lg p-2.5 text-sm" /><button disabled={saving} className="md:col-span-2 justify-self-end px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">{saving ? 'Saving...' : editingId ? 'Update Goal' : 'Save Goal'}</button></form>}
    {loading ? <div className="py-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : goals.length === 0 ? <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center"><Target className="mx-auto text-slate-300 mb-3" /><p className="text-sm font-semibold text-slate-500">No savings goals yet.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{goals.map((goal) => <div key={goal.goal_id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex justify-between"><h2 className="font-bold text-slate-900">{goal.goal_name}</h2><div className="flex gap-2"><button onClick={() => edit(goal)} className="text-slate-400 hover:text-finman-blue"><Edit2 className="w-4 h-4" /></button><button onClick={() => remove(goal.goal_id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></div><div className="flex justify-between mt-5 text-sm"><span>Saved {formatCurrency(goal.current_amount)}</span><span>Target {formatCurrency(goal.target_amount)}</span></div><div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${goal.progress_percent}%` }} /></div><div className="flex justify-between mt-3 text-xs text-slate-500"><span>{goal.progress_percent}% complete</span><span>{formatCurrency(goal.remaining_amount)} remaining</span></div>{goal.target_date && <p className="mt-3 text-xs text-slate-400">Target date: {new Date(goal.target_date).toLocaleDateString()}</p>}</div>)}</div>}
  </MainLayout>;
};
