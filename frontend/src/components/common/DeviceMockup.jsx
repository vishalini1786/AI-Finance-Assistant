import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  CreditCard, 
  PieChart, 
  Bell, 
  ArrowUpRight, 
  CheckCircle2, 
  Smartphone, 
  Monitor,
  Activity,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

export const DeviceMockup = ({ 
  defaultMode = 'desktop',
  showToggle = true,
  className = ''
}) => {
  const [mode, setMode] = useState(defaultMode); // 'desktop' | 'mobile'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ai' | 'ledger' | 'budget'
  const [hoveredElement, setHoveredElement] = useState(null);

  const mockTransactions = [
    { id: 1, title: 'Swiggy Gourmet', cat: 'Food & Dining', amount: '- ₹450', type: 'expense', time: '10 mins ago', badge: 'AI Categorized' },
    { id: 2, title: 'TechCorp Salary', cat: 'Income', amount: '+ ₹1,20,000', type: 'income', time: 'Yesterday', badge: 'Auto Verified' },
    { id: 3, title: 'Zerodha SIP (Nifty 50)', cat: 'Investment', amount: '- ₹15,000', type: 'investment', time: '2 days ago', badge: '80C Eligible' }
  ];

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Mode Switcher pill */}
      {showToggle && (
        <div className="mb-6 inline-flex items-center gap-1.5 p-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-300/50 dark:border-slate-700/50 shadow-inner z-20">
          <button
            onClick={() => setMode('desktop')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              mode === 'desktop'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 scale-105'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop Dashboard</span>
          </button>
          <button
            onClick={() => setMode('mobile')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              mode === 'mobile'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 scale-105'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile FinMan Shell</span>
          </button>
        </div>
      )}

      {/* DESKTOP VIEW */}
      {mode === 'desktop' ? (
        <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 relative group/mockup hover:shadow-sky-500/10">
          {/* Browser Chrome Bar */}
          <div className="bg-slate-100 dark:bg-slate-850 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono w-1/2 justify-center shadow-inner">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">https://finman.ai/app/dashboard</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold">Live AI Active</span>
            </div>
          </div>

          {/* App Body Header */}
          <div className="p-6 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">FinMan Intelligence Suite</h3>
                <p className="text-[11px] text-slate-400">Real-Time Autonomous Wealth Monitor</p>
              </div>
            </div>

            {/* Interactive Screen Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-semibold">
              {['overview', 'ai', 'ledger', 'budget'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-sky-500 text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-sky-500'
                  }`}
                >
                  {tab === 'ai' ? 'AI Advisory' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-6 space-y-6 relative">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Metric 1: Net Cash Reserve */}
                  <div
                    onMouseEnter={() => setHoveredElement('cash')}
                    onMouseLeave={() => setHoveredElement(null)}
                    className="relative p-4 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-slate-850 dark:to-slate-800 border border-sky-200/50 dark:border-slate-700/50 hover:border-sky-400 transition-all hover:scale-[1.02] cursor-pointer group/item"
                  >
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Net Cash Reserve</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white mt-1">₹4,82,450.00</div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                      <TrendingUp className="w-3.5 h-3.5" /> +14.2% vs last month
                    </span>
                    {hoveredElement === 'cash' && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-xl font-medium whitespace-nowrap z-30 animate-in fade-in">
                        Total liquid cash available across linked accounts.
                      </div>
                    )}
                  </div>

                  {/* Metric 2: Financial Health Score */}
                  <div
                    onMouseEnter={() => setHoveredElement('health')}
                    onMouseLeave={() => setHoveredElement(null)}
                    className="relative p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 hover:border-sky-400 transition-all hover:scale-[1.02] cursor-pointer group/item"
                  >
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Financial Health</span>
                    <div className="text-xl font-black text-sky-500 mt-1">88 / 100</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-3">
                      <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" style={{ width: '88%' }}></div>
                    </div>
                    {hoveredElement === 'health' && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-xl font-medium whitespace-nowrap z-30 animate-in fade-in">
                        Overall score based on spending, savings and budget health.
                      </div>
                    )}
                  </div>

                  {/* Metric 3: AI Automated Savings */}
                  <div
                    onMouseEnter={() => setHoveredElement('savings')}
                    onMouseLeave={() => setHoveredElement(null)}
                    className="relative p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-400 transition-all hover:scale-[1.02] cursor-pointer group/item"
                  >
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">AI Automated Savings</span>
                    <div className="text-xl font-black text-emerald-500 mt-1">₹18,500.00</div>
                    <span className="text-[11px] text-slate-400 block mt-2">3 Goal Buckets active</span>
                    {hoveredElement === 'savings' && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-xl font-medium whitespace-nowrap z-30 animate-in fade-in">
                        Automated smart savings allocated towards wealth goals.
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Graph & Live Alerts Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Graph Visualizer */}
                  <div
                    onMouseEnter={() => setHoveredElement('velocity')}
                    onMouseLeave={() => setHoveredElement(null)}
                    className="relative md:col-span-2 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 hover:border-sky-400/50 transition-all group/graph"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-sky-500" /> Cash Flow Velocity
                      </h4>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                        Optimized
                      </span>
                    </div>

                    {/* Simulated SVG Graph */}
                    <div className="h-36 w-full relative flex items-end justify-between pt-4 px-2">
                      <svg className="absolute inset-0 w-full h-full text-sky-500/20 group-hover/graph:text-sky-500/30 transition-colors" preserveAspectRatio="none" viewBox="0 0 100 50">
                        <path d="M0,45 Q20,10 40,30 T80,15 T100,5 L100,50 L0,50 Z" fill="currentColor" />
                        <path d="M0,45 Q20,10 40,30 T80,15 T100,5" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                      </svg>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                        <div key={day} className="relative z-10 text-[10px] text-slate-400 font-semibold text-center hover:text-sky-400 transition-colors cursor-pointer">
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 mx-auto mb-1 opacity-75 group-hover/graph:scale-125 transition-transform"></div>
                          {day}
                        </div>
                      ))}
                    </div>
                    {hoveredElement === 'velocity' && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-3 py-1 rounded-lg shadow-xl font-medium z-30 animate-in fade-in">
                        Real-time speed and stability of money movement over the past 7 days.
                      </div>
                    )}
                  </div>

                  {/* AI Insight Sidebar */}
                  <div className="p-4 rounded-xl bg-gradient-to-b from-sky-500/10 to-indigo-500/10 border border-sky-400/30 dark:border-sky-500/20 flex flex-col justify-between space-y-3 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
                      <Zap className="w-4 h-4 animate-bounce" /> Live AI Recommendation
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      "You can safely invest ₹7,500 extra into 80C Tax Mutual Funds before Friday without disturbing your ₹25,000 monthly living buffer."
                    </p>
                    <button className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95">
                      Auto-Apply Optimization <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">FinMan Neural Assistant</span>
                    <span className="text-[10px] text-slate-400 block">LLM-v4.2 • Latency 12ms</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300 shadow-sm">
                  <p className="font-semibold text-sky-500 mb-1">🤖 Insights & Spending Breakdown:</p>
                  "Your discretionary dining spend increased by 12% this week. However, your monthly utility bills dropped by ₹850 due to seasonal power savings. Total health index remains strong at 88/100."
                </div>
              </div>
            )}

            {(activeTab === 'ledger' || activeTab === 'budget') && (
              <div className="space-y-3 animate-in fade-in">
                {mockTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 hover:border-sky-400/50 flex items-center justify-between text-xs transition-all hover:translate-x-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{tx.title}</span>
                        <span className="text-[10px] text-slate-400">{tx.cat} • {tx.time}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold block ${tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                        {tx.amount}
                      </span>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-medium">
                        {tx.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MOBILE SHELL VIEW */
        <div className="w-72 rounded-[40px] bg-slate-900 p-4 border-4 border-slate-800 shadow-2xl relative transition-all duration-300 hover:shadow-sky-500/10">
          {/* Mobile Notch & Speaker */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-30 flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></div>
            <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
          </div>

          {/* Phone Screen Canvas */}
          <div className="w-full bg-white dark:bg-slate-950 rounded-[30px] overflow-hidden pt-8 pb-4 px-4 text-slate-900 dark:text-white min-h-[460px] flex flex-col justify-between">
            {/* Top Bar */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-3">
              <span>9:41 AM</span>
              <div className="flex items-center gap-1 text-sky-500">
                <ShieldCheck className="w-3 h-3" /> Encrypted
              </div>
            </div>

            {/* Mobile Header Card */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg hover:scale-105 transition-transform cursor-pointer">
                <span className="text-[10px] text-sky-100 font-semibold uppercase">Total Wealth</span>
                <div className="text-lg font-black mt-0.5">₹4,82,450.00</div>
                <div className="mt-2 pt-2 border-t border-white/20 flex justify-between items-center text-[10px]">
                  <span>Health Score: 88</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">Good</span>
                </div>
              </div>

              {/* Dynamic Notification Badge */}
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 text-[11px] flex items-center gap-2 animate-pulse-subtle">
                <Bell className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  ₹5,000 saved towards Emergency Fund!
                </span>
              </div>

              {/* Transactions Feed preview */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Ledger</span>
                {mockTransactions.slice(0, 2).map((tx) => (
                  <div key={tx.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] hover:border-sky-400 transition-colors">
                    <div>
                      <span className="font-bold block truncate max-w-[120px]">{tx.title}</span>
                      <span className="text-[9px] text-slate-400">{tx.time}</span>
                    </div>
                    <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Bottom Dock */}
            <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-around items-center text-sky-500">
              <Sparkles className="w-4 h-4 cursor-pointer hover:scale-125 transition-transform" />
              <PieChart className="w-4 h-4 text-slate-400 cursor-pointer hover:text-sky-500 transition-colors" />
              <CreditCard className="w-4 h-4 text-slate-400 cursor-pointer hover:text-sky-500 transition-colors" />
              <Bell className="w-4 h-4 text-slate-400 cursor-pointer hover:text-sky-500 transition-colors" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceMockup;
