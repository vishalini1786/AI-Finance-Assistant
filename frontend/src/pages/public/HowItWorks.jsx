import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import InteractiveTiltCard from '../../components/common/InteractiveTiltCard';
import { 
  Link2, 
  Cpu, 
  PieChart, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap 
} from 'lucide-react';

export const HowItWorksPage = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Connect & Ingest Accounts',
      desc: 'Link bank statements or export UPI transaction files securely using zero-knowledge encryption.',
      icon: Link2,
      preview: {
        heading: 'Step 1: Ingestion Verified',
        sub: '3 Accounts synced (HDFC, ICICI, Zerodha)',
        metric: '1,420 Statements Processed',
        badge: 'AES-256 Secured'
      }
    },
    {
      num: '02',
      title: 'AI Analyzes Spending Vectors',
      desc: 'Neural classification tags expenses, identifies recurring bills, and flags subscription anomalies.',
      icon: Cpu,
      preview: {
        heading: 'Step 2: Neural Insights Active',
        sub: 'Category mapping precision: 99.8%',
        metric: '₹6,450 Discretionary Spend Identified',
        badge: 'Real-Time Inference'
      }
    },
    {
      num: '03',
      title: 'Dynamic Budgeting & Tax Guidance',
      desc: 'Automated allocation engines dynamically calculate safe-to-spend limits and 80C tax optimization.',
      icon: PieChart,
      preview: {
        heading: 'Step 3: Smart Budgets Configured',
        sub: 'Safe-to-spend buffer: ₹18,500/mo',
        metric: '₹55,000 Remaining 80C Tax Opportunity',
        badge: 'Auto Balanced'
      }
    },
    {
      num: '04',
      title: 'Accelerate Wealth Growth',
      desc: 'Watch savings accumulate automatically with continuous 24/7 financial copilot guidance.',
      icon: TrendingUp,
      preview: {
        heading: 'Step 4: Autonomous Wealth Growth',
        sub: 'Health score: 92/100',
        metric: '₹42,500 Estimated Annual Savings',
        badge: 'Goal On Track'
      }
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="py-16 px-6 max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest bg-sky-50 dark:bg-sky-950 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
            Simple 4-Step Process
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            How FinMan Powers Your Money.
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
            Hover or click each step to preview live data states in real time.
          </p>
        </div>

        {/* Step-by-Step Interactive Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Timeline Selector List */}
          <div className="lg:col-span-6 space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  onMouseEnter={() => setActiveStep(idx)}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 border-sky-400 shadow-xl shadow-sky-500/10 scale-[1.02]'
                      : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                      isActive ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {step.num}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {step.title}
                        {isActive && <CheckCircle2 className="w-4 h-4 text-sky-500" />}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Live Data State Preview Box */}
          <div className="lg:col-span-6">
            <InteractiveTiltCard className="p-8 bg-slate-900 text-white border-slate-800 shadow-2xl min-h-[380px] flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                      {steps[activeStep].preview.heading}
                    </span>
                  </div>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-3 py-1 rounded-full font-bold">
                    {steps[activeStep].preview.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-black text-white">{steps[activeStep].preview.metric}</div>
                  <p className="text-xs text-slate-400 font-medium">{steps[activeStep].preview.sub}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Zap className="w-4 h-4" /> Live Engine Output:
                  </div>
                  <p className="text-slate-300">
                    "Step {activeStep + 1} processing complete with zero data exposure to external servers."
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Interactive Demo Step {activeStep + 1} of 4</span>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/25"
                >
                  Start Now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </InteractiveTiltCard>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksPage;