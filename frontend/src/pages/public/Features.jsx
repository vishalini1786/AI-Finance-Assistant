import React, { useState } from 'react';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import InteractiveTiltCard from '../../components/common/InteractiveTiltCard';
import { 
  PieChart, 
  Activity, 
  TrendingUp, 
  Bot, 
  FileText, 
  ShieldCheck, 
  Layers, 
  Zap, 
  CreditCard, 
  Calendar,
  X,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const FeaturesPage = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedFeature, setSelectedFeature] = useState(null);

  const categories = ['All', 'Cash Flow', 'AI & ML', 'Security & Planning'];

  const features = [
    {
      id: 1,
      category: 'Cash Flow',
      title: 'Automated Expense Categorization',
      icon: Activity,
      summary: 'Instant categorization of UPI, credit card, and net banking transactions using lightweight NLP.',
      detail: 'Our algorithm parses transaction metadata in real time, automatically mapping bank statements into structured categories like Dining, Utilities, EMI, and Subscriptions with zero manual setup.',
      ledgerMock: [
        { desc: 'Starbucks Coffee', amount: '₹340.00', cat: 'Dining', status: 'Auto Tagged' },
        { desc: 'Netflix Subscription', amount: '₹649.00', cat: 'Entertainment', status: 'Recurring' }
      ]
    },
    {
      id: 2,
      category: 'Cash Flow',
      title: 'Predictive Runway Modeling',
      icon: TrendingUp,
      summary: 'Forecast balances 30 days ahead to prevent accidental overdrafts and overdraft fees.',
      detail: 'Uses historical cash velocity to project month-end bank balances and alert you if planned bills exceed anticipated income.',
      ledgerMock: [
        { desc: 'Projected Rent Deduction', amount: '₹22,000', cat: 'Housing', status: 'Due in 5 days' },
        { desc: 'Safe-To-Spend Buffer', amount: '₹14,500', cat: 'Liquidity', status: 'Clear' }
      ]
    },
    {
      id: 3,
      category: 'AI & ML',
      title: 'Conversational Money Advisor',
      icon: Bot,
      summary: 'Ask natural language queries like "Can I afford this trip?" and get immediate calculated answers.',
      detail: 'Integrates local LLM context to analyze your active budget, debt ratio, and upcoming commitments before giving personalized recommendations.',
      ledgerMock: [
        { desc: 'Goa Vacation Query', amount: '₹18,000', cat: 'Advisory', status: 'Affordable (EMI recommended)' }
      ]
    },
    {
      id: 4,
      category: 'AI & ML',
      title: 'Anomaly & Subscription Detector',
      icon: Zap,
      summary: 'Flag price hikes, duplicate bill charges, and forgotten trial auto-renewals instantly.',
      detail: 'Identifies unexpected recurring charge increases and alerts you before payments are debited from your account.',
      ledgerMock: [
        { desc: 'SaaS Tool Renewal', amount: '₹1,299.00', cat: 'Alert', status: 'Price increased +20%' }
      ]
    },
    {
      id: 5,
      category: 'Security & Planning',
      title: 'Section 80C Tax Optimizer',
      icon: FileText,
      summary: 'Maximize tax savings by tracking remaining deduction allowances under Indian Income Tax rules.',
      detail: 'Calculates unutilized caps in ELSS, PPF, NPS, and health insurance under Section 80C & 80D before the financial year deadline.',
      ledgerMock: [
        { desc: 'ELSS Mutual Fund SIP', amount: '₹12,500/mo', cat: 'Tax Saver', status: '80C Eligible' }
      ]
    },
    {
      id: 6,
      category: 'Security & Planning',
      title: 'Zero-Knowledge Security Vault',
      icon: ShieldCheck,
      summary: 'Client-side AES-256 encrypted records ensuring total data privacy.',
      detail: 'Your financial statement data is encrypted before being sent or stored, making your records accessible exclusively to your authenticated credentials.',
      ledgerMock: [
        { desc: 'Encrypted Vault Record', amount: '0x8F...A12B', cat: 'Security', status: 'AES-256 Verified' }
      ]
    }
  ];

  const filteredFeatures = activeCategory === 'All'
    ? features
    : features.filter((f) => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="py-16 px-6 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest bg-sky-50 dark:bg-sky-950 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
            Capability Deep Dive
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Designed for Complete Financial Precision.
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
            Select a category filter or click any feature card to inspect simulated live transactions.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-sky-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <InteractiveTiltCard
                key={feat.id}
                onClick={() => setSelectedFeature(feat)}
                className="p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/80 text-sky-500 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-500">
                      {feat.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {feat.summary}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-sky-500">
                  <span>Inspect Live Demo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </InteractiveTiltCard>
            );
          })}
        </div>

        {/* Feature Inspect Drawer / Modal */}
        {selectedFeature && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-6 relative overflow-hidden">
              <button
                onClick={() => setSelectedFeature(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center">
                  {React.createElement(selectedFeature.icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">{selectedFeature.category}</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedFeature.title}</h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedFeature.detail}
              </p>

              {/* Simulated Transaction Ledger Drawer */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Simulated Micro Ledger Output
                </span>
                {selectedFeature.ledgerMock.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{item.desc}</span>
                      <span className="text-[10px] text-slate-400">{item.cat}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sky-500 block">{item.amount}</span>
                      <span className="text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded font-bold">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="px-6 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-500/25"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FeaturesPage;