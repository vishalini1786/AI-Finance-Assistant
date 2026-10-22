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

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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
      showToast('Category created');
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

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Delete this category? Expenses using it may be affected.')) return;
    try {
      await adminService.deleteCategory(categoryId);
      showToast('Category deleted');
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

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Global Categories</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {categories.length} categories · Shared across all users
            </p>
          </div>
          <button
            onClick={() => {
              setAdding(true);
              setEditId(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[550px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      Name
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
                      <td colSpan={3} className="py-12 text-center text-slate-400">
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
                            <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
                              <Tags className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <span className="text-slate-900 dark:text-white font-semibold">{cat.name}</span>
                          </div>
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
                              onClick={() => handleDelete(cat.category_id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                              title="Delete"
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
