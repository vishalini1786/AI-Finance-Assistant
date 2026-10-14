import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import dashboardService from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { Send, Sparkles, Trash2, Loader2, AlertCircle } from 'lucide-react';

/**
 * Context-aware rule-based responder.
 *
 * Rules (checked in priority order):
 *  1. Greeting / small-talk
 *  2. Savings goals
 *  3. Expense prediction / forecast
 *  4. Budget remaining for a specific category (e.g. "Education budget remaining")
 *  5. Overall budget utilisation
 *  6. This-month spending
 *  7. Total spending / expenses
 *  8. Income / earnings
 *  9. Savings / surplus / balance
 * 10. Financial health score
 * 11. Projects
 * 12. Thanks / gratitude
 * 13. Help / what can you do
 * 14. Fallback
 */
function answerFromContext(question, context) {
  const text = question.toLowerCase().trim();
  const summary       = context.summary      || {};
  const currentMonth  = context.currentMonth || { income: 0, expenses: 0 };
  const goals         = context.summary?.goals || []; // goals array attached by backend via goalService.getGoals
  const categoryData  = context.categoryExpenses || [];
  const projects      = context.summary?.projects;

  /* ── 1. Greetings ──────────────────────────────────────── */
  if (/^(hello|hi+|hey|howdy|greetings|good (morning|afternoon|evening))[\s!?]*$/.test(text)) {
    return `Hello! I'm your FinMan financial assistant. You can ask me about your spending, budgets, savings goals, health score, or ML expense predictions. How can I help?`;
  }

  /* ── 12. Thanks / polite close ─────────────────────────── */
  if (/^(thanks?|thank you|cheers|great|awesome|perfect|ok|okay|got it|nice)[\s!.]*$/.test(text)) {
    return `You're welcome! Feel free to ask any time.`;
  }

  /* ── 13. Help ──────────────────────────────────────────── */
  if (/\bhelp\b|\bwhat can you\b|\bwhat do you\b/.test(text)) {
    return `I can answer questions about:\n• Your spending this month or in total\n• Budget utilisation and per-category budget remaining\n• Savings goals and progress\n• Income and surplus\n• Financial health score\n• ML expense prediction for next month\n• Project spending\n\nJust ask in plain English!`;
  }

  /* ── 4. Savings goals ──────────────────────────────────── */
  if (/\bgoal(s)?\b|\bsaving(s)? goal\b|\bsave for\b/.test(text) && !/\bhow (much|can)\b/.test(text)) {
    if (goals.length === 0) {
      return `You have no savings goals recorded yet. Visit the Savings & Goals page to add one.`;
    }
    const lines = goals.map(g => {
      const pct = g.progress_percent ?? 0;
      const rem = formatCurrency(g.remaining_amount ?? 0);
      const tgt = formatCurrency(g.target_amount ?? 0);
      const cur = formatCurrency(g.current_amount ?? 0);
      const status = pct >= 100 ? '✅ Achieved!' : `${pct}% complete, ${rem} remaining`;
      return `• ${g.goal_name}: saved ${cur} of ${tgt} — ${status}`;
    });
    return `You have ${goals.length} savings goal${goals.length > 1 ? 's' : ''}:\n${lines.join('\n')}`;
  }

  /* ── 5. ML Expense Prediction / Forecast ──────────────── */
  if (/\bpredict\b|\bforecast\b|\bnext month\b/.test(text)) {
    const msg = summary.predictionMessage;
    const val = summary.predictedExpense;
    if (msg && (!val || val === 0)) {
      return `ML prediction: ${msg}`;
    }
    if (val && val > 0) {
      return `Based on your transaction history, the Random Forest model predicts your next month's expenses will be approximately ${formatCurrency(val)}. This is a model estimate, not a guarantee.`;
    }
    return `The ML prediction service did not return a result. Ensure the FastAPI service is running and you have at least 3 months of transaction history.`;
  }

  /* ── 3. Per-category budget remaining ─────────────────── */
  // Matches: "Education budget remaining", "what is my Food budget", "remaining for Health"
  const categoryBudgetMatch = /\b(education|food|health|travel|entertainment|utilities|rent|savings|others?|clothing|groceries|transport|shopping)\b/.exec(text);
  if (categoryBudgetMatch && (/\bbudget\b|\bremain\b|\bleft\b|\bspent\b/.test(text))) {
    const requestedCat = categoryBudgetMatch[1];
    // Match against actual category expense data using case-insensitive prefix match
    const match = categoryData.find(c =>
      c.category_name?.toLowerCase().includes(requestedCat.toLowerCase())
    );
    const spent = match ? Number(match.total_amount) : 0;
    // Budget data is in summary.budget (overall only). We cannot break it per-category here
    // unless the backend returns per-category budgets. Surface what we know.
    if (spent > 0) {
      return `This month you have spent ${formatCurrency(spent)} in the ${match.category_name} category. For the exact budget limit and remaining amount, check the Budget page which shows per-category breakdowns.`;
    } else {
      return `No spending in the ${requestedCat} category has been recorded this month. Check the Budget page for your set budget limit.`;
    }
  }

  /* ── 6. Overall budget utilisation ────────────────────── */
  if (/\bbudget\b/.test(text)) {
    const b = summary.budget || {};
    if (!b.totalBudget) {
      return `No budgets have been set yet. Visit the Budget page to create category budgets.`;
    }
    const rem = formatCurrency((b.totalBudget || 0) - (b.totalSpent || 0));
    const over = b.isOverBudget ? ' ⚠️ You are over budget.' : '';
    return `Overall budget utilisation: ${b.utilizationPercent ?? 0}%.\nSpent ${formatCurrency(b.totalSpent || 0)} of ${formatCurrency(b.totalBudget || 0)} budgeted this month.\nRemaining: ${rem}.${over}`;
  }

  /* ── 7. This-month spending ────────────────────────────── */
  if ((/\bthis month\b|\bcurrent month\b/.test(text)) && (/\bspend\b|\bspent\b|\bexpens\b/.test(text))) {
    return `This month you have recorded ${formatCurrency(currentMonth.expenses)} in expenses.`;
  }

  /* ── 8. Total spending ─────────────────────────────────── */
  if (/\bspend\b|\bspent\b|\bexpens\b/.test(text)) {
    const top = categoryData[0];
    const topLine = top
      ? ` Your top expense category this month is ${top.category_name} at ${formatCurrency(top.total_amount)}.`
      : '';
    return `Your total recorded expenses are ${formatCurrency(summary.totalExpenses || 0)}.${topLine}`;
  }

  /* ── 9. Income / earnings ──────────────────────────────── */
  if (/\bincome\b|\bearn\b|\bsalar\b|\bpay\b/.test(text)) {
    return `Your total recorded income is ${formatCurrency(summary.totalIncome || 0)}.`;
  }

  /* ── 10. Savings / surplus / balance ───────────────────── */
  if (/\bsav(e|ing|ings|ed)\b|\bsurplus\b|\bbalance\b|\bhow much can\b/.test(text)) {
    const surplus = summary.totalSavings || 0;
    const deficit = summary.deficit || 0;
    if (deficit > 0) {
      return `You are currently in a deficit of ${formatCurrency(deficit)} — your expenses exceed your recorded income. Consider reviewing your spending.`;
    }
    return `Your recorded surplus (income minus expenses) is ${formatCurrency(surplus)}.`;
  }

  /* ── 11. Financial health score ────────────────────────── */
  if (/\bhealth\b|\bscore\b|\bfinancial (status|position|standing)\b/.test(text)) {
    const hs = summary.financialHealthScore;
    if (hs == null) {
      return `There is not enough financial data to calculate a health score yet. Add income, expenses, and holdings to get started.`;
    }
    const label = hs >= 80 ? 'Excellent' : hs >= 60 ? 'Good' : hs >= 40 ? 'Fair' : 'Needs Attention';
    return `Your financial health score is ${hs}/100 — ${label}. Visit the Financial Health page for a full 5-component breakdown and improvement suggestions.`;
  }

  /* ── 13. Projects ──────────────────────────────────────── */
  if (/\bproject\b/.test(text)) {
    const p = projects?.projects?.[0];
    if (!p) return `No projects have been recorded yet.`;
    const rem = formatCurrency(p.remaining_budget ?? 0);
    return `${p.project_name}: spent ${formatCurrency(p.total_spent ?? 0)} of ${formatCurrency(p.target_budget ?? 0)} budget. Remaining: ${rem}.`;
  }

  /* ── 14. Fallback ──────────────────────────────────────── */
  return `I can answer questions about your spending, budgets, savings goals, income, financial health score, or ML expense predictions. Could you rephrase your question?`;
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
        const name = value.user?.name || currentUser?.name || 'there';
        setMessages([{
          id: 1,
          sender: 'ai',
          text: `Hello ${name}! I'm your FinMan financial assistant. Ask me about your spending, budgets, savings goals, or next month's expense prediction.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      })
      .catch(() => mounted && setError('Unable to load your financial context.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [currentUser]);

  const summary    = context?.summary;
  const categories = useMemo(() => context?.categoryExpenses?.slice(0, 5) || [], [context]);

  const handleSend = (value = input) => {
    if (!value.trim() || !context) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reply = answerFromContext(value, context);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(),     sender: 'user', text: value, time: now },
      { id: Date.now() + 1, sender: 'ai',   text: reply, time: now },
    ]);
    setInput('');
  };

  const quickPrompts = [
    'How much did I spend this month?',
    'What are my savings goals?',
    'Check my budget',
    'Predict my next month\'s expenses',
    'What is my financial health?',
  ];

  return (
    <MainLayout>
      <PageHeader
        title="AI Finance Assistant"
        subtitle="Answers based on your authenticated financial records"
        rightElement={
          <button
            onClick={() => setMessages([])}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Chat panel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-md p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                      message.sender === 'user'
                        ? 'bg-finman-blue text-white'
                        : 'bg-slate-50 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {message.text}
                    <div className="text-[10px] opacity-60 mt-1">{message.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick prompts */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full hover:border-finman-blue"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(event) => { event.preventDefault(); handleSend(); }}
              className="p-4 border-t border-slate-200 flex gap-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your finances..."
                className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-xs outline-none focus:border-finman-blue"
              />
              <button className="bg-finman-blue text-white p-2.5 rounded-lg">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Financial summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Financial Summary</h3>
              {summary && (
                <div className="space-y-3 text-xs">
                  {[
                    ['Income',           summary.totalIncome],
                    ['Expenses',         summary.totalExpenses],
                    ['Savings',          summary.totalSavings],
                    ['Project spending', summary.projects?.totalSpent || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Health score</span>
                    <span className="font-bold text-finman-blue">
                      {summary.financialHealthScore == null ? 'Not enough data' : `${summary.financialHealthScore} / 100`}
                    </span>
                  </div>
                  {summary.predictedExpense > 0 && (
                    <div className="flex justify-between py-1.5 border-t border-slate-100">
                      <span className="text-slate-500">ML Predicted expense</span>
                      <span className="font-bold text-indigo-600">{formatCurrency(summary.predictedExpense)}</span>
                    </div>
                  )}
                  {summary.predictionMessage && summary.predictedExpense === 0 && (
                    <p className="text-[11px] text-slate-400 pt-1 italic">{summary.predictionMessage}</p>
                  )}
                </div>
              )}
            </div>

            {/* Current-month categories */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">This Month's Categories</h3>
              {categories.length ? categories.map((item) => (
                <div key={item.category_name} className="flex justify-between text-xs py-2 border-b border-slate-100">
                  <span>{item.category_name}</span>
                  <strong>{formatCurrency(item.total_amount)}</strong>
                </div>
              )) : (
                <p className="text-xs text-slate-400">No category spending recorded yet.</p>
              )}
            </div>

            {/* Data boundary note */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <div className="flex items-center gap-1.5 text-finman-blue font-bold text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Data boundary
              </div>
              <p className="text-xs text-slate-700 font-medium">
                Responses use only your authenticated financial records. No fallback or hardcoded values are shown.
              </p>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
