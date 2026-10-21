import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ----- Inline validation -----
  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    return newErrors;
  };

  const handleBlur = (field) => {
    const result = validate();
    if (result[field]) {
      setErrors((prev) => ({ ...prev, [field]: result[field] }));
    } else {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email, password);
      if (user && user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user && !user.is_onboarded) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setServerError('Invalid email or password. Please try again.');
      } else if (status === 422 || status === 400) {
        setServerError('Please check your input and try again.');
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setServerError('Unable to connect to the server. Please try again later.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back!"
      subtitle="Sign in to access your financial dashboard."
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <div className={`flex items-center px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 focus-within:border-sky-500 transition-colors ${
            errors.email ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'
          }`}>
            <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="you@example.com"
              disabled={isLoading}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <p id="login-email-error" className="mt-1 text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className={`flex items-center px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 focus-within:border-sky-500 transition-colors ${
            errors.password ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'
          }`}>
            <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              placeholder="••••••••"
              disabled={isLoading}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white"
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" className="mt-1 text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.password}
            </p>
          )}
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded text-sky-500 border-slate-300 dark:border-slate-700"
            />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Remember Me</span>
          </label>
          <Link to="/forgot-password" className="text-sky-500 hover:underline font-bold">
            Forgot Password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-70 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md shadow-sky-500/25 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Login to FinMan'
          )}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 mt-6 text-xs text-slate-500 dark:text-slate-400">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="font-extrabold text-sky-500 hover:underline">
            Sign Up Free
          </Link>
        </p>
        <Link to="/" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-sky-500">
          <ArrowLeft className="w-3 h-3" /> Back to Home Page
        </Link>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;