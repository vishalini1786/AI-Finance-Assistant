import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export const OnboardingLayout = ({ children, currentStep, totalSteps }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 transition-colors">
      <header className="p-6 flex justify-between items-center max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xl font-black">FinMan</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
        <ThemeToggle />
      </header>

      <div className="max-w-2xl w-full mx-auto px-6 py-6">
        {/* Animated Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span className="text-sky-500 font-black">{Math.round((currentStep / totalSteps) * 100)}% Completed</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-sky-400 to-indigo-500 h-2 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Card Container */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl min-h-[480px] flex flex-col justify-between">
          {children}
        </div>
      </div>

      <footer className="p-6 text-center text-xs text-slate-400">
        Personalizing FinMan AI Finance Assistant
      </footer>
    </div>
  );
};

export default OnboardingLayout;