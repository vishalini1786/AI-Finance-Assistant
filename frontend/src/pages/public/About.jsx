import React, { useState } from 'react';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import InteractiveTiltCard from '../../components/common/InteractiveTiltCard';
import { 
  Users, 
  Briefcase, 
  GraduationCap, 
  Laptop, 
  Rocket, 
  Home, 
  CheckCircle2, 
  Sparkles, 
  Target, 
  Milestone, 
  ArrowRight, 
  Bot 
} from 'lucide-react';

export const AboutPage = () => {
  // Persona Selector Matrix State
  const [selectedPersona, setSelectedPersona] = useState('student');

  const personas = {
    student: {
      title: 'Students & Interns',
      icon: GraduationCap,
      badge: 'Pocket Money & Stipends',
      painPoint: 'Tight pocket money, frequent dining expenses with friends, and tracking exam/course subscriptions.',
      budgetTemplate: '50% College Essentials, 30% Social & Dining, 20% Emergency Savings',
      aiBehavior: 'Strict Dining Limit Alerts & Low-Cost Micro-Savings Nudges'
    },
    professional: {
      title: 'Working Professionals',
      icon: Briefcase,
      badge: 'Salary & Tax Optimization',
      painPoint: 'High income tax burden, managing SIP investments, tracking home rent receipts, and credit card EMI management.',
      budgetTemplate: '50% Fixed Liabilities (Rent/EMI), 30% Investments & SIPs, 20% Discretionary',
      aiBehavior: 'Section 80C Tax Maximizer & Automatic Salary Allocation Rules'
    },
    freelancer: {
      title: 'Freelancers & Consultants',
      icon: Laptop,
      badge: 'Variable Monthly Income',
      painPoint: 'Unpredictable cash inflow, delayed client invoices, quarterly advance tax payments, and irregular savings.',
      budgetTemplate: '40% Living Runway Buffer, 30% Business Expenses & Tax, 30% Personal Wealth',
      aiBehavior: 'Variable Income Smoothing & Safe-to-Spend Buffer Calculation'
    },
    entrepreneur: {
      title: 'Entrepreneurs & Founders',
      icon: Rocket,
      badge: 'Business & Personal Split',
      painPoint: 'Separating business capital from personal expenses, payroll reserves, and managing aggressive investment risks.',
      budgetTemplate: '45% Equity Reinvestment, 35% Household Reserves, 20% Liquid Emergency Fund',
      aiBehavior: 'Capital Flow Velocity & Risk Index Monitoring'
    },
    homemaker: {
      title: 'Homemakers & Family Managers',
      icon: Home,
      badge: 'Household Expense Budgeting',
      painPoint: 'Balancing monthly grocery costs, utility bills, school fees, and building household rainy-day funds.',
      budgetTemplate: '60% Family Expenses & Groceries, 20% Children Savings, 20% Reserve Fund',
      aiBehavior: 'Grocery Inflation Tracker & Household Savings Milestones'
    }
  };

  const roadmapMilestones = [
    { year: 'Q1 2025', title: 'Core Neural Parser Engine', desc: 'Released instant UPI & credit statement categorization module with 99.8% precision.' },
    { year: 'Q3 2025', title: 'Zero-Knowledge Security Vault', desc: 'Implemented AES-256 local data encryption and client-side key storage.' },
    { year: 'Q1 2026', title: 'Interactive AI Advisory Studio', desc: 'Integrated local LLM advisory models for conversational money management.' },
    { year: 'Q4 2026', title: 'Automated Tax & Wealth Acceleration', desc: 'Expanding 80C/80D tax optimization and auto-balancing goal buckets.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="py-16 px-6 max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest bg-sky-50 dark:bg-sky-950 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
            About FinMan AI
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Tailored Personal Finance for Every Lifepath.
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
            Select your persona profile to see how FinMan adapts budget templates and AI behaviors specifically for you.
          </p>
        </div>

        {/* SECTION 1: PERSONA MATCHER MATRIX */}
        <div className="space-y-8">
          <div className="flex flex-wrap justify-center gap-3">
            {Object.keys(personas).map((key) => {
              const Icon = personas[key].icon;
              const isActive = selectedPersona === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPersona(key)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold border transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 scale-105'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-sky-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{personas[key].title}</span>
                </button>
              );
            })}
          </div>

          <InteractiveTiltCard className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-bold">
                  {React.createElement(personas[selectedPersona].icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">
                    {personas[selectedPersona].badge}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {personas[selectedPersona].title} Strategy
                  </h3>
                </div>
              </div>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold px-3 py-1 rounded-full">
                Tailored Mode
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-rose-500 uppercase">Primary Pain Point</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {personas[selectedPersona].painPoint}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-sky-500 uppercase">Recommended Budgeting Rule</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {personas[selectedPersona].budgetTemplate}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-purple-500 uppercase">Tailored AI Behavior</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {personas[selectedPersona].aiBehavior}
                </p>
              </div>
            </div>
          </InteractiveTiltCard>
        </div>

        {/* SECTION 2: ENGINEERING VISION ROADMAP */}
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black">Engineering Roadmap & Milestones</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Continuous innovation in personal financial technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roadmapMilestones.map((m, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:border-sky-400/50 transition-all hover:-translate-y-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-sky-500 bg-sky-50 dark:bg-sky-950 px-3 py-1 rounded-full border border-sky-200 dark:border-sky-900">
                    {m.year}
                  </span>
                  <Milestone className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">{m.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;