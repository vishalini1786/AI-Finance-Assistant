import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import HeroSection from '../../components/landing/HeroSection';
import InteractiveTiltCard from '../../components/common/InteractiveTiltCard';
import MagneticButton from '../../components/common/MagneticButton';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  PieChart, 
  Lock, 
  Unlock, 
  Bot, 
  CheckCircle2, 
  Calculator, 
  CreditCard, 
  FileText, 
  Activity,
  ChevronRight,
  Calendar,
  Scan,
  BarChart3,
  Target,
  GraduationCap,
  Briefcase,
  UserCheck,
  Check,
  X,
  Sliders
} from 'lucide-react';

export const Home = () => {
  // Section 1: How FinMan Works Active Step State
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Connect',
      subtitle: 'Bank-Grade Sync',
      desc: 'Seamlessly link your financial accounts or input records with zero-knowledge AES-256 local encryption.',
      detail: 'Supports automatic UPI statement parsing, bank account aggregation, and manual transaction logs with zero data tracking.',
      icon: ShieldCheck
    },
    {
      num: '02',
      title: 'Track',
      subtitle: 'Real-Time Intelligence',
      desc: 'AI automatically parses receipts, tags expense categories, and flags redundant monthly subscriptions.',
      detail: 'Neural models categorize 99.8% of daily expenditures instantly without manual tagging or spreadsheet entries.',
      icon: Activity
    },
    {
      num: '03',
      title: 'Understand',
      subtitle: 'Health & Habit Analytics',
      desc: 'Get deep financial health scores, cash flow velocity metrics, and spending vulnerability reports.',
      detail: 'Visualizes your cash runway, emergency savings buffer, and habit metrics with instant actionable indicators.',
      icon: PieChart
    },
    {
      num: '04',
      title: 'Improve',
      subtitle: 'Predictive Growth',
      desc: 'Forecast future cash flow, optimize tax savings under Section 80C, and get 24/7 AI financial guidance.',
      detail: 'Predicts upcoming bills and provides step-by-step wealth optimization plans tailored to your exact lifestyle.',
      icon: TrendingUp
    }
  ];

  // Section 2: Interactive Feature Showcase State
  const [selectedFeature, setSelectedFeature] = useState(0);

  const features = [
    {
      id: 'expense',
      title: 'Expense Tracking',
      desc: 'Auto-detects transaction types, flags redundant subscriptions, and tags expenses in real time.',
      icon: CreditCard,
      preview: {
        header: 'Real-Time Expense Engine',
        metric: '₹28,450 Outflow',
        sub: '14 Transactions categorized today',
        type: 'transactions'
      }
    },
    {
      id: 'budget',
      title: 'Budget Management',
      desc: 'Dynamic spending limits that adapt to recurring commitments, salary cycles, and personal priorities.',
      icon: PieChart,
      preview: {
        header: 'Smart Budget Envelope',
        metric: '92% Safe Buffer',
        sub: '₹14,200 remaining in monthly allocation',
        type: 'budget'
      }
    },
    {
      id: 'ai',
      title: 'AI Finance Assistant',
      desc: 'Conversational 24/7 financial copilot for buy vs rent analysis, spending audits, and wealth tips.',
      icon: Bot,
      preview: {
        header: 'Neural Copilot Active',
        metric: 'LLM-v4.2 Connected',
        sub: 'Instant answers to complex money queries',
        type: 'ai'
      }
    },
    {
      id: 'predict',
      title: 'Expense Prediction',
      desc: 'Machine learning algorithms model future balances and estimate safe-to-spend runways weeks ahead.',
      icon: TrendingUp,
      preview: {
        header: 'Predictive Cash Flow Forecast',
        metric: '₹31,200 Est. Outflow Next Month',
        sub: 'Model accuracy: 96.4%',
        type: 'prediction'
      }
    },
    {
      id: 'health',
      title: 'Financial Health Score',
      desc: 'Real-time 0-100 financial vulnerability score based on savings rate, debt, and budget habits.',
      icon: Activity,
      preview: {
        header: 'Health Score Meter',
        metric: '82 / 100 (Strong)',
        sub: 'Vulnerability: Low • Runway: 6.2 months',
        type: 'health'
      }
    },
    {
      id: 'invest',
      title: 'Investment Tracking',
      desc: 'Consolidate mutual funds, stocks, fixed deposits, and provident funds into one intelligent view.',
      icon: BarChart3,
      preview: {
        header: 'Portfolio Compounding',
        metric: '+14.8% CAGR',
        sub: '₹6,84,000 projected portfolio in 3 years',
        type: 'investment'
      }
    },
    {
      id: 'calendar',
      title: 'Smart Financial Calendar',
      desc: 'Visual timeline for upcoming bill payments, SIP dates, salary credits, and tax deadlines.',
      icon: Calendar,
      preview: {
        header: 'Upcoming Cash Commitments',
        metric: '3 Pending Bills This Week',
        sub: 'Electricity (₹2,100) due in 3 days',
        type: 'calendar'
      }
    },
    {
      id: 'ocr',
      title: 'OCR Document Processing',
      desc: 'Scan receipts, tax invoices, and bank PDFs with instant text extraction and expense filing.',
      icon: Scan,
      preview: {
        header: 'Document Scanner Engine',
        metric: 'Receipt Parsed in 0.4s',
        sub: 'Swiggy Invoice #8942 • ₹450 Tax Deductible',
        type: 'ocr'
      }
    },
    {
      id: 'reports',
      title: 'Financial Reports',
      desc: 'Generate comprehensive monthly profit/loss, cash flow, and tax audit reports in one click.',
      icon: FileText,
      preview: {
        header: 'Automated Monthly Audit',
        metric: 'August Financial Report',
        sub: 'Exportable as encrypted PDF/Excel',
        type: 'reports'
      }
    },
    {
      id: 'simulation',
      title: 'Life Event Simulation',
      desc: 'Simulate major milestones like purchasing a home, career changes, or starting a business.',
      icon: Target,
      preview: {
        header: 'Financial Scenario Simulator',
        metric: 'Home Loan Impact Analysis',
        sub: '₹45,000 EMI fits safely into cash flow',
        type: 'simulation'
      }
    }
  ];

  // Section 3: AI Sandbox Conversation State
  const [activePrompt, setActivePrompt] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const prompts = [
    {
      chip: '🍔 Can I reduce my spending this month?',
      question: 'Can I reduce my spending this month?',
      answer: 'Your food and shopping expenses are higher than your usual monthly average. Reducing these categories by 15% could help you save ₹3,800 and stay comfortably within your budget.',
      category: 'Expense Optimization',
      recommendation: 'Cap dining out at ₹1,200/week.'
    },
    {
      chip: '🔍 Where am I overspending?',
      question: 'Where am I overspending right now?',
      answer: 'You spent ₹6,450 across 14 orders on delivery apps this month. That is 22% higher than your target dining limit. Cooking 3 more meals next week will save approximately ₹2,100!',
      category: 'Category Audit',
      recommendation: 'Set automated Swiggy threshold alert.'
    },
    {
      chip: '💻 Can I afford a new purchase?',
      question: 'Can I buy a ₹25,000 laptop without breaking my budget?',
      answer: 'Yes! Based on your current ₹4,82,450 net cash reserve and ₹18,500 monthly surplus, you can purchase it upfront or use a 3-month No-Cost EMI (₹8,333/mo) with zero stress on your emergency buffer.',
      category: 'Purchase Analysis',
      recommendation: 'Option: 3-month No-Cost EMI recommended.'
    },
    {
      chip: '📈 What will my expenses look like next month?',
      question: 'What will my expenses look like next month?',
      answer: 'Based on your recurring rent (₹25,000), insurance (₹4,200), and utility patterns, FinMan forecasts next month outflow at ₹31,200. You will have a safe net surplus of ₹43,800.',
      category: 'Predictive Forecast',
      recommendation: 'Auto-allocate surplus to emergency buffer.'
    }
  ];

  const handlePromptSelect = (idx) => {
    setIsTyping(true);
    setActivePrompt(idx);
    setTimeout(() => {
      setIsTyping(false);
    }, 450);
  };

  // Section 4: Expense Prediction Chart Data Hover State
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

  const predictionPoints = [
    { month: 'Mar', value: 26500, type: 'historical', cat: 'Actual Outflow' },
    { month: 'Apr', value: 29000, type: 'historical', cat: 'Actual Outflow' },
    { month: 'May', value: 27800, type: 'historical', cat: 'Actual Outflow' },
    { month: 'Jun', value: 31000, type: 'historical', cat: 'Actual Outflow' },
    { month: 'Jul', value: 28450, type: 'historical', cat: 'Actual Outflow' },
    { month: 'Aug (Now)', value: 29800, type: 'current', cat: 'Current Month' },
    { month: 'Sep (AI)', value: 31200, type: 'predicted', cat: 'AI Projected' },
    { month: 'Oct (AI)', value: 29500, type: 'predicted', cat: 'AI Projected' },
    { month: 'Nov (AI)', value: 32000, type: 'predicted', cat: 'AI Projected' }
  ];

  // Section 5: Financial Health Breakdown Hover State
  const [hoveredHealthComponent, setHoveredHealthComponent] = useState(null);

  const healthComponents = [
    { name: 'Savings Rate', score: 88, weight: '30%', tooltip: 'Your savings rate of 25% contributes very positively to your financial health.' },
    { name: 'Spending Velocity', score: 82, weight: '25%', tooltip: 'Your spending pace is controlled and evenly distributed across the month.' },
    { name: 'Budget Adherence', score: 92, weight: '20%', tooltip: 'You have stayed within set category envelopes for 3 consecutive months.' },
    { name: 'Debt Vulnerability', score: 95, weight: '15%', tooltip: 'Low debt-to-income ratio provides high financial independence.' },
    { name: 'Goal Milestones', score: 78, weight: '10%', tooltip: 'You are on track for 2 out of 3 active financial goals.' }
  ];

  // Section 6: Before vs After Draggable Slider State
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderMove = (clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPos(percent);
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  // Section 7: User Personas State
  const personas = [
    {
      role: 'Student',
      icon: GraduationCap,
      badge: 'Budget Building',
      quote: 'Track daily spending, control budgets and build saving habits.',
      challenge: 'Managing limited pocket money, hostel bills, and recurring social expenses.',
      solution: 'Automated micro-budgeting and Swiggy/Zomato expense alerts.',
      features: ['Daily Pocket Budget', 'Micro-Savings Buckets', 'Subscription Tracker']
    },
    {
      role: 'Working Professional',
      icon: Briefcase,
      badge: 'Wealth Optimization',
      quote: 'Manage income, recurring payments, investments and monthly budgets.',
      challenge: 'Balancing monthly EMIs, credit card bills, SIPs, and tax saving limits.',
      solution: 'Section 80C automated optimizer, cash flow forecasting, and salary allocation.',
      features: ['80C Tax Optimizer', 'Cash Flow Forecast', 'Multi-Account Sync']
    },
    {
      role: 'Freelancer',
      icon: UserCheck,
      badge: 'Variable Cash Flow',
      quote: 'Track irregular income, expenses and financial goals.',
      challenge: 'Handling unpredictable client pay cycles, quarterly taxes, and emergency buffers.',
      solution: 'Dynamic emergency runway calculator and client payout tracking.',
      features: ['Emergency Runway Calculator', 'Tax Buffer Vault', 'Dynamic Budgeting']
    }
  ];

  // Section 8: Live Savings Calculator State
  const [income, setIncome] = useState(75000);
  const [savingsPercent, setSavingsPercent] = useState(25);
  const monthlySavings = (income * savingsPercent) / 100;
  const annualWealth = monthlySavings * 12;
  const healthScore = Math.min(98, Math.max(50, Math.round(55 + (savingsPercent * 0.9) + (income > 50000 ? 10 : 5))));
  const savingsRunway = (monthlySavings * 12 / (income * 0.75)).toFixed(1);

  // Section 9: Security Lock State
  const [isVaultLocked, setIsVaultLocked] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-sky-500 selection:text-white">
      <Navbar />

      {/* SECTION 1: HERO */}
      <HeroSection />

      {/* SECTION 2: TRUST & PERFORMANCE METRICS */}
      <section className="py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200/60 dark:border-slate-800/60 transition-colors">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { metric: '99.8%', label: 'AI Categorization Precision', sub: 'Instant receipt & UPI parsing' },
            { metric: '₹42,500', label: 'Avg Annual Savings', sub: 'Per active user profile' },
            { metric: '120k+', label: 'Accounts Secured', sub: 'Zero-knowledge architecture' },
            { metric: '<15ms', label: 'Model Response Latency', sub: 'Ultra-fast neural inference' }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-center hover:border-sky-400/50 transition-all hover:-translate-y-1 hover:shadow-lg group"
            >
              <div className="text-3xl sm:text-4xl font-black text-sky-500 tracking-tight group-hover:scale-105 transition-transform">{item.metric}</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">{item.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: HOW FINMAN WORKS (4-STEP JOURNEY) */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-500 bg-sky-50 dark:bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
              Interactive 4-Step Journey
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              How FinMan Elevates Your Financial Intelligence.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              Click or hover over any step to experience the interactive progression.
            </p>
          </div>

          {/* Step Cards Grid with Connecting Progress Line */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Background Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${((activeStep + 1) / 4) * 100}%` }}
              />
            </div>

            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  onMouseEnter={() => setActiveStep(idx)}
                  className={`relative z-10 p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 border-sky-400 shadow-2xl scale-105 shadow-sky-500/10'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-sky-400/40 hover:-translate-y-1'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-2xl font-black transition-colors ${isActive ? 'text-sky-500' : 'text-slate-400 dark:text-slate-600'}`}>
                      {step.num}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-sky-500 text-white rotate-6 shadow-md shadow-sky-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
                  <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider block mb-2">{step.subtitle}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                    {step.desc}
                  </p>

                  <div className={`text-[11px] p-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-slate-700 dark:text-slate-300 font-semibold'
                      : 'opacity-0 h-0 p-0 overflow-hidden'
                  }`}>
                    💡 {step.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4: INTERACTIVE FEATURE SHOWCASE */}
      <section className="py-24 px-6 bg-slate-100/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-500 bg-sky-50 dark:bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
              Complete Intelligence Suite
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Engineered for Total Financial Mastery.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              Hover over any capability to view its real-time interactive preview.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Feature Selector Grid */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                const isSelected = selectedFeature === idx;
                return (
                  <div
                    key={feat.id}
                    onMouseEnter={() => setSelectedFeature(idx)}
                    onClick={() => setSelectedFeature(idx)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-sky-500 shadow-xl shadow-sky-500/10 translate-x-1'
                        : 'bg-white/60 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800/70 hover:border-sky-400/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-sky-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        {feat.title}
                        <ChevronRight className={`w-3.5 h-3.5 text-sky-500 transition-transform ${isSelected ? 'translate-x-1' : 'opacity-0'}`} />
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Dynamic Interactive Preview Display */}
            <div className="lg:col-span-6">
              <div className="p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl min-h-[420px] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header info */}
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/30">
                        {React.createElement(features[selectedFeature].icon, { className: 'w-5 h-5' })}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{features[selectedFeature].preview.header}</h3>
                        <span className="text-[10px] text-sky-400 font-mono">Live Interactive Module</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                      Active Feature
                    </span>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="text-2xl font-black text-sky-400">{features[selectedFeature].preview.metric}</div>
                    <div className="text-xs font-bold text-slate-300">{features[selectedFeature].preview.sub}</div>

                    {/* Preview Graphic Simulations */}
                    {features[selectedFeature].preview.type === 'transactions' && (
                      <div className="space-y-2 pt-2">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between text-xs">
                          <span>🍔 Swiggy Gourmet</span><span className="text-rose-400 font-bold">- ₹450</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between text-xs">
                          <span>💻 TechCorp Salary</span><span className="text-emerald-400 font-bold">+ ₹1,20,000</span>
                        </div>
                      </div>
                    )}

                    {features[selectedFeature].preview.type === 'budget' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs font-bold"><span>Category Envelope</span><span>82% Used</span></div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div className="bg-sky-400 h-2 rounded-full" style={{ width: '82%' }}></div>
                        </div>
                      </div>
                    )}

                    {features[selectedFeature].preview.type === 'ai' && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                        "Your discretionary dining spend increased by 12% this week. Keep up your ₹15,000 monthly SIP!"
                      </div>
                    )}

                    {features[selectedFeature].preview.type === 'prediction' && (
                      <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800 text-xs text-indigo-200">
                        📈 Machine learning forecasts ₹31,200 total spending next month based on bill cycles.
                      </div>
                    )}

                    {features[selectedFeature].preview.type === 'ocr' && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
                        <Scan className="w-4 h-4 text-emerald-400 animate-pulse" /> OCR Engine parsed tax invoice automatically!
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs font-bold text-slate-400 relative z-10">
                  <span>Explore this module in your dashboard</span>
                  <Link to="/register" className="text-sky-400 hover:text-sky-300 flex items-center gap-1">
                    Try Free <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: CONVERSATIONAL AI PLAYGROUND */}
      <section className="py-24 px-6 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-sky-500 uppercase tracking-widest bg-sky-50 dark:bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
              Interactive AI Sandbox
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Test FinMan's Conversational Intelligence.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Click any suggested prompt below to simulate FinMan's real-time AI response.
            </p>
          </div>

          {/* Interactive Chips Selector */}
          <div className="flex flex-wrap justify-center gap-3">
            {prompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptSelect(idx)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  activePrompt === idx
                    ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 scale-105'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-sky-400'
                }`}
              >
                {p.chip}
              </button>
            ))}
          </div>

          {/* AI Response Display Box */}
          <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-6 hover:shadow-sky-500/10 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm block">FinMan Financial Copilot</span>
                  <span className="text-[10px] text-slate-400">{prompts[activePrompt].category} • Neural Mode</span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                Live Simulated Stream
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold text-sky-300">
                User Query: "{prompts[activePrompt].question}"
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed min-h-[100px] flex items-center">
                {isTyping ? (
                  <div className="flex items-center gap-2 text-sky-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                    Analyzing spending records & computing recommendation...
                  </div>
                ) : (
                  <div>{prompts[activePrompt].answer}</div>
                )}
              </div>

              {!isTyping && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-300 block mb-0.5">Actionable Suggestion:</span>
                    <span className="text-slate-300">{prompts[activePrompt].recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: AI PREDICTION VISUALIZATION */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-4 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-900">
              Predictive Neural Engine
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Predict Expenses Before They Happen.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              Historical Spending ➔ AI Analysis ➔ Future Expense Prediction
            </p>
          </div>

          {/* Interactive Prediction Chart Box */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Cash Flow & Expense Prediction Timeline</h3>
                <p className="text-xs text-slate-400">Hover over chart points to view historical vs predicted spending</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500"></span> Historical</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-indigo-300"></span> AI Projected</span>
              </div>
            </div>

            {/* Simulated Dynamic Line & Dots Chart */}
            <div className="h-48 w-full relative flex items-end justify-between px-4 pt-8">
              <svg className="absolute inset-0 w-full h-full text-indigo-500/10" preserveAspectRatio="none" viewBox="0 0 100 50">
                <path d="M0,35 L12,30 L25,32 L37,25 L50,30 L62,28 L75,22 L87,26 L100,20 L100,50 L0,50 Z" fill="currentColor" />
                <path d="M0,35 L12,30 L25,32 L37,25 L50,30 L62,28" fill="none" stroke="#38BDF8" strokeWidth="3" />
                <path d="M62,28 L75,22 L87,26 L100,20" fill="none" stroke="#6366F1" strokeWidth="3" strokeDasharray="4 4" />
              </svg>

              {predictionPoints.map((pt, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredDataPoint(idx)}
                  onMouseLeave={() => setHoveredDataPoint(null)}
                  className="relative z-10 flex flex-col items-center cursor-pointer group"
                >
                  {/* Hover Tooltip */}
                  {hoveredDataPoint === idx && (
                    <div className="absolute -top-14 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl font-medium whitespace-nowrap z-30 animate-in fade-in">
                      <div className="font-bold text-sky-400">{pt.month} • ₹{pt.value.toLocaleString()}</div>
                      <div className="text-slate-300">{pt.cat}</div>
                    </div>
                  )}

                  {/* Dot */}
                  <div className={`w-3.5 h-3.5 rounded-full transition-transform group-hover:scale-150 ${
                    pt.type === 'historical'
                      ? 'bg-sky-500'
                      : pt.type === 'current'
                      ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                      : 'bg-indigo-500 border-2 border-white dark:border-slate-900'
                  }`} />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2">{pt.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FINANCIAL HEALTH SECTION */}
      <section className="py-24 px-6 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Score Gauge */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-6">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/60 px-4 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900">
              Interactive Audit
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Your Financial Health Score: <span className="text-sky-500">82 / 100</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Hover over each health component on the right to understand how FinMan computes your overall vulnerability index.
            </p>
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs font-semibold text-sky-700 dark:text-sky-300">
              🛡️ Sample Demo Calculation based on 5 core financial pillars.
            </div>
          </div>

          {/* Right Component Breakdown Bars */}
          <div className="lg:col-span-7 space-y-4">
            {healthComponents.map((comp, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredHealthComponent(idx)}
                onMouseLeave={() => setHoveredHealthComponent(null)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hoveredHealthComponent === idx
                    ? 'bg-white dark:bg-slate-900 border-sky-400 shadow-xl scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-slate-900 dark:text-white">{comp.name}</span>
                  <span className="text-sky-500">{comp.score} / 100 (Weight {comp.weight})</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-sky-400 to-indigo-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${comp.score}%` }} 
                  />
                </div>
                {hoveredHealthComponent === idx && (
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium animate-in fade-in">
                    💡 {comp.tooltip}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: INTERACTIVE "BEFORE VS AFTER" SLIDER */}
      <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400 bg-sky-500/20 px-4 py-1.5 rounded-full border border-sky-400/30">
              Interactive Comparison
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Life Without FinMan vs Life With FinMan.
            </h2>
            <p className="text-sm text-slate-300 font-medium">
              Drag the interactive slider below to compare manual tracking with autonomous AI financial mastery.
            </p>
          </div>

          {/* Draggable Comparison Slider Container */}
          <div
            ref={sliderRef}
            role="slider"
            tabIndex={0}
            aria-label="Life Without FinMan versus Life With FinMan"
            aria-valuenow={sliderPos}
            aria-valuemin={0}
            aria-valuemax={100}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setSliderPos((p) => Math.max(0, p - 5));
              if (e.key === 'ArrowRight') setSliderPos((p) => Math.min(100, p + 5));
            }}
            onPointerDown={(e) => {
              setIsDragging(true);
              e.currentTarget.setPointerCapture?.(e.pointerId);
              handleSliderMove(e.clientX);
            }}
            onPointerMove={(e) => {
              if (isDragging) handleSliderMove(e.clientX);
            }}
            onPointerUp={(e) => {
              setIsDragging(false);
              try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch (_) {}
            }}
            onPointerCancel={() => setIsDragging(false)}
            style={{ touchAction: 'none' }}
            className="relative w-full min-h-[420px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl select-none cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {/* RIGHT PANEL: WITH FINMAN (Active from sliderPos to 100%) */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 p-6 sm:p-10 flex flex-col justify-between"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              <div className="ml-auto max-w-sm sm:max-w-md w-full flex flex-col justify-between h-full text-right sm:items-end">
                <div className="flex items-center justify-end gap-2 sm:gap-3 text-sky-400 font-extrabold text-sm sm:text-lg mb-4">
                  <span>WITH FINMAN (Autonomous Intelligence)</span>
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                </div>
                <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm font-semibold my-auto">
                  <li className="flex items-center justify-end gap-2.5 sm:gap-3 text-emerald-300">
                    <span>Centralized real-time multi-bank data</span>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-400" />
                  </li>
                  <li className="flex items-center justify-end gap-2.5 sm:gap-3 text-emerald-300">
                    <span>Automated AI expense categorization</span>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-400" />
                  </li>
                  <li className="flex items-center justify-end gap-2.5 sm:gap-3 text-emerald-300">
                    <span>Predictive cash flow & 80C tax optimization</span>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-400" />
                  </li>
                  <li className="flex items-center justify-end gap-2.5 sm:gap-3 text-emerald-300">
                    <span>24/7 Conversational AI Financial Advisor</span>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-400" />
                  </li>
                </ul>
                <div className="pt-4 flex justify-end">
                  <span className="text-[11px] sm:text-xs text-sky-400 font-bold bg-sky-500/10 border border-sky-400/30 px-3 py-1 rounded-full">
                    ✨ Complete Financial Peace of Mind
                  </span>
                </div>
              </div>
            </div>

            {/* LEFT PANEL: WITHOUT FINMAN (Active from 0% to sliderPos) */}
            <div
              className="absolute inset-0 bg-slate-950 p-6 sm:p-10 flex flex-col justify-between border-r border-sky-400/50"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <div className="max-w-sm sm:max-w-md w-full flex flex-col justify-between h-full text-left">
                <div className="flex items-center gap-2 sm:gap-3 text-rose-400 font-extrabold text-sm sm:text-lg mb-4">
                  <X className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>WITHOUT FINMAN (Manual Method)</span>
                </div>
                <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm font-semibold my-auto">
                  <li className="flex items-center gap-2.5 sm:gap-3 text-rose-300">
                    <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-400" />
                    <span>Manual tracking on chaotic spreadsheets</span>
                  </li>
                  <li className="flex items-center gap-2.5 sm:gap-3 text-rose-300">
                    <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-400" />
                    <span>Scattered financial accounts & lost receipts</span>
                  </li>
                  <li className="flex items-center gap-2.5 sm:gap-3 text-rose-300">
                    <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-400" />
                    <span>No personalized prediction or tax guidance</span>
                  </li>
                  <li className="flex items-center gap-2.5 sm:gap-3 text-rose-300">
                    <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-400" />
                    <span>Limited financial awareness & high stress</span>
                  </li>
                </ul>
                <div className="pt-4 flex justify-start">
                  <span className="text-[11px] sm:text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-400/30 px-3 py-1 rounded-full">
                    ⚠️ High Financial Friction
                  </span>
                </div>
              </div>
            </div>

            {/* Slider Handle Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-sky-400 shadow-2xl pointer-events-none z-30"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xl border-2 border-white cursor-grab">
                <Sliders className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9: USER SCENARIOS / PERSONAS */}
      <section className="py-24 px-6 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-sky-500 bg-sky-50 dark:bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
              Designed for Your Financial Journey
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Tailored Personas for Every Goal.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Hover over each profile to discover how FinMan addresses your specific financial situation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {personas.map((p, idx) => {
              const Icon = p.icon;
              return (
                <InteractiveTiltCard
                  key={idx}
                  className="p-8 flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-500 flex items-center justify-center font-bold">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950 text-sky-500 border border-sky-200 dark:border-sky-900 px-3 py-1 rounded-full">
                        {p.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p.role}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-1 font-mono">
                        "{p.quote}"
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="text-xs">
                        <span className="font-bold text-rose-500 block mb-0.5">Challenge:</span>
                        <span className="text-slate-600 dark:text-slate-400">{p.challenge}</span>
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-emerald-500 block mb-0.5">FinMan Solution:</span>
                        <span className="text-slate-600 dark:text-slate-400">{p.solution}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {p.features.map((f, fIdx) => (
                      <span key={fIdx} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </InteractiveTiltCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 10: LIVE SAVINGS & HEALTH CALCULATOR */}
      <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold">
              <Calculator className="w-4 h-4 text-sky-400" /> Interactive Simulation Widget
            </span>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight">
              Calculate Your Live Wealth & Runway.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Adjust income and savings sliders to calculate your health score and emergency runway in real time.
            </p>
          </div>

          <div className="lg:col-span-7 bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monthly Net Income</label>
                <span className="text-xl font-black text-sky-400">₹{income.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="20000"
                max="500000"
                step="5000"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Target Monthly Savings</label>
                <span className="text-xl font-black text-emerald-400">{savingsPercent}% (₹{monthlySavings.toLocaleString()}/mo)</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={savingsPercent}
                onChange={(e) => setSavingsPercent(Number(e.target.value))}
                className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</span>
                <div className="text-2xl font-black text-sky-400 mt-1">{healthScore} / 100</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Wealth</span>
                <div className="text-xl font-black text-emerald-400 mt-1">₹{annualWealth.toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Runway Buffer</span>
                <div className="text-xl font-black text-purple-400 mt-1">{savingsRunway} Mo</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11: HIGH-CONVERSION CTA BANNER */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto p-12 rounded-3xl bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 text-white text-center shadow-2xl space-y-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl group-hover:bg-white/10 transition-colors"></div>
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Take Control of Your Financial Future.
            </h2>
            <p className="text-sm sm:text-base text-sky-100 max-w-xl mx-auto font-medium">
              Start understanding your money with FinMan. Join thousands of smart users optimizing their spending today.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <MagneticButton strength={0.3}>
                <Link
                  to="/register"
                  className="px-8 py-4 rounded-2xl bg-white text-slate-900 font-black text-sm shadow-2xl hover:bg-slate-100 transition-all hover:scale-105 inline-flex items-center gap-2"
                >
                  Get Started <ArrowRight className="w-4 h-4 text-sky-500" />
                </Link>
              </MagneticButton>

              <MagneticButton strength={0.2}>
                <Link
                  to="/features"
                  className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm backdrop-blur-md transition-all inline-flex items-center gap-2"
                >
                  Explore Features <ChevronRight className="w-4 h-4" />
                </Link>
              </MagneticButton>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 12: FOOTER */}
      <Footer />
    </div>
  );
};

export default Home;