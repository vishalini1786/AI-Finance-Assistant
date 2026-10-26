import React, { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import budgetService from '../services/budgetService';
import categoryService from '../services/categoryService';
import { analyzeBudget } from '../utils/budgetAiEngine';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Plus, X, AlertTriangle, Trash2, Edit2, Loader2, AlertCircle,
  Sliders, ChevronLeft, ChevronRight, Check, XCircle, BrainCircuit
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PRIORITIES = ['CRITICAL', 'ESSENTIAL', 'IMPORTANT', 'FLEXIBLE', 'DISCRETIONARY'];

export const Budget = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [plan, setPlan] = useState(null);
  const [categories, setCategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [aiData, setAiData] = useState({ recommendations: [], warnings: [] });

  // Plan Form State
  const [planForm, setPlanForm] = useState({
    plannedIncome: 0,
    emergencyReserve: 5000,
    allocations: [] // { categoryId, budgetAmount, priority }
  });

  // Custom Category Form State
  const [catForm, setCatForm] = useState({ name: '', description: '', priority: 'FLEXIBLE' });

  const loadData = async (m, y) => {
    try {
      setLoading(true);
      setError('');
      const [fetchedPlan, fetchedCategories] = await Promise.all([
        budgetService.getMonthlyPlan(y, m),
        categoryService.getCategories()
      ]);
      setPlan(fetchedPlan);
      setCategories(fetchedCategories);
      
      if (fetchedPlan && fetchedPlan.planId) {
        setAiData(analyzeBudget(fetchedPlan, fetchedCategories));
      } else {
        setAiData({ recommendations: [], warnings: [] });
      }
    } catch (err) {
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  const changeMonth = (offset) => {
    let m = currentMonth + offset;
    let y = currentYear;
    if (m > 12) { m = 1; y += 1; }
    else if (m < 1) { m = 12; y -= 1; }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const openPlanModal = () => {
    if (plan && plan.planId) {
      setPlanForm({
        plannedIncome: plan.plannedIncome,
        emergencyReserve: plan.emergencyReserve,
        allocations: plan.allocations.map(a => ({
          categoryId: a.category_id,
          budgetAmount: a.budget_amount,
          priority: a.priority
        }))
      });
    } else {
      setPlanForm({
        plannedIncome: plan ? plan.actualIncome : 0,
        emergencyReserve: 5000,
        allocations: []
      });
    }
    setIsPlanModalOpen(true);
  };

  const addAllocationRow = () => {
    setPlanForm(prev => ({
      ...prev,
      allocations: [...prev.allocations, { categoryId: categories[0]?.category_id || '', budgetAmount: 0, priority: 'FLEXIBLE' }]
    }));
  };

  const updateAllocation = (index, field, value) => {
    const newAlloc = [...planForm.allocations];
    newAlloc[index][field] = value;
    setPlanForm({ ...planForm, allocations: newAlloc });
  };

  const removeAllocation = (index) => {
    const newAlloc = [...planForm.allocations];
    newAlloc.splice(index, 1);
    setPlanForm({ ...planForm, allocations: newAlloc });
  };

  const savePlan = async (e) => {
    e.preventDefault();
    const totalAlloc = planForm.allocations.reduce((acc, a) => acc + Number(a.budgetAmount || 0), 0);
    if (totalAlloc + Number(planForm.emergencyReserve) > Number(planForm.plannedIncome)) {
      if (!window.confirm(`Your planned allocations exceed your monthly income. Are you sure you want to save?`)) {
        return;
      }
    }

    try {
      setSaving(true);
      await budgetService.saveMonthlyPlan(currentYear, currentMonth, planForm);
      await loadData(currentMonth, currentYear);
      setIsPlanModalOpen(false);
    } catch (err) {
      setError('Failed to save monthly plan');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomCategory = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const newCat = await categoryService.createCategory(catForm);
      setCategories([...categories, newCat]);
      setIsCategoryModalOpen(false);
      setCatForm({ name: '', description: '', priority: 'FLEXIBLE' });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const acceptReallocation = async (rec) => {
    // 1. Find the current allocations
    const currentAllocs = plan.allocations.map(a => ({
      categoryId: a.category_id,
      budgetAmount: Number(a.budget_amount),
      priority: a.priority
    }));

    // 2. Adjust amounts
    const fromAlloc = currentAllocs.find(a => a.categoryId === rec.fromId);
    const toAlloc = currentAllocs.find(a => a.categoryId === rec.toId);
    
    if (fromAlloc && toAlloc) {
      fromAlloc.budgetAmount -= rec.amount;
      toAlloc.budgetAmount += rec.amount;
      
      try {
        setLoading(true);
        await budgetService.saveMonthlyPlan(currentYear, currentMonth, {
          plannedIncome: plan.plannedIncome,
          emergencyReserve: plan.emergencyReserve,
          allocations: currentAllocs
        });
        await loadData(currentMonth, currentYear);
      } catch (err) {
        alert('Failed to apply reallocation');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Intelligent Budget Planner" 
        subtitle="Month-wise AI-driven budget planning and monitoring"
        rightElement={
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
            <span className="font-bold text-slate-800 min-w-[120px] text-center">{MONTHS[currentMonth-1]} {currentYear}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-finman-blue" />
          <p className="text-sm font-semibold">Loading plan...</p>
        </div>
      ) : !plan?.planId ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sliders className="w-8 h-8 text-finman-blue" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Budget Plan for {MONTHS[currentMonth-1]}</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">Create a comprehensive monthly budget plan to track expenses, set category limits, and get AI recommendations.</p>
          <button onClick={openPlanModal} className="px-6 py-3 bg-finman-blue text-white rounded-xl font-bold hover:bg-finman-blueDark shadow-md flex items-center gap-2 mx-auto">
            <Plus className="w-5 h-5"/> Create Monthly Budget
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            <SummaryCard title="Monthly Income" amount={plan.plannedIncome} indicator="Planned Income" type="blue" />
            <SummaryCard title="Total Allocated" amount={plan.totalAllocated} indicator="Across all categories" />
            <SummaryCard title="Unallocated Income" amount={plan.unallocated} indicator="Remaining to allocate" type="income" />
            <SummaryCard title="Actual Spent" amount={plan.totalSpent} indicator="From expense records" type="expense" />
            <SummaryCard title="Remaining Allocation" amount={plan.totalAllocated - plan.totalSpent} indicator="Budget left to spend" />
            <SummaryCard title="Emergency Reserve" amount={plan.emergencyReserve} indicator="Protected funds" type="blue" />
          </div>

          {/* Module 8A: Personalized Budget Insights */}
          <PersonalizedInsights
            pageContext="BUDGET"
            title="FinMan Budget Advisor"
            subtitle="Pace alerts, realistic envelope limits, and priority alignment based on actual spending"
            className="mb-8"
          />

          {(aiData.recommendations.length > 0 || aiData.warnings.length > 0) && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5 rounded-2xl mb-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="w-6 h-6 text-indigo-600" />
                <h3 className="font-bold text-slate-800">FinMan Budget Advisor</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {aiData.warnings.length > 0 && (
                  <div className="bg-white/60 p-4 rounded-xl border border-indigo-50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500"/> Warnings</h4>
                    <ul className="space-y-2">
                      {aiData.warnings.map((w, i) => (
                        <li key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"/> {w.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {aiData.recommendations.length > 0 && (
                  <div className="bg-white/60 p-4 rounded-xl border border-indigo-50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Sliders className="w-3.5 h-3.5 text-indigo-500"/> Recommendations</h4>
                    <div className="space-y-3">
                      {aiData.recommendations.map((rec) => (
                        <div key={rec.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm">
                          <p className="font-medium text-slate-800 mb-2">{rec.reason}</p>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-600">Reallocate ₹{rec.amount}</span>
                            <span className="text-slate-400">from {rec.fromName} to {rec.toName}</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => acceptReallocation(rec)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-1"><Check className="w-3.5 h-3.5"/> Accept</button>
                            <button onClick={openPlanModal} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">Edit Plan</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Category Allocations</h3>
              <button onClick={openPlanModal} className="text-xs font-bold text-finman-blue flex items-center gap-1 hover:underline">
                <Edit2 className="w-3.5 h-3.5"/> Edit Plan
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Priority</th>
                    <th className="py-3.5 px-6">Allocated</th>
                    <th className="py-3.5 px-6">Spent</th>
                    <th className="py-3.5 px-6">Remaining</th>
                    <th className="py-3.5 px-6 w-1/4">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {plan.allocations.map((a) => {
                    const util = Number(a.utilization_percent || 0);
                    const isOver = a.is_exceeded;
                    const remaining = Number(a.remaining_amount);
                    
                    return (
                      <tr key={a.budget_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">{a.category_name}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            a.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 
                            a.priority === 'ESSENTIAL' ? 'bg-amber-100 text-amber-700' :
                            a.priority === 'IMPORTANT' ? 'bg-indigo-100 text-indigo-700' :
                            a.priority === 'FLEXIBLE' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {a.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800">{formatCurrency(a.budget_amount)}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{formatCurrency(a.actual_spent)}</td>
                        <td className="py-4 px-6">
                          <span className={`font-bold ${remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isOver ? `Over by ${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60 p-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-rose-500' : util >= 80 ? 'bg-amber-500' : 'bg-finman-blue'}`}
                                style={{ width: `${Math.min(util, 100)}%` }}
                              />
                            </div>
                            <span className={`text-[11px] font-black w-10 text-right ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>{util}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Monthly Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Budget Plan: {MONTHS[currentMonth-1]} {currentYear}</h3>
              <button onClick={() => setIsPlanModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Planned Monthly Income</label>
                  <input type="number" required value={planForm.plannedIncome} onChange={e => setPlanForm({...planForm, plannedIncome: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-finman-blue font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Emergency Reserve <span className="text-emerald-600">(Protected)</span></label>
                  <input type="number" required value={planForm.emergencyReserve} onChange={e => setPlanForm({...planForm, emergencyReserve: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-emerald-500 font-medium bg-emerald-50/30" />
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800">Category Allocations</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="text-xs font-bold text-finman-blue border border-finman-blue/20 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                    + Custom Category
                  </button>
                  <button type="button" onClick={addAllocationRow} className="text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-700">
                    + Add Allocation
                  </button>
                </div>
              </div>

              {planForm.allocations.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
                  <p className="text-sm font-medium text-slate-500 mb-3">No categories allocated yet.</p>
                  <button type="button" onClick={addAllocationRow} className="text-sm font-bold text-finman-blue">Add First Category</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {planForm.allocations.map((alloc, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <select value={alloc.categoryId} onChange={e => updateAllocation(idx, 'categoryId', e.target.value)} className="flex-1 min-w-[150px] border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white">
                        {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                      </select>
                      
                      <select value={alloc.priority} onChange={e => updateAllocation(idx, 'priority', e.target.value)} className="w-32 border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-medium text-slate-700">
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>

                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input type="number" min="0" value={alloc.budgetAmount} onChange={e => updateAllocation(idx, 'budgetAmount', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 pl-7 text-sm outline-none bg-white font-bold" placeholder="0" />
                      </div>

                      <button type="button" onClick={() => removeAllocation(idx)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600">Total Allocation:</span>
                <span className="text-finman-blue text-lg">₹{planForm.allocations.reduce((acc, a) => acc + Number(a.budgetAmount || 0), 0) + Number(planForm.emergencyReserve)}</span>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
              <button type="button" onClick={savePlan} disabled={saving} className="px-5 py-2.5 rounded-xl font-bold text-white bg-finman-blue hover:bg-finman-blueDark shadow-md disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin"/>} Save Monthly Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-900">Add Custom Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
            </div>
            <form onSubmit={saveCustomCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input required type="text" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-finman-blue" placeholder="e.g. Pet Care"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                <select value={catForm.priority} onChange={e => setCatForm({...catForm, priority: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-finman-blue">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-60 flex justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin"/>} Create Category
              </button>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
