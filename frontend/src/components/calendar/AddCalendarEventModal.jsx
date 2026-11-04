import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import calendarService from '../../services/calendarService';
import categoryService from '../../services/categoryService';

export const AddCalendarEventModal = ({ isOpen, onClose, onSave, preselectedDate }) => {
  const [eventType, setEventType] = useState('Bill');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
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
      let eventTitle = form.title?.trim();
      if (!eventTitle) {
        if (eventType === 'Income') eventTitle = form.source ? `${form.source} Income` : 'Income';
        else if (eventType === 'Investment') eventTitle = form.investmentName || 'Investment';
        else eventTitle = form.merchantName || form.description || `${eventType} Payment`;
      }

      await calendarService.createEvent({
        title: eventTitle,
        eventDate: form.date,
        eventType: eventType.toLowerCase(),
        amount: Number(form.amount) || 0,
        description: form.description || null,
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      alert(error?.response?.data?.message || error?.message || 'Failed to create calendar event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-finman-blue" /> Add Calendar Event
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Type</label>
            <select 
              value={eventType} 
              onChange={e => setEventType(e.target.value)} 
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
            >
              <option value="Reminder">Calendar Reminder (Task, Deadline, Review)</option>
              <option value="One-Time">One-Time Bill / Payment</option>
              <option value="Bill">Recurring Bill (Airtel, Electricity, etc.)</option>
              <option value="EMI">Loan / EMI Payment</option>
              <option value="Subscription">Subscription (Netflix, Prime, etc.)</option>
              <option value="Income">Expected Income / Salary</option>
              <option value="Investment">Investment Contribution</option>
              <option value="Savings">Savings Goal Target</option>
              <option value="Tax">Tax Due Date</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Title / Payee</label>
            <input 
              type="text" required
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
              placeholder="e.g. Airtel Fiber, Home Loan EMI, Netflix"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
              <input 
                type="number" required min="0" step="0.01"
                value={form.amount} 
                onChange={e => setForm({...form, amount: e.target.value})} 
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Event Date</label>
              <input 
                type="date" required
                value={form.date} 
                onChange={e => setForm({...form, date: e.target.value})} 
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
            <input 
              type="text"
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})} 
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-finman-blue"
              placeholder="e.g. Account No: 12345, Monthly auto-debit"
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-finman-blue text-white p-2.5 rounded-lg text-sm font-bold hover:bg-finman-blueDark transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Calendar Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCalendarEventModal;
