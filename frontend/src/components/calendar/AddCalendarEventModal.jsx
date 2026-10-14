import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import incomeService from '../../services/incomeService';
import expenseService from '../../services/expenseService';
import holdingService from '../../services/holdingService';
import categoryService from '../../services/categoryService';

export const AddCalendarEventModal = ({ isOpen, onClose, onSave, preselectedDate }) => {
  const [eventType, setEventType] = useState('Income');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    amount: '',
    date: preselectedDate || '',
    description: '',
    categoryId: '',
    source: 'Salary',
    holdingType: 'MUTUAL_FUND',
    investmentName: '',
    merchantName: '' // used for bill/tax name
  });

  useEffect(() => {
    if (preselectedDate) {
      setForm(prev => ({ ...prev, date: preselectedDate }));
    }
  }, [preselectedDate]);

  useEffect(() => {
    if (isOpen) {
      categoryService.getCategories().then(setCategories).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (eventType === 'Income') {
        await incomeService.createIncome({
          source: form.source,
          amount: Number(form.amount),
          incomeDate: form.date,
          description: form.description
        });
      } else if (eventType === 'Investment') {
        await holdingService.createHolding({
          holdingType: form.holdingType,
          name: form.investmentName,
          quantity: 1,
          currentValue: Number(form.amount),
          purchaseValue: Number(form.amount),
          purchaseDate: form.date
        });
      } else {
        // Bill, EMI, Subscription, Tax, Savings
        await expenseService.createExpense({
          categoryId: Number(form.categoryId),
          amount: Number(form.amount),
          expenseDate: form.date,
          merchantName: form.merchantName,
          description: form.description
        });
      }
      onSave();
      onClose();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-finman-blue" /> Add Event
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Event Type</label>
            <select 
              value={eventType} 
              onChange={e => setEventType(e.target.value)} 
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
            >
              <option value="Income">Salary / Income</option>
              <option value="Bill">Bill / Expense</option>
              <option value="EMI">EMI</option>
              <option value="Subscription">Subscription</option>
              <option value="Savings">Savings</option>
              <option value="Tax">Tax</option>
              <option value="Investment">Investment</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount</label>
              <input 
                type="number" required min="0" step="0.01"
                value={form.amount} 
                onChange={e => setForm({...form, amount: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input 
                type="date" required
                value={form.date} 
                onChange={e => setForm({...form, date: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
              />
            </div>
          </div>

          {eventType === 'Income' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Source</label>
              <select 
                value={form.source} 
                onChange={e => setForm({...form, source: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
              >
                <option value="Salary">Salary</option>
                <option value="Business">Business</option>
                <option value="Freelance">Freelance</option>
                <option value="Rental">Rental</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          {['Bill', 'EMI', 'Subscription', 'Tax', 'Savings'].includes(eventType) && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select 
                  required
                  value={form.categoryId} 
                  onChange={e => setForm({...form, categoryId: e.target.value})} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
                >
                  <option value="">Select a category...</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name / Merchant</label>
                <input 
                  type="text" required
                  value={form.merchantName} 
                  onChange={e => setForm({...form, merchantName: e.target.value})} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
                  placeholder="e.g. Electric Bill, Netflix"
                />
              </div>
            </>
          )}

          {eventType === 'Investment' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Investment Type</label>
                <select 
                  value={form.holdingType} 
                  onChange={e => setForm({...form, holdingType: e.target.value})} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
                >
                  <option value="STOCK">Stock / Equities</option>
                  <option value="MUTUAL_FUND">Mutual Fund / SIP</option>
                  <option value="CRYPTO">Cryptocurrency</option>
                  <option value="REAL_ESTATE">Real Estate / Property</option>
                  <option value="GOLD">Gold / Silver</option>
                  <option value="BOND">Bonds / FD</option>
                  <option value="OTHER">Other Investment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Investment Name</label>
                <input 
                  type="text" required
                  value={form.investmentName} 
                  onChange={e => setForm({...form, investmentName: e.target.value})} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
                  placeholder="e.g. Reliance Shares, HDFC Mutual Fund"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
            <input 
              type="text"
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})} 
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
              placeholder="Additional notes..."
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-finman-blue text-white p-2.5 rounded-lg text-sm font-bold hover:bg-finman-blueDark transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Event to Records'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
