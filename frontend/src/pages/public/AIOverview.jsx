import React, { useState } from 'react';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import InteractiveTiltCard from '../../components/common/InteractiveTiltCard';
import { 
  Bot, 
  Sparkles, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  FileCode2, 
  Send,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AIOverviewPage = () => {
  // Simulator State
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Model Selector Matrix State
  const [selectedModel, setSelectedModel] = useState('ollama');

  const prompts = [
    {
      chip: '🍔 Swiggy Spending Analysis',
      query: 'Analyze my Swiggy spending for the last 30 days.',
      result: 'Total spent: ₹6,450 across 14 transactions. You order most frequently on Friday nights (avg ₹520/order). Switching 2 orders to home cooking will save ₹1,800/month.',
      chart: { cat: 'Dining & Delivery', percent: '18% of monthly budget', status: 'Moderate Overspend' },
      suggestion: 'Set a ₹1,200 weekly food delivery alert in FinMan.'
    },
    {
      chip: '💻 Laptop Purchase Simulator',
      query: 'Simulate ₹20,000 laptop purchase on current liquidity.',
      result: 'Purchase approved! Your liquidity buffer remains at ₹36,450. Using a 3-month No-Cost EMI (₹6,666/mo) keeps your emergency fund 100% intact.',
      chart: { cat: 'Capital Outlay', percent: '4.1% of liquid net worth', status: 'Safe Purchase' },
      suggestion: 'Select 3-month zero-interest payment plan.'
    },
    {
      chip: '📑 80C Tax Optimizer',
      query: 'How to optimize my Section 80C tax before financial year end?',
      result: 'You have utilized ₹95,000 out of ₹1,50,000. Investing ₹55,000 into ELSS Tax Saver Funds will net you ₹17,160 in tax savings under the Old Tax Regime.',
      chart: { cat: 'Tax Deduction', percent: '63% 80C Cap Used', status: '₹55,000 Remaining' },
      suggestion: 'Allocate ₹55,000 before March 31.'
    },
    {
      chip: '🚨 Detect Anomalous Charges',
      query: 'Scan account for duplicate subscriptions or unexpected charges.',
      result: 'Anomaly detected: SaaS cloud storage renewed at ₹1,499 (up from ₹999 last month). No duplicate charges found.',
      chart: { cat: 'Subscription Audit', percent: '+50% Price Increase', status: 'Action Recommended' },
      suggestion: 'Review or cancel SaaS Cloud auto-renewal.'
    }
  ];

  const models = {
    random_forest: {
      name: 'Random Forest Classifier',
      useCase: 'Transaction Anomaly & Category Classification',
      precision: '99.4%',
      latency: '2.1 ms',
      mem: '14 MB',
      codeSnippet: `def classify_transaction(row):\n    features = extract_vector(row.merchant, row.amount)\n    category = rf_model.predict([features])\n    return category`
    },
    isolation_forest: {
      name: 'Isolation Forest Outlier Detector',
      useCase: 'Unusual Spending & Fraud Pattern Detection',
      precision: '98.9%',
      latency: '3.8 ms',
      mem: '22 MB',
      codeSnippet: `def detect_outlier(tx_stream):\n    scores = iso_forest.decision_function(tx_stream)\n    return [tx for tx, score in zip(tx_stream, scores) if score < -0.65]`
    },
    ollama: {
      name: 'Ollama Privacy LLM (Local)',
      useCase: 'Conversational Advisory & Personal Finance Copilot',
      precision: '97.8%',
      latency: '42.0 ms',
      mem: '4.2 GB (Quantized)',
      codeSnippet: `async function generateAdvice(userState) {\n  const prompt = formatFinancialContext(userState);\n  return await ollama.generate({ model: 'finman-7b', prompt });\n}`
    }
  };

  const handleChipClick = (idx) => {
    setIsProcessing(true);
    setSelectedPrompt(idx);
    setTimeout(() => {
      setIsProcessing(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="py-16 px-6 max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-sky-500 uppercase tracking-widest bg-sky-50 dark:bg-sky-950 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-900">
            Interactive AI Studio Simulator
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Autonomous Machine Intelligence.
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
            Test prompt simulations and compare ML model architectures driving FinMan.
          </p>
        </div>

        {/* SECTION 1: AI STUDIO SIMULATOR */}
        <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-8">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">FinMan AI Studio Sandbox</h3>
                <span className="text-[10px] text-slate-400">Live Neural Inference Playground</span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
              Active Simulation
            </span>
          </div>

          {/* Interactive Preset Chips */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Preset Test Prompt:</span>
            <div className="flex flex-wrap gap-2">
              {prompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    selectedPrompt === idx
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-sky-400'
                  }`}
                >
                  {p.chip}
                </button>
              ))}
            </div>
          </div>

          {/* Query Output Display */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300 flex items-center justify-between">
              <span>Query: "{prompts[selectedPrompt].query}"</span>
              <Send className="w-3.5 h-3.5 text-sky-400" />
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed min-h-[110px] flex items-center">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                  Executing model inference & analyzing vector weights...
                </div>
              ) : (
                <div>{prompts[selectedPrompt].result}</div>
              )}
            </div>

            {!isProcessing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vector Classification</span>
                  <div className="font-bold text-sky-300">{prompts[selectedPrompt].chart.cat}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">{prompts[selectedPrompt].chart.status}</div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase">Actionable Suggestion</span>
                  <p className="text-slate-200 font-medium">{prompts[selectedPrompt].suggestion}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: MODEL COMPARISON MATRIX */}
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black">Model Architecture Comparison Selector</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Click a model to inspect its latency, memory footprint, precision benchmark, and code pipeline.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {Object.keys(models).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedModel(key)}
                className={`px-6 py-3 rounded-2xl text-xs font-bold border transition-all ${
                  selectedModel === key
                    ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 scale-105'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-sky-400'
                }`}
              >
                {models[key].name}
              </button>
            ))}
          </div>

          <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-6 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-500 bg-sky-50 dark:bg-sky-950 px-3 py-1 rounded-full">
                Active Benchmark
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{models[selectedModel].name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{models[selectedModel].useCase}</p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Precision</span>
                  <div className="text-lg font-black text-sky-500">{models[selectedModel].precision}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Latency</span>
                  <div className="text-lg font-black text-emerald-500">{models[selectedModel].latency}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Memory</span>
                  <div className="text-lg font-black text-purple-500">{models[selectedModel].mem}</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 p-5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto space-y-2">
              <div className="flex justify-between text-[10px] text-slate-500 pb-2 border-b border-slate-800">
                <span className="flex items-center gap-1"><FileCode2 className="w-3.5 h-3.5 text-sky-400" /> Pipeline Code</span>
                <span>Python / JS</span>
              </div>
              <pre className="text-[11px] leading-relaxed text-sky-300">
                {models[selectedModel].codeSnippet}
              </pre>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIOverviewPage;