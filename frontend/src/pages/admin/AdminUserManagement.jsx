import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import {
  Search, Shield, ShieldOff, Trash2, UserCheck,
  AlertTriangle, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_BADGE = {
  admin: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',
  user:  'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

// ── Confirm Dialog ────────────────────────────────────────────────
const ConfirmDialog = ({ open, title, body, onConfirm, onCancel, danger }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-96 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${danger ? 'text-rose-500' : 'text-amber-500'}`} />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{body}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-600">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              danger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Toast ─────────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`}>
      {msg}
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
};

export const AdminUserManagement = () => {
  const { currentUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(0);
  const LIMIT = 20;

  const [confirm, setConfirm] = useState(null); // { type, userId, extra }
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({ limit: LIMIT, offset: page * LIMIT, search });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce search resets page
  const handleSearch = (v) => { setSearch(v); setPage(0); };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      showToast(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to update role', 'error');
    }
    setConfirm(null);
  };

  const handleDelete = async (userId) => {
    try {
      await adminService.deleteUser(userId);
      showToast('User deleted');
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to delete user', 'error');
    }
    setConfirm(null);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminLayout>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'delete' ? 'Delete User?' : `Change role to "${confirm?.extra}"?`}
        body={confirm?.type === 'delete'
          ? 'This will permanently delete the user and all their data. This action cannot be undone.'
          : `Are you sure you want to change this user's role to "${confirm?.extra}"?`
        }
        danger={confirm?.type === 'delete'}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm.type === 'delete'
            ? handleDelete(confirm.userId)
            : handleRoleChange(confirm.userId, confirm.extra)
        }
      />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">User Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} registered users</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors shadow-xs"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Onboarded</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">No users found</td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.user_id === currentUser?.user_id;
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                            {isSelf && <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold">YOU</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold ${u.is_onboarded ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          {u.is_onboarded ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {!isSelf && (
                            <>
                              {u.role === 'admin' ? (
                                <button
                                  onClick={() => setConfirm({ type: 'role', userId: u.user_id, extra: 'user' })}
                                  title="Demote to User"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                >
                                  <ShieldOff className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirm({ type: 'role', userId: u.user_id, extra: 'admin' })}
                                  title="Promote to Admin"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setConfirm({ type: 'delete', userId: u.user_id })}
                                title="Delete User"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {isSelf && <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">Self</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
