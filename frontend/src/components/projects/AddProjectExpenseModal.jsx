import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import projectService from '../../services/projectService';

export const AddProjectExpenseModal = ({ isOpen, onClose, projectId, onExpenseAdded }) => {
  const [formData, setFormData] = useState({
    expenseName: '',
    category: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMode: 'UPI',
    description: ''
  });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paymentModes = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Bank Transfer'];

  // Load project-specific categories whenever the modal opens
  useEffect(() => {
    if (!isOpen || !projectId) return;
    setCategoriesLoading(true);
    projectService.getProjectCategories(projectId)
      .then((cats) => {
        setCategories(cats);
        // Pre-select the first category if none is selected yet
        setFormData(prev => ({
          ...prev,
          category: cats.length > 0 ? cats[0].name : ''
        }));
      })
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.expenseName) return setError('Expense Name is required.');
    if (Number(formData.amount) <= 0) return setError('Amount must be greater than zero.');
    if (!formData.expenseDate) return setError('Expense Date is required.');
    if (!formData.category) return setError('Please select a category. Add categories to this project first.');

    try {
      setLoading(true);
      const newExpense = await projectService.createProjectExpense(projectId, {
        ...formData,
        amount: Number(formData.amount)
      });
      onExpenseAdded(newExpense);
      window.dispatchEvent(new CustomEvent('finman:expense-updated'));
      setFormData({
        expenseName: '',
        category: categories.length > 0 ? categories[0].name : '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMode: 'UPI',
        description: ''
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add project expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Project Expense</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-3 rounded-lg text-sm font-medium border border-rose-100 dark:border-rose-900">
              {error}
            </div>
          )}

          {/* No categories warning */}
          {!categoriesLoading && categories.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-sm font-medium border border-amber-100 dark:border-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This project has no expense categories. Please add categories in the project settings before recording expenses.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Name *</label>
            <input
              type="text"
              name="expenseName"
              value={formData.expenseName}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
              placeholder="e.g. 50 Bags of Cement"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                name="expenseDate"
                value={formData.expenseDate}
                onChange={handleChange}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
              {categoriesLoading ? (
                <div className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              ) : categories.length === 0 ? (
                <div className="w-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                  No categories
                </div>
              ) : (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
                >
                  {categories.map(c => (
                    <option key={c.category_id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
              <select
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleChange}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
              >
                {paymentModes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
              placeholder="Any notes..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || categories.length === 0}
              className="px-4 py-2 text-sm font-bold text-white bg-finman-blue hover:bg-finman-blueDark rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
