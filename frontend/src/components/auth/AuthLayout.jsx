import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, ShieldCheck, TrendingUp, PieChart } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header bar */}
      <header className="p-6 flex justify-between items-center max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight block leading-none">FinMan</span>
              <span className="text-[10px] font-bold text-sky-500 tracking-wider uppercase">AI Finance Personal Assistant</span>
            </div>
          </Link>
          <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">|</span>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-300 transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Form Container */}
      <div className="max-w-4xl w-full mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Branding Showcase Box */}
        <div className="hidden md:flex flex-col justify-between p-8 rounded-3xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 text-white shadow-2xl min-h-[480px] relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 top-20 w-32 h-32 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-tight">
              Your Intelligent Financial Assistant.
            </h2>
            <p className="text-sm text-sky-100 mt-4 leading-relaxed">
              Track expenses, manage budgets, understand your financial health, and receive personalized insights — all in one platform.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Smart Expense Tracking</p>
                <p className="text-[10px] text-sky-200">Automatic categorization & insights</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Budget Management</p>
                <p className="text-[10px] text-sky-200">Set, track & optimize your budgets</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Secure & Private</p>
                <p className="text-[10px] text-sky-200">JWT authentication · Bcrypt passwords</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>

      <footer className="p-6 text-center text-xs text-slate-400">
        © 2026 FinMan · AI Finance Personal Assistant
      </footer>
    </div>
  );
};

export default AuthLayout;