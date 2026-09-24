import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatCurrency';
import { AlertCircle, CheckCircle2, Loader2, Save, User } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
];

function buildForm(user) {
  return {
    name: user?.name || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    monthlyIncome: user?.monthly_income == null ? '' : String(user.monthly_income),
    preferredLanguage: user?.preferred_language || 'en',
    themePreference: user?.theme_preference || 'light',
  };
}

export const Profile = () => {
  const { currentUser, refreshCurrentUser, updateProfile } = useAuth();
  const { theme, setThemePreference } = useTheme();
  const [form, setForm] = useState(buildForm(currentUser));
  const [loading, setLoading] = useState(!currentUser);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const user = currentUser || await refreshCurrentUser();
        if (isMounted) {
          setForm(buildForm(user));
          setError('');
        }
      } catch (err) {
        if (isMounted) setError('Unable to load your profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        occupation: form.occupation.trim() || null,
        monthlyIncome: form.monthlyIncome === '' ? null : Number(form.monthlyIncome),
        preferredLanguage: form.preferredLanguage,
        themePreference: form.themePreference,
      });
      setThemePreference(form.themePreference);
      setForm(buildForm(updatedUser));
      setSuccess('Profile saved to PostgreSQL.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Profile & Settings"
        subtitle="Authenticated user profile stored in PostgreSQL"
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-finman-blue mb-3" />
          <p className="text-sm font-semibold">Loading profile...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="w-16 h-16 rounded-2xl bg-finman-blue text-white flex items-center justify-center font-black text-2xl mb-4">
              {(currentUser?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-black text-slate-900">{currentUser?.name || 'User'}</h2>
            <p className="text-sm text-slate-500 font-medium">{currentUser?.email}</p>

            <div className="mt-6 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Occupation</span>
                <span className="font-bold text-slate-800">{currentUser?.occupation || 'Not set'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Monthly Income</span>
                <span className="font-bold text-slate-800">{formatCurrency(currentUser?.monthly_income || 0)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold text-slate-500">Onboarding</span>
                <span className={`font-bold ${currentUser?.is_onboarded ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentUser?.is_onboarded ? 'Complete' : 'Incomplete'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-finman-blue" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Editable Profile</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none bg-slate-50 text-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Occupation</label>
                <input
                  type="text"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Income</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyIncome}
                  onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preferred Language</label>
                <select
                  value={form.preferredLanguage}
                  onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                >
                  {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>{language.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">App Theme</label>
                <select
                  value={form.themePreference || theme}
                  onChange={(e) => setForm({ ...form, themePreference: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-finman-blue text-white font-bold rounded-xl hover:bg-finman-blueDark shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-xs"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </MainLayout>
  );
};
