import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import authService from '../../services/authService';
import { Mail, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devData, setDevData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevData(null);

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setSuccess(res.message || 'If an account exists with this email, password reset instructions have been sent.');
      if (res.data?.resetUrl || res.data?.previewUrl) {
        setDevData(res.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your verified email to receive a secure recovery link."
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
            <span>Instructions Sent</span>
          </div>
          <p>{success}</p>
          <p className="text-[11px] opacity-80 pt-1">
            Check your inbox (and spam folder) for the 1-hour secure password reset link.
          </p>
          {devData?.previewUrl && (
            <div className="pt-2">
              <a
                href={devData.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 text-xs font-bold hover:bg-sky-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Delivered Email (Ethereal Preview) ↗
              </a>
            </div>
          )}
          {devData?.resetUrl && (
            <div className="pt-2">
              <a
                href={devData.resetUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-200 transition-colors"
              >
                Open Reset Password Page Directly →
              </a>
            </div>
          )}
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Registered Email Address
            </label>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
              <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
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
            {loading ? 'Sending Instructions...' : 'Send Recovery Link'}
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

export default ForgotPassword;
