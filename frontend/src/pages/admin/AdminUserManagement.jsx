import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import {
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_BADGE = {
  admin: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',
  user: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

// ── Confirm Dialog ────────────────────────────────────────────────
const ConfirmDialog = ({ open, title, body, onConfirm, onCancel, danger, isSubmitting }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-xl shrink-0 ${danger ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-600 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Toast ─────────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold ${
        type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
      }`}
    >
      <span>{msg}</span>
      <button onClick={onClose} className="hover:opacity-80 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const AdminUserManagement = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  // Multi-Select State (Module 4)
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [confirm, setConfirm] = useState(null); // { type, userId, extra, count }
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Eligible users on current page (excluding the currently authenticated admin)
  const eligiblePageUsers = useMemo(() => {
    return users.filter((u) => u.user_id !== currentUser?.user_id);
  }, [users, currentUser]);

  const allPageSelected = useMemo(() => {
    if (eligiblePageUsers.length === 0) return false;
    return eligiblePageUsers.every((u) => selectedUserIds.has(u.user_id));
  }, [eligiblePageUsers, selectedUserIds]);

  const somePageSelected = useMemo(() => {
    if (allPageSelected) return false;
    return eligiblePageUsers.some((u) => selectedUserIds.has(u.user_id));
  }, [eligiblePageUsers, selectedUserIds, allPageSelected]);

  // Select / Deselect All on current page
  const handleToggleSelectAll = () => {
    const updated = new Set(selectedUserIds);
    if (allPageSelected) {
      eligiblePageUsers.forEach((u) => updated.delete(u.user_id));
    } else {
      eligiblePageUsers.forEach((u) => updated.add(u.user_id));
    }
    setSelectedUserIds(updated);
  };

  // Toggle single user
  const handleToggleUser = (userId) => {
    if (userId === currentUser?.user_id) return; // Prevent selecting self
    const updated = new Set(selectedUserIds);
    if (updated.has(userId)) {
      updated.delete(userId);
    } else {
      updated.add(userId);
    }
    setSelectedUserIds(updated);
  };

  // Debounce search resets page & selection
  const handleSearch = (v) => {
    setSearch(v);
    setPage(0);
    setSelectedUserIds(new Set());
  };

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
      setIsDeleting(true);
      await adminService.deleteUser(userId);
      showToast('User deleted successfully');
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setIsDeleting(false);
      setConfirm(null);
    }
  };

  // Bulk Delete Execution
  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedUserIds).filter((id) => id !== currentUser?.user_id);
    if (idsToDelete.length === 0) return;

    try {
      setIsDeleting(true);
      const res = await adminService.bulkDeleteUsers(idsToDelete);
      showToast(`Successfully deleted ${res.deletedCount || idsToDelete.length} user(s).`);
      setSelectedUserIds(new Set());
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to delete users in bulk', 'error');
    } finally {
      setIsDeleting(false);
      setConfirm(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminLayout>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirm}
        isSubmitting={isDeleting}
        title={
          confirm?.type === 'bulk_delete'
            ? `Delete ${confirm.count} Selected User${confirm.count > 1 ? 's' : ''}?`
            : confirm?.type === 'delete'
            ? 'Delete User?'
            : `Change role to "${confirm?.extra}"?`
        }
        body={
          confirm?.type === 'bulk_delete'
            ? `This will permanently delete ${confirm.count} user account(s) and all their associated financial records (incomes, expenses, budgets, goals, etc.). This action cannot be undone.`
            : confirm?.type === 'delete'
            ? 'This will permanently delete the user and all their financial records. This action cannot be undone.'
            : `Are you sure you want to change this user's role to "${confirm?.extra}"?`
        }
        danger={confirm?.type === 'delete' || confirm?.type === 'bulk_delete'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm.type === 'bulk_delete') {
            handleBulkDelete();
          } else if (confirm.type === 'delete') {
            handleDelete(confirm.userId);
          } else {
            handleRoleChange(confirm.userId, confirm.extra);
          }
        }}
      />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">User Management</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {total} registered user{total === 1 ? '' : 's'} across the FinMan platform
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors shadow-2xs"
            />
          </div>
        </div>

        {/* Multi-Select Bulk Actions Bar (Module 4) */}
        {selectedUserIds.size > 0 && (
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-violet-600 text-white font-black text-xs flex items-center justify-center">
                {selectedUserIds.size}
              </span>
              <span className="text-xs font-bold text-violet-900 dark:text-violet-200">
                User{selectedUserIds.size > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserIds(new Set())}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirm({
                    type: 'bulk_delete',
                    count: selectedUserIds.size,
                  })
                }
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedUserIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* User Table (Responsive wrapper) */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="w-10 px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      disabled={eligiblePageUsers.length === 0}
                      className="p-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition cursor-pointer disabled:opacity-40"
                      title={allPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                    >
                      {allPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      ) : somePageSelected ? (
                        <MinusSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Onboarded
                  </th>
                  <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u.user_id === currentUser?.user_id;
                    const isSelected = selectedUserIds.has(u.user_id);

                    return (
                      <tr
                        key={u.user_id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-violet-50/70 dark:bg-violet-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          {!isSelf ? (
                            <button
                              type="button"
                              onClick={() => handleToggleUser(u.user_id)}
                              className="p-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition cursor-pointer"
                              title={isSelected ? 'Deselect user' : 'Select user'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="p-1 text-slate-300 dark:text-slate-700 cursor-not-allowed">
                              <Square className="w-4 h-4" />
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                              {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                              {isSelf && (
                                <span className="text-[9px] text-violet-600 dark:text-violet-400 font-extrabold uppercase">
                                  You (Active)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{u.email}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ROLE_BADGE[u.role] || ROLE_BADGE.user
                            }`}
                          >
                            {u.role || 'user'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold ${
                              u.is_onboarded
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {u.is_onboarded ? 'Yes' : 'No'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isSelf ? (
                              <>
                                {u.role === 'admin' ? (
                                  <button
                                    onClick={() => setConfirm({ type: 'role', userId: u.user_id, extra: 'user' })}
                                    title="Demote to User"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                  >
                                    <ShieldOff className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirm({ type: 'role', userId: u.user_id, extra: 'admin' })}
                                    title="Promote to Admin"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 transition-colors cursor-pointer"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirm({ type: 'delete', userId: u.user_id })}
                                  title="Delete User"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-600 italic px-2">
                                Self
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

export default AdminUserManagement;
