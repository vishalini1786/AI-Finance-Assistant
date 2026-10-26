import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import goalService from '../services/goalService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  Target,
  Edit2,
  PiggyBank,
  CheckCircle2,
  X,
  History,
  Calendar,
} from 'lucide-react';

const emptyForm = {
  goalName: '',
  targetAmount: '',
  currentAmount: '0',
  targetDate: '',
  status: 'IN_PROGRESS',
};

export const SavingsGoals = () => {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Contribution Dialog State
  const [activeGoalForContrib, setActiveGoalForContrib] = useState(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribDate, setContribDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [contribNote, setContribNote] = useState('');
  const [contribSubmitting, setContribSubmitting] = useState(false);
  const [contribError, setContribError] = useState('');

  // History Drawer State
  const [historyGoal, setHistoryGoal] = useState(null);
  const [contributionsList, setContributionsList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setGoals(await goalService.getGoals());
      setError('');
    } catch {
      setError('Unable to load savings goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        goalName: form.goalName,
        targetAmount: Number(form.targetAmount),
        targetDate: form.targetDate || null,
        status: form.status,
      };
      // Only set initial currentAmount when creating a new goal.
      // When editing existing goal details, preserve accumulated savings!
      if (!editingId) {
        payload.currentAmount = Number(form.currentAmount || 0);
      }
      if (editingId) await goalService.updateGoal(editingId, payload);
      else await goalService.createGoal(payload);
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      setSuccess(editingId ? 'Goal updated successfully' : 'New goal created successfully');
      setTimeout(() => setSuccess(''), 4000);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save savings goal.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (goal) => {
    setEditingId(goal.goal_id);
    setForm({
      goalName: goal.goal_name,
      targetAmount: String(goal.target_amount),
      currentAmount: String(goal.current_amount),
      targetDate: goal.target_date || '',
      status: goal.status,
    });
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await goalService.deleteGoal(id);
      setSuccess('Savings goal deleted.');
      setTimeout(() => setSuccess(''), 3000);
      await load();
    } catch {
      setError('Unable to delete savings goal.');
    }
  };

  // Open Contribution Dialog
  const openContributionDialog = (goal) => {
    setActiveGoalForContrib(goal);
    setContribAmount('');
    setContribDate(new Date().toISOString().slice(0, 10));
    setContribNote('');
    setContribError('');
  };

  const closeContributionDialog = () => {
    setActiveGoalForContrib(null);
    setContribAmount('');
    setContribError('');
  };

  const handleRecordContribution = async (e) => {
    e.preventDefault();
    const parsed = Number(contribAmount);
    if (!parsed || isNaN(parsed) || parsed <= 0) {
      setContribError('Please enter a valid positive contribution amount.');
      return;
    }

    try {
      setContribSubmitting(true);
      setContribError('');
      const res = await goalService.recordContribution(activeGoalForContrib.goal_id, {
        amount: parsed,
        contributionDate: contribDate,
        note: contribNote.trim() || undefined,
      });

      setSuccess(`✅ Added ${formatCurrency(parsed)} to "${activeGoalForContrib.goal_name}"!`);
      setTimeout(() => setSuccess(''), 4000);
      closeContributionDialog();
      await load();
    } catch (err) {
      setContribError(err?.response?.data?.message || 'Failed to record contribution.');
    } finally {
      setContribSubmitting(false);
    }
  };

  // View Contribution History
  const openHistory = async (goal) => {
    setHistoryGoal(goal);
    setHistoryLoading(true);
    try {
      const list = await goalService.getContributions(goal.goal_id);
      setContributionsList(list || []);
    } catch (err) {
      setContributionsList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Savings & Goals"
        subtitle="Track real savings goals, record contributions, and measure progress from PostgreSQL"
        rightElement={
          <button
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
            <Plus className="w-4 h-4" /> {showForm ? 'Close Form' : 'Add Goal'}
          </button>
        }
      />

      {/* Module 8A: Personalized Savings Goals Insights */}
      <div className="mb-6">
        <PersonalizedInsights
          pageContext="SAVINGS_GOALS"
          title="FinMan Savings Advisor"
          subtitle="Required contribution calculations and timeline feasibility based on your cash flow"
        />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Goal Add / Edit Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-800 dark:text-white">
              {editingId ? 'Edit Savings Goal' : 'Create a New Savings Goal'}
            </h3>
            <p className="text-xs text-slate-400">
              {editingId ? 'Update target parameters or timeline' : 'Set a clear milestone for your personal savings'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              What are you saving for?
            </label>
            <input
              required
              placeholder="e.g. New Car, Vacation, Emergency Fund"
              value={form.goalName}
              onChange={(e) => setForm({ ...form, goalName: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Target Amount (₹)
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 500000"
              value={form.targetAmount}
              onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {editingId ? 'Current Saved Balance (₹)' : 'Initial Saved Balance (₹)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50000"
              disabled={Boolean(editingId)}
              value={form.currentAmount}
              onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              className={`border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue ${
                editingId ? 'opacity-70 bg-slate-50 dark:bg-slate-900 cursor-not-allowed' : ''
              }`}
            />
            {editingId && (
              <p className="text-[10px] text-slate-400 mt-1">
                Saved amount is maintained via recorded contributions.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Target Date (Optional)
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-2.5 text-xs w-full outline-none focus:border-finman-blue"
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
              disabled={saving}
              type="submit"
              className="px-6 py-2.5 bg-finman-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving...' : editingId ? 'Update Goal' : 'Save Goal'}
            </button>
          </div>
        </form>
      )}

      {/* Goals Cards Grid */}
      {loading ? (
        <div className="py-24 flex justify-center text-slate-400">
          <Loader2 className="animate-spin w-8 h-8 text-finman-blue" />
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
          <Target className="mx-auto text-slate-300 dark:text-slate-700 w-12 h-12 mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No savings goals yet.</p>
          <p className="text-xs text-slate-400 mt-1">Define your financial targets and record contributions as you save.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const isCompleted = goal.progress_percent >= 100;
            return (
              <div
                key={goal.goal_id}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between"
              >
                {isCompleted && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow-xs">
                    Goal Achieved! 🎉
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start gap-3">
                    <h2 className="font-extrabold text-slate-900 dark:text-white text-lg pr-12 truncate">
                      {goal.goal_name}
                    </h2>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openHistory(goal)}
                        title="View Contribution History"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => edit(goal)}
                        title="Edit Goal Target"
                        className="p-1.5 text-slate-400 hover:text-finman-blue transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(goal.goal_id)}
                        title="Delete Goal"
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline mt-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className={isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''}>
                      Saved: {formatCurrency(goal.current_amount)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Target: {formatCurrency(goal.target_amount)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full mt-2.5 overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-700 ease-out ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-finman-blue to-indigo-500'
                      }`}
                      style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className={isCompleted ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                      {goal.progress_percent}% complete
                    </span>
                    {!isCompleted ? (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        {formatCurrency(goal.remaining_amount)} remaining
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatCurrency(goal.current_amount - goal.target_amount)} surplus!
                      </span>
                    )}
                  </div>

                  {goal.target_date && (
                    <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Target date: <strong>{formatDate(goal.target_date)}</strong></span>
                    </p>
                  )}
                </div>

                {/* Primary Dedicated "Add Savings" Action Button */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openContributionDialog(goal)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-extrabold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition shadow-2xs cursor-pointer"
                  >
                    <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Add Savings / Record Contribution</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Contribution Modal Dialog (Module 6.2) */}
      {activeGoalForContrib && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Record Contribution</h3>
                  <p className="text-[11px] text-slate-400">Add saved money to this goal</p>
                </div>
              </div>
              <button
                onClick={closeContributionDialog}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordContribution} className="mt-4 space-y-4 text-xs">
              {contribError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{contribError}</span>
                </div>
              )}

              {/* Goal Balance Status Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Goal:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeGoalForContrib.goal_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Current Saved:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(activeGoalForContrib.current_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Target Amount:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(activeGoalForContrib.target_amount)}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contribution Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="e.g. 5000"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Live Math Calculation Preview */}
              {Number(contribAmount) > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] space-y-1">
                  <div className="flex justify-between font-bold text-emerald-900 dark:text-emerald-200">
                    <span>New Saved Balance:</span>
                    <span>
                      {formatCurrency(Number(activeGoalForContrib.current_amount) + Number(contribAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                    <span>New Progress:</span>
                    <span>
                      {Math.min(
                        100,
                        Math.round(
                          ((Number(activeGoalForContrib.current_amount) + Number(contribAmount)) /
                            Number(activeGoalForContrib.target_amount)) *
                            100
                        )
                      )}
                      % of target
                    </span>
                  </div>
                  {Number(activeGoalForContrib.current_amount) + Number(contribAmount) >=
                    Number(activeGoalForContrib.target_amount) && (
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 pt-1">
                      🎉 This contribution will complete this savings goal!
                    </p>
                  )}
                </div>
              )}

              {/* Date Input */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contribution Date
                </label>
                <input
                  type="date"
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Optional Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Note / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. October savings transfer, Diwali bonus"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeContributionDialog}
                  disabled={contribSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contribSubmitting || !Number(contribAmount)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  {contribSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PiggyBank className="w-4 h-4" />
                  )}
                  <span>Confirm Contribution</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution History Modal (Module 6.5) */}
      {historyGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Contribution History: {historyGoal.goal_name}
                  </h3>
                  <p className="text-[11px] text-slate-400">Auditable log of additions to this goal</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryGoal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {historyLoading ? (
                <div className="py-8 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-finman-blue" />
                </div>
              ) : contributionsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No individual contributions recorded yet for this goal.
                </div>
              ) : (
                contributionsList.map((c) => (
                  <div
                    key={c.contribution_id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{formatCurrency(c.amount)}
                      </span>
                      {c.note && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                          {c.note}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{c.contribution_date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryGoal(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default SavingsGoals;
