import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { Tags, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

// ── Inline edit row ───────────────────────────────────────────────
const EditRow = ({ category, onSave, onCancel }) => {
  const [name, setName]   = useState(category?.name || '');
  const [desc, setDesc]   = useState(category?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description: desc.trim() });
    setSaving(false);
  };

  return (
    <tr className="bg-violet-900/10 border-l-2 border-violet-500">
      <td className="px-4 py-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
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
  const [loading,    setLoading]    = useState(true);
  const [editId,     setEditId]     = useState(null); // category_id being edited
  const [adding,     setAdding]     = useState(false);
  const [toast,      setToast]      = useState(null);

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

  useEffect(() => { fetchCategories(); }, []);

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
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Global Categories</h2>
            <p className="text-sm text-slate-400 mt-1">
              {categories.length} categories · Shared across all users
            </p>
          </div>
          <button
            onClick={() => { setAdding(true); setEditId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-900/60 border-b border-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/20">
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
                    <td colSpan={3} className="py-10 text-center text-slate-500">
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
                    <tr key={cat.category_id} className="hover:bg-slate-700/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center">
                            <Tags className="w-3 h-3 text-violet-400" />
                          </div>
                          <span className="text-white font-semibold">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{cat.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setEditId(cat.category_id); setAdding(false); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-400/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.category_id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
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
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
