import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { User, Mail, Lock, Eye, EyeOff, Phone, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ----- Inline validation -----
  const validate = () => {
    const newErrors = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Full name must be at least 2 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (phone.trim() && !PHONE_REGEX.test(phone)) {
      newErrors.phone = 'Please enter a valid phone number.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
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
      // register() auto-logs in (stores JWT) and returns user from PostgreSQL.
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      // New users are NOT onboarded yet (is_onboarded = FALSE in DB).
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 409) {
        setServerError('An account with this email already exists. Please login instead.');
      } else if (status === 422 || status === 400) {
        setServerError(backendMessage || 'Please check your input and try again.');
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setServerError('Unable to connect to the server. Please try again later.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase = (hasError) =>
    `flex items-center px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 focus-within:border-sky-500 transition-colors ${
      hasError ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'
    }`;

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join FinMan and take control of your finances."
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="reg-name" className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            Full Name <span className="text-rose-400">*</span>
          </label>
          <div className={inputBase(errors.name)}>
            <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Priya Sharma"
              disabled={isLoading}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
              aria-describedby={errors.name ? 'reg-name-error' : undefined}
              aria-invalid={!!errors.name}
            />
          </div>
          {errors.name && (
            <p id="reg-name-error" className="mt-1 text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            Email Address <span className="text-rose-400">*</span>
          </label>
          <div className={inputBase(errors.email)}>
            <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="priya@example.com"
              disabled={isLoading}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
              aria-describedby={errors.email ? 'reg-email-error' : undefined}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <p id="reg-email-error" className="mt-1 text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.email}
            </p>
          )}
        </div>

        {/* Phone (optional) */}
        <div>
          <label htmlFor="reg-phone" className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            Phone Number <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div className={inputBase(errors.phone)}>
            <Phone className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="+91 98765 43210"
              disabled={isLoading}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
              aria-describedby={errors.phone ? 'reg-phone-error' : undefined}
              aria-invalid={!!errors.phone}
            />
          </div>
          {errors.phone && (
            <p id="reg-phone-error" className="mt-1 text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.phone}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            Password <span className="text-rose-400">*</span>
          </label>
          <div className={inputBase(errors.password)}>
            <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              placeholder="At least 8 characters"
              disabled={isLoading}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white"
              aria-describedby={errors.password ? 'reg-password-error' : undefined}
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
            <p id="reg-password-error" className="mt-1 text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="reg-confirm" className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
            Confirm Password <span className="text-rose-400">*</span>
          </label>
          <div className={inputBase(errors.confirmPassword)}>
            <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Repeat your password"
              disabled={isLoading}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white"
              aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="reg-confirm-error" className="mt-1 text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.confirmPassword}
            </p>
          )}
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
              Creating account...
            </>
          ) : (
            'Create Free Account'
          )}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 mt-6 text-xs text-slate-500 dark:text-slate-400">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-extrabold text-sky-500 hover:underline">
            Login
          </Link>
        </p>
        <Link to="/" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-sky-500">
          <ArrowLeft className="w-3 h-3" /> Back to Home Page
        </Link>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;