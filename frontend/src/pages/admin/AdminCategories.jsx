import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { Tags, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

// ── Inline edit row ───────────────────────────────────────────────
const EditRow = ({ category, onSave, onCancel }) => {
  const [name, setName] = useState(category?.name || '');
  const [desc, setDesc] = useState(category?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description: desc.trim() });
    setSaving(false);
  };

  return (
    <tr className="bg-violet-50/80 dark:bg-violet-950/30 border-l-4 border-violet-600">
      <td className="px-4 py-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [reassignModal, setReassignModal] = useState(null); // { category, replacementId }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const d = await adminService.getCategories();
      setCategories(d.categories || []);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async ({ name, description }) => {
    try {
      await adminService.createCategory({ name, description });
      showToast('Global category created successfully');
      setAdding(false);
      fetchCategories();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to create category', 'error');
    }
  };

  const handleEdit = async (categoryId, { name, description }) => {
    try {
      await adminService.updateCategory(categoryId, { name, description });
      showToast('Category updated');
      setEditId(null);
      fetchCategories();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to update category', 'error');
    }
  };

  const handleDeleteClick = (cat) => {
    const deps = (cat.expense_count || 0) + (cat.budget_count || 0) + (cat.recurring_count || 0);
    if (deps > 0) {
      // Pick first eligible replacement category (different category_id)
      const eligible = categories.find((c) => c.category_id !== cat.category_id);
      setReassignModal({
        category: cat,
        replacementId: eligible ? eligible.category_id : '',
      });
    } else {
      if (window.confirm(`Delete "${cat.name}"? This action cannot be undone.`)) {
        executeDelete(cat.category_id, null);
      }
    }
  };

  const executeDelete = async (categoryId, reassignToCategoryId) => {
    try {
      await adminService.deleteCategory(categoryId, reassignToCategoryId);
      showToast(reassignToCategoryId ? 'Category deleted and records safely reassigned' : 'Category deleted');
      setReassignModal(null);
      fetchCategories();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to delete category', 'error');
    }
  };

  return (
    <AdminLayout>
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Safe Reassignment Modal */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Safe Deletion &amp; Record Reassignment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  &ldquo;{reassignModal.category.name}&rdquo; is linked to{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {reassignModal.category.expense_count || 0} expense(s)
                  </strong>{' '}
                  and{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {reassignModal.category.budget_count || 0} budget(s)
                  </strong>.
                </p>
              </div>
              <button
                onClick={() => setReassignModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
              To protect financial history and reports, choose a replacement category to safely reassign these records to before deleting.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Reassign Linked Transactions To:
              </label>
              <select
                value={reassignModal.replacementId}
                onChange={(e) => setReassignModal({ ...reassignModal, replacementId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-violet-500"
              >
                {categories
                  .filter((c) => c.category_id !== reassignModal.category.category_id)
                  .map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name} {c.is_global ? '(Global)' : `(User: ${c.creator_name || 'Custom'})`}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(reassignModal.category.category_id, reassignModal.replacementId)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
              >
                Reassign &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Global &amp; User Categories</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {categories.length} total categories · Global defaults &amp; user-created custom categories
            </p>
          </div>
          <button
            onClick={() => {
              setAdding(true);
              setEditId(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add Global Category
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[650px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Scope / Origin
                    </th>
                    <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Linked Records
                    </th>
                    <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/20">
                  {/* Add new row */}
                  {adding && (
                    <EditRow
                      category={null}
                      onSave={handleAdd}
                      onCancel={() => setAdding(false)}
                    />
                  )}

                  {categories.length === 0 && !adding && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No categories found. Add one above.
                      </td>
                    </tr>
                  )}

                  {categories.map((cat) =>
                    editId === cat.category_id ? (
                      <EditRow
                        key={cat.category_id}
                        category={cat}
                        onSave={(fields) => handleEdit(cat.category_id, fields)}
                        onCancel={() => setEditId(null)}
                      />
                    ) : (
                      <tr
                        key={cat.category_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center shrink-0">
                              <Tags className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <span className="text-slate-900 dark:text-white font-semibold">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {cat.is_global ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                              Global Default
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                              User: {cat.creator_name || cat.creator_email || 'Custom'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {(cat.expense_count || 0) + (cat.budget_count || 0) > 0 ? (
                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              {cat.expense_count || 0} exp, {cat.budget_count || 0} bud
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">0 records</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{cat.description || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditId(cat.category_id);
                                setAdding(false);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(cat)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                              title="Delete category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
