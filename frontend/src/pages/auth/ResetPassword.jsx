import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import authService from '../../services/authService';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password reset token is missing from the URL. Please request a new link.');
      return;
    }

    if (!password) {
      setError('New password is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword({ token, password });
      setSuccess(res.message || 'Password has been successfully reset.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Choose a secure new password for your FinMan account."
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Success!</span>
          </div>
          <p>{success}</p>
          <p className="text-[11px] opacity-80 pt-1">
            Redirecting you to sign in in 3 seconds...
          </p>
        </div>
      )}

      {!success && !token && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-2">
          <p className="font-bold">Missing or invalid recovery token</p>
          <p>Please check the link from your email or request a new password reset.</p>
          <div className="pt-2">
            <Link to="/forgot-password" className="text-sky-600 font-bold hover:underline">
              Request a new reset link →
            </Link>
          </div>
        </div>
      )}

      {!success && token && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
              <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={loading}
                className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
              <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={loading}
                className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs shadow-md shadow-sky-500/20 disabled:opacity-60 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Resetting Password...' : 'Save New Password'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-500 hover:text-sky-600 dark:text-sky-400"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
