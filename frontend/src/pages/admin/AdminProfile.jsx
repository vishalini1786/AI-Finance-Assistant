import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import adminService from '../../services/adminService';
import { Shield, UserCircle, Save, X } from 'lucide-react';

export const AdminProfile = () => {
  const { currentUser, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(currentUser?.name || '');
  const [phone,   setPhone]   = useState(currentUser?.phone || '');
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, phone });
      showToast('Profile updated');
      setEditing(false);
    } catch (e) {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone || '');
    setEditing(false);
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

      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-black text-white">Admin Profile</h2>
          <p className="text-sm text-slate-400 mt-1">Your administrator account details</p>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-xl">
              <span className="text-2xl font-black text-white">
                {currentUser?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{currentUser?.name}</h3>
              <p className="text-sm text-slate-400">{currentUser?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Administrator</span>
              </div>
            </div>
          </div>

          {!editing ? (
            <div className="space-y-3">
              <InfoRow label="Full Name"  value={currentUser?.name} />
              <InfoRow label="Email"      value={currentUser?.email} />
              <InfoRow label="Phone"      value={currentUser?.phone || '—'} />
              <InfoRow label="Role"       value="admin" accent />
              <InfoRow label="Member Since" value={currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : '—'} />

              <div className="pt-2">
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Capabilities */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Admin Capabilities</h3>
          <div className="space-y-2">
            {[
              'View platform-wide analytics and statistics',
              'Manage all registered user accounts and roles',
              'Monitor system health and database table counts',
              'Oversee all OCR document uploads across users',
              'View AI service status and feature list',
              'Read audit logs and recent platform activity',
              'Create, edit, and delete global expense categories',
            ].map((cap, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                <Shield className="w-3 h-3 text-violet-400 shrink-0" />
                {cap}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const InfoRow = ({ label, value, accent }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`text-xs font-semibold ${accent ? 'text-violet-400' : 'text-slate-300'}`}>{value}</span>
  </div>
);
