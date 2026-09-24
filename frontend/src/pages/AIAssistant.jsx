import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import dashboardService from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { Send, Sparkles, Trash2, Loader2, AlertCircle } from 'lucide-react';

function answerFromContext(question, context) {
  const text = question.toLowerCase();
  const summary = context.summary;
  const currentMonth = context.currentMonth || { income: 0, expenses: 0 };
  const category = context.categoryExpenses?.[0];
  const project = summary.projects?.projects?.[0];

  if (/\b(hello|hi|hey|how are you)\b/.test(text)) return 'Hello! How can I help you with your finances today?';
  if (text.includes('project') && project) return `${project.project_name} has recorded spending of ${formatCurrency(project.total_spent)} against ${formatCurrency(project.target_budget)}. Remaining budget is ${formatCurrency(project.remaining_budget)}.`;
  if (text.includes('budget')) return `Your current recorded budget utilization is ${summary.budget.utilizationPercent}%, with ${formatCurrency(summary.budget.totalSpent)} spent of ${formatCurrency(summary.budget.totalBudget)}.`;
  if (text.includes('categor') || text.includes('food')) return category ? `Your highest current-month expense category is ${category.category_name} at ${formatCurrency(category.total_amount)}.` : 'There are no expense categories recorded for the current month yet.';
  if (text.includes('health')) return summary.financialHealthScore == null ? 'There is not enough financial history to calculate a health score yet.' : `Your rule-based financial health score is ${summary.financialHealthScore} out of 100.`;
  if (text.includes('predict') || text.includes('forecast')) return 'The expense forecast service is temporarily unavailable. No prediction is shown without a trained-model response.';
  if (text.includes('save') || text.includes('surplus') || text.includes('balance')) return `Your recorded surplus is ${formatCurrency(summary.totalSavings)}: ${formatCurrency(summary.totalIncome)} income minus ${formatCurrency(summary.totalExpenses)} expenses.`;
  if (text.includes('this month') && (text.includes('spend') || text.includes('expense'))) return `You recorded ${formatCurrency(currentMonth.expenses)} in regular expenses this month. Project spending is tracked separately.`;
  if (text.includes('spend') || text.includes('expense')) return `Your recorded expenses total ${formatCurrency(summary.totalExpenses)}. Project spending is tracked separately at ${formatCurrency(summary.projects?.totalSpent || 0)}.`;
  return 'I can answer questions about your recorded income, expenses, budgets, projects, and financial health. Ask about one of those areas.';
}

export const AIAssistant = () => {
  const { currentUser } = useAuth();
  const [context, setContext] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let mounted = true;
    dashboardService.getAssistantContext()
      .then((value) => {
        if (!mounted) return;
        setContext(value);
        setMessages([{ id: 1, sender: 'ai', text: `Hello ${value.user?.name || currentUser?.name || 'there'}! Ask me about your recorded finances.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      })
      .catch(() => mounted && setError('Unable to load your financial context.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [currentUser]);

  const summary = context?.summary;
  const categories = useMemo(() => context?.categoryExpenses?.slice(0, 5) || [], [context]);
  const handleSend = (value = input) => {
    if (!value.trim() || !context) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((previous) => [...previous, { id: Date.now(), sender: 'user', text: value, time: now }, { id: Date.now() + 1, sender: 'ai', text: answerFromContext(value, context), time: now }]);
    setInput('');
  };

  return (
    <MainLayout>
      <PageHeader title="AI Finance Assistant" subtitle="Answers based on your authenticated financial records" rightElement={<button onClick={() => setMessages([])} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>} />
      {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
      {loading ? <div className="py-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto space-y-4">{messages.map((message) => <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-md p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-line ${message.sender === 'user' ? 'bg-finman-blue text-white' : 'bg-slate-50 text-slate-800 border border-slate-200'}`}>{message.text}<div className="text-[10px] opacity-60 mt-1">{message.time}</div></div></div>)}</div>
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2">{['How much did I spend?', 'Check my budget', 'What is my financial health?', 'How much can I save?'].map((prompt) => <button key={prompt} onClick={() => handleSend(prompt)} className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full hover:border-finman-blue">{prompt}</button>)}</div>
            <form onSubmit={(event) => { event.preventDefault(); handleSend(); }} className="p-4 border-t border-slate-200 flex gap-3"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your finances..." className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-xs outline-none" /><button className="bg-finman-blue text-white p-2.5 rounded-lg"><Send className="w-4 h-4" /></button></form>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Financial Summary</h3>{summary && <div className="space-y-3 text-xs">{[['Income', summary.totalIncome], ['Expenses', summary.totalExpenses], ['Savings', summary.totalSavings], ['Project spending', summary.projects?.totalSpent || 0]].map(([label, value]) => <div key={label} className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">{label}</span><span className="font-bold text-slate-800">{formatCurrency(value)}</span></div>)}<div className="flex justify-between py-1.5"><span className="text-slate-500">Health</span><span className="font-bold text-finman-blue">{summary.financialHealthScore == null ? 'Not enough data' : `${summary.financialHealthScore} / 100`}</span></div></div>}</div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Current-month categories</h3>{categories.length ? categories.map((item) => <div key={item.category_name} className="flex justify-between text-xs py-2 border-b border-slate-100"><span>{item.category_name}</span><strong>{formatCurrency(item.total_amount)}</strong></div>) : <p className="text-xs text-slate-400">No category spending recorded yet.</p>}</div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl"><div className="flex items-center gap-1.5 text-finman-blue font-bold text-xs mb-1"><Sparkles className="w-3.5 h-3.5" /> Data boundary</div><p className="text-xs text-slate-700 font-medium">Responses use only the authenticated user's records. No fallback financial values are shown.</p></div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
