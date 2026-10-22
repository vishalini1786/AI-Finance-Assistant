import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import dashboardService from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Send,
  Sparkles,
  Trash2,
  Loader2,
  AlertCircle,
  Bot,
  User,
  Lightbulb,
  Bell,
  ArrowRight,
  Mic,
  MicOff,
  Check,
  CheckCircle2,
  X,
  Edit2,
  Wallet,
  Receipt,
  Calendar,
  PieChart,
  Briefcase,
  Layers,
  Target,
  TrendingUp,
  Repeat,
  CreditCard,
  FileText,
} from 'lucide-react';

/**
 * Client-side fallback responder if network or server is unavailable.
 */
function answerFromContext(question, context) {
  const text = (question || '').toLowerCase().trim();
  const summary       = context.summary      || {};
  const currentMonth  = context.currentMonth || { income: 0, expenses: 0 };
  const goals         = context.summary?.goals || [];
  const categoryData  = context.categoryExpenses || [];
  const projects      = context.summary?.projects;

  /* ── 1. Greetings ──────────────────────────────────────── */
  if (/^(hello|hi+|hey|howdy|greetings|bro|hi bro|hey bro|yo|sup|good (morning|afternoon|evening))[\s!?]*$/i.test(text) || text.includes('hi bro')) {
    return `Hey there! I'm your FinMan financial assistant. How can I help you manage your money, check your budgets, or plan your expenses today?`;
  }

  /* ── 2. Thanks / polite close ─────────────────────────── */
  if (/^(thanks?|thank you|cheers|great|awesome|perfect|ok|okay|got it|nice)[\s!.]*$/.test(text)) {
    return `You're welcome! Feel free to ask anytime.`;
  }

  /* ── 3. Help ──────────────────────────────────────────── */
  if (/\bhelp\b|\bwhat can you\b|\bwhat do you\b/.test(text)) {
    return `I can help you across all FinMan modules:\n• Income & Expenses: "Add my salary of ₹50,000" or "Spent ₹120 on lunch"\n• Budgets: "Create a monthly food budget of ₹6,000"\n• Projects: "Create a home construction project with target budget ₹1 crore"\n• Savings Goals: "Create a savings goal of ₹5 lakh for education by Dec 2027"\n• Investments: "Record an investment of ₹15,000 in gold"\n• Loans & Bills: "How much do I owe on my loans?" or "Show upcoming bills"\n• Financial Planning: "Can I afford a phone worth ₹25,000?"`;
  }

  /* ── 3b. Projects ─────────────────────────────────────── */
  if (/\bproject(s)?\b|\bworkspace\b/.test(text)) {
    const projList = Array.isArray(projects) ? projects : (context.summary?.projects || []);
    if (projList.length > 0) {
      const pLines = projList.map((p) => `• ${p.project_name}: Target ${formatCurrency(p.target_budget)}, Spent ${formatCurrency(p.total_spent || 0)}`);
      return `You have ${projList.length} project workspace${projList.length > 1 ? 's' : ''}:\n${pLines.join('\n')}`;
    }
    return `You have no active project workspaces recorded yet. Ask me to create one anytime!`;
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

  /* ── 5. Total spending ─────────────────────────────────── */
  if (/\bspend\b|\bspent\b|\bexpens\b/.test(text)) {
    const top = categoryData[0];
    const topLine = top
      ? ` Your top expense category this month is ${top.category_name} at ${formatCurrency(top.total_amount)}.`
      : '';
    return `Your recorded expenses this month are ${formatCurrency(summary.totalExpenses || currentMonth.expenses || 0)}.${topLine}`;
  }

  /* ── 6. Income / earnings ──────────────────────────────── */
  if (/\bincome\b|\bearn\b|\bsalar\b|\bpay\b/.test(text)) {
    return `Your total recorded income is ${formatCurrency(summary.totalIncome || 0)}.`;
  }

  /* ── 7. Fallback ──────────────────────────────────────── */
  return `I can answer questions about your spending, budgets, savings goals, income, financial health score, or help you record transactions. What would you like to explore?`;
}

function FormattedContent({ text }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, lIdx) => {
        if (!line.trim()) {
          return <div key={lIdx} className="h-1.5" />;
        }
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

        return (
          <div key={lIdx} className={`flex items-start ${isBullet ? 'pl-3' : ''}`}>
            {isBullet && <span className="text-finman-blue mr-2 select-none">•</span>}
            <span className="flex-1">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function appendSpeechTranscript(baseText = '', finalSegment = '', interimSegment = '') {
  const cleanBase = (baseText || '').trim();
  const cleanFinal = (finalSegment || '').trim();
  const cleanInterim = (interimSegment || '').trim();

  let committed = cleanBase;

  if (cleanFinal) {
    if (!committed) {
      committed = cleanFinal;
    } else {
      const lowerBase = committed.toLowerCase();
      const lowerFinal = cleanFinal.toLowerCase();
      // Prevent duplicate repetition if base already ends with the recognized final phrase
      if (!lowerBase.endsWith(lowerFinal)) {
        committed = `${committed} ${cleanFinal}`;
      }
    }
  }

  if (cleanInterim) {
    return committed ? `${committed} ${cleanInterim}` : cleanInterim;
  }

  return committed;
}


export function getPendingTypeMeta(type) {
  switch (type) {
    case 'income':
      return {
        label: 'Income Confirmation',
        icon: <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        boxClass: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
        titleClass: 'text-emerald-800 dark:text-emerald-300',
        dividerClass: 'border-emerald-200 dark:border-emerald-800/80',
      };
    case 'expense':
      return {
        label: 'Expense Confirmation',
        icon: <Receipt className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
        boxClass: 'border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
        titleClass: 'text-rose-800 dark:text-rose-300',
        dividerClass: 'border-rose-200 dark:border-rose-800/80',
      };
    case 'budget':
      return {
        label: 'Monthly Budget Confirmation',
        icon: <PieChart className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
        boxClass: 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
        titleClass: 'text-indigo-800 dark:text-indigo-300',
        dividerClass: 'border-indigo-200 dark:border-indigo-800/80',
      };
    case 'project':
      return {
        label: 'Project Workspace Preview',
        icon: <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
        boxClass: 'border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
        titleClass: 'text-blue-800 dark:text-blue-300',
        dividerClass: 'border-blue-200 dark:border-blue-800/80',
      };
    case 'project_expense':
      return {
        label: 'Project Expense Preview',
        icon: <Layers className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />,
        boxClass: 'border-orange-300 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200',
        titleClass: 'text-orange-800 dark:text-orange-300',
        dividerClass: 'border-orange-200 dark:border-orange-800/80',
      };
    case 'goal':
      return {
        label: 'Savings Goal Preview',
        icon: <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
        boxClass: 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
        titleClass: 'text-amber-800 dark:text-amber-300',
        dividerClass: 'border-amber-200 dark:border-amber-800/80',
      };
    case 'holding':
      return {
        label: 'Investment Holding Preview',
        icon: <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />,
        boxClass: 'border-teal-300 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200',
        titleClass: 'text-teal-800 dark:text-teal-300',
        dividerClass: 'border-teal-200 dark:border-teal-800/80',
      };
    case 'recurring_payment':
      return {
        label: 'Recurring Payment Preview',
        icon: <Repeat className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
        boxClass: 'border-purple-300 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
        titleClass: 'text-purple-800 dark:text-purple-300',
        dividerClass: 'border-purple-200 dark:border-purple-800/80',
      };
    case 'liability':
      return {
        label: 'Liability & Loan Preview',
        icon: <CreditCard className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />,
        boxClass: 'border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
        titleClass: 'text-slate-800 dark:text-slate-200',
        dividerClass: 'border-slate-200 dark:border-slate-700',
      };
    case 'tax':
      return {
        label: 'Tax Record Preview',
        icon: <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
        boxClass: 'border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200',
        titleClass: 'text-sky-800 dark:text-sky-300',
        dividerClass: 'border-sky-200 dark:border-sky-800/80',
      };
    case 'batch':
      return {
        label: 'Batch Transactions Preview',
        icon: <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />,
        boxClass: 'border-violet-300 dark:border-violet-800 bg-violet-50/70 dark:bg-violet-950/40 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-violet-100 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200',
        titleClass: 'text-violet-800 dark:text-violet-300',
        dividerClass: 'border-violet-200 dark:border-violet-800/80',
      };
    default:
      return {
        label: 'Action Confirmation',
        icon: <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
        boxClass: 'border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/50 text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
        titleClass: 'text-sky-800 dark:text-sky-300',
        dividerClass: 'border-sky-200 dark:border-sky-800/80',
      };
  }
}

export const AIAssistant = () => {
  const { currentUser } = useAuth();
  const [context, setContext] = useState(null);
  const [insights, setInsights] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [activePending, setActivePending] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editingPendingId, setEditingPendingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [speechLang, setSpeechLang] = useState(() => {
    try {
      return localStorage.getItem('finman_speech_lang') || 'en-IN';
    } catch {
      return 'en-IN';
    }
  });
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const baseTextRef = useRef('');
  const sessionFinalRef = useRef('');
  const inputRef = useRef('');
  const textareaRef = useRef(null);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  };

  useEffect(() => {
    inputRef.current = input;
    adjustTextareaHeight();
  }, [input]);


  const [quickPrompts, setQuickPrompts] = useState([
    'Based on my onboarding details, what should I focus on first?',
    'Analyze my spending this month',
    'How can I save more money based on my current income?',
    'Am I on track to reach my savings goal?',
    'Help me plan a realistic budget for next month',
    'Which expenses should I review first?',
    'What financial habits should I improve?',
    'What changed in my financial situation this month?',
    'How much did I spend this month?',
    'Where am I spending the most?',
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, activePending]);

  const loadFinancialContext = async () => {
    try {
      const [ctx, ins] = await Promise.all([
        dashboardService.getAssistantContext().catch(() => null),
        dashboardService.getInsights().catch(() => []),
      ]);
      setContext(ctx);
      setInsights(ins || []);
      return ctx;
    } catch {
      return null;
    }
  };

  const userSessionKey = `finman_chat_session_${currentUser?.user_id || currentUser?.id || 'default'}`;

  useEffect(() => {
    let mounted = true;
    loadFinancialContext()
      .then((ctx) => {
        if (!mounted) return;
        const name = ctx?.user?.name || currentUser?.name || 'there';

        let restoredSession = null;
        try {
          const raw = sessionStorage.getItem(userSessionKey);
          if (raw) restoredSession = JSON.parse(raw);
        } catch {
          restoredSession = null;
        }

        if (restoredSession && Array.isArray(restoredSession.messages) && restoredSession.messages.length > 0) {
          setMessages(restoredSession.messages);
          if (restoredSession.activePending && restoredSession.activePending.status === 'PENDING_CONFIRMATION') {
            setActivePending(restoredSession.activePending);
          }
          if (Array.isArray(restoredSession.quickPrompts) && restoredSession.quickPrompts.length > 0) {
            setQuickPrompts(restoredSession.quickPrompts);
          }
        } else {
          setMessages([
            {
              id: 1,
              sender: 'ai',
              text: `Hello ${name}! I'm your FinMan Financial Assistant, connected to your verified financial records.\n\nYou can:\n• **Add transactions naturally:** "I spent ₹50 on tea today" or "Add my salary of ₹10,000"\n• **Ask spending questions:** "How much did I spend this month?" or "Where am I spending the most?"\n• **Analyze purchases:** "Can I afford a phone worth ₹25,000?"\n• **Track commitments:** "What bills are coming up?"`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      })
      .catch(() => mounted && setError('Unable to load your financial context.'))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [currentUser, userSessionKey]);

  // Synchronize changes to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(
          userSessionKey,
          JSON.stringify({
            messages,
            activePending,
            quickPrompts,
            savedAt: Date.now(),
          })
        );
      } catch (e) {
        console.warn('Could not save session state to sessionStorage:', e);
      }
    }
  }, [messages, activePending, quickPrompts, userSessionKey]);

  // Speech Recognition Setup (Web Speech API) - Push-to-Start / Push-to-Stop Continuous Listening
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
        baseTextRef.current = inputRef.current.trim();
        sessionFinalRef.current = '';
      };

      recognition.onresult = (event) => {
        let finalSegment = '';
        let interimSegment = '';
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript?.trim() || '';
          if (!transcript) continue;
          if (res.isFinal) {
            finalSegment += (finalSegment ? ' ' : '') + transcript;
          } else {
            interimSegment += (interimSegment ? ' ' : '') + transcript;
          }
        }
        sessionFinalRef.current = finalSegment;
        const updated = appendSpeechTranscript(baseTextRef.current, finalSegment, interimSegment);
        setInput(updated);
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          shouldListenRef.current = false;
          setIsListening(false);
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          // Normal pause during speaking; keep continuous listening active
        } else if (event.error === 'audio-capture') {
          shouldListenRef.current = false;
          setIsListening(false);
          setSpeechError('No microphone was found on your device.');
        } else if (event.error === 'network') {
          setSpeechError('Speech recognition encountered a network interruption.');
        } else {
          setSpeechError(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Commit final segment of this session into baseTextRef so next session starts cleanly
        if (sessionFinalRef.current) {
          const lowerBase = (baseTextRef.current || '').toLowerCase();
          const lowerFin = sessionFinalRef.current.toLowerCase();
          if (!lowerBase.endsWith(lowerFin)) {
            baseTextRef.current = (baseTextRef.current ? baseTextRef.current + ' ' : '') + sessionFinalRef.current.trim();
          }
          sessionFinalRef.current = '';
        }
        setInput(baseTextRef.current);

        // If user desires continued listening, restart across browser silence timeouts
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
            shouldListenRef.current = false;
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;

      return () => {
        shouldListenRef.current = false;
        try {
          recognition.stop();
        } catch {}
      };
    }
  }, [speechLang]);

  const handleSpeechLangChange = (newLang) => {
    setSpeechLang(newLang);
    try {
      localStorage.setItem('finman_speech_lang', newLang);
    } catch (e) {
      console.warn('Could not persist speechLang:', e);
    }
  };

  const toggleListening = () => {
    setSpeechError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Voice-to-text is not supported by your current browser. Try Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch {}

      // Finalize text safely without duplication
      if (sessionFinalRef.current) {
        const lowerBase = (baseTextRef.current || '').toLowerCase();
        const lowerFin = sessionFinalRef.current.toLowerCase();
        if (!lowerBase.endsWith(lowerFin)) {
          baseTextRef.current = (baseTextRef.current ? baseTextRef.current + ' ' : '') + sessionFinalRef.current.trim();
        }
        sessionFinalRef.current = '';
      }
      setInput(baseTextRef.current);
    } else {
      shouldListenRef.current = true;
      baseTextRef.current = inputRef.current.trim();
      sessionFinalRef.current = '';
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }
  };

  const handleClearDraft = () => {
    setInput('');
    baseTextRef.current = '';
    sessionFinalRef.current = '';
  };


  const handleRemoveBatchItem = (index) => {
    if (!activePending || activePending.type !== 'batch') return;
    const updatedItems = (activePending.items || []).filter((_, idx) => idx !== index);
    if (updatedItems.length === 0) {
      setActivePending(null);
      return;
    }
    const newTotal = updatedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    setActivePending({
      ...activePending,
      items: updatedItems,
      count: updatedItems.length,
      totalAmount: newTotal,
    });
  };

  const summary = context?.summary;
  const categories = useMemo(() => context?.categoryExpenses?.slice(0, 5) || [], [context]);

  const handleSend = async (value = input) => {
    const trimmed = value.trim();
    if (!trimmed || isTyping) return;

    if (isListening) {
      recognitionRef.current?.stop();
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), sender: 'user', text: trimmed, time: now };

    const history = messages
      .slice(-6)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    baseTextRef.current = '';
    setIsTyping(true);

    try {
      const response = await dashboardService.sendChatMessage(trimmed, history, activePending);
      const aiReply = response?.reply || answerFromContext(trimmed, context || {});
      const pendingTx = response?.pendingTransaction || null;

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pendingTransaction: pendingTx,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setActivePending(pendingTx);

      if (response?.suggestedQuestions && response.suggestedQuestions.length > 0) {
        setQuickPrompts(response.suggestedQuestions);
      }

      if (response?.transactionSaved) {
        setActivePending(null);
        await loadFinancialContext();
      }
    } catch (err) {
      console.warn('Chat endpoint fallback:', err);
      const fallbackReply = answerFromContext(trimmed, context || {});
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: fallbackReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmTransaction = async (tx) => {
    if (isConfirming || !tx) return;
    setIsConfirming(true);
    try {
      const result = await dashboardService.confirmAiTransaction(tx);
      setActivePending(null);
      setEditingPendingId(null);

      // Add success confirmation message to chat
      const confirmMsg = {
        id: Date.now(),
        sender: 'ai',
        text: result.message || `✅ Successfully confirmed and recorded ${formatCurrency(tx.amount)}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSuccessBadge: true,
      };
      setMessages((prev) => [...prev, confirmMsg]);

      // Refresh real financial context
      await loadFinancialContext();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save transaction. Please try again.';
      const errorMsg = {
        id: Date.now(),
        sender: 'ai',
        text: `⚠️ Error saving transaction: ${msg}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelTransaction = () => {
    setActivePending(null);
    setEditingPendingId(null);
    const cancelMsg = {
      id: Date.now(),
      sender: 'ai',
      text: '❌ Transaction cancelled. No records were added to your finances.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, cancelMsg]);
  };

  const handleStartEdit = (tx) => {
    setEditingPendingId(tx.id);
    setEditForm({
      amount: String(tx.amount || tx.targetBudget || tx.targetAmount || tx.currentValue || tx.remainingAmount || ''),
      date: tx.date || tx.startDate || tx.purchaseDate || tx.nextDueDate || tx.dueDate || new Date().toISOString().slice(0, 10),
      targetDate: tx.targetDate || '',
      source: tx.source || 'Salary',
      category: tx.category || tx.categoryName || 'Food',
      name: tx.projectName || tx.goalName || tx.expenseName || tx.name || '',
      description: tx.description || '',
      paymentMode: tx.paymentMode || 'UPI',
      holdingType: tx.holdingType || 'Gold',
      frequency: tx.frequency || 'MONTHLY',
    });
  };

  const handleSaveEdit = (tx) => {
    const parsedAmt = Number(editForm.amount) || tx.amount || tx.targetBudget || tx.targetAmount || tx.currentValue;
    const updated = {
      ...tx,
      amount: parsedAmt,
      targetBudget: parsedAmt,
      targetAmount: parsedAmt,
      currentValue: parsedAmt,
      remainingAmount: parsedAmt,
      date: editForm.date || tx.date,
      startDate: editForm.date || tx.startDate,
      purchaseDate: editForm.date || tx.purchaseDate,
      nextDueDate: editForm.date || tx.nextDueDate,
      dueDate: editForm.date || tx.dueDate,
      targetDate: editForm.targetDate || tx.targetDate,
      source: editForm.source || tx.source,
      category: editForm.category || tx.category,
      categoryName: editForm.category || tx.categoryName,
      description: editForm.description || tx.description,
      paymentMode: editForm.paymentMode || tx.paymentMode,
      projectName: editForm.name || tx.projectName,
      goalName: editForm.name || tx.goalName,
      expenseName: editForm.name || tx.expenseName,
      name: editForm.name || tx.name,
      holdingType: editForm.holdingType || tx.holdingType,
      frequency: editForm.frequency || tx.frequency,
    };
    setActivePending(updated);
    setEditingPendingId(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="AI Finance Assistant"
        subtitle="Conversational finance with speech-to-text & deterministic record grounding"
        rightElement={
          <button
            onClick={() => {
              const name = context?.user?.name || currentUser?.name || 'there';
              setActivePending(null);
              setEditingPendingId(null);
              try {
                sessionStorage.removeItem(userSessionKey);
              } catch (e) {
                // ignore
              }
              setMessages([
                {
                  id: Date.now(),
                  sender: 'ai',
                  text: `Hello ${name}! How can I assist you with your finances today?`,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }}
            title="Clear Chat History"
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-rose-600 transition-colors shadow-sm cursor-pointer"
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
          <Loader2 className="animate-spin w-8 h-8 text-finman-blue" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat panel */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[670px] overflow-hidden">
            {/* Header info */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-800 dark:text-white">FinMan Intelligent Conversational Core</span>
              </div>
              <span className="text-slate-400 text-[11px] font-medium">PostgreSQL Grounded • Natural Language</span>
            </div>

            {/* Messages container */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/40">
              {messages.map((message) => {
                const isUser = message.sender === 'user';
                return (
                  <div key={message.id} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-finman-blue text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-finman-blue text-white rounded-tr-none'
                          : message.isSuccessBadge
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-tl-none font-semibold'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}
                    >
                      <FormattedContent text={message.text} />

                      {/* Multi-Module Action Confirmation Card */}
                      {message.pendingTransaction && activePending && message.pendingTransaction.id === activePending.id && (() => {
                        const meta = getPendingTypeMeta(activePending.type);
                        return (
                          <div className={`mt-3.5 p-4 rounded-xl border shadow-xs ${meta.boxClass}`}>
                            <div className={`flex items-center justify-between pb-2 mb-2 border-b ${meta.dividerClass}`}>
                              <span className={`font-extrabold text-[11px] uppercase tracking-wider ${meta.titleClass} flex items-center gap-1.5`}>
                                {meta.icon}
                                {meta.label}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badgeClass}`}>
                                Requires Confirmation
                              </span>
                            </div>

                            {editingPendingId === activePending.id ? (
                              /* Inline Edit Mode */
                              <div className="space-y-2 text-xs pt-1">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Amount / Target (₹):</label>
                                  <input
                                    type="number"
                                    value={editForm.amount}
                                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                  />
                                </div>

                                {['project', 'goal', 'project_expense', 'holding', 'recurring_payment', 'liability'].includes(activePending.type) && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Name / Title:</label>
                                    <input
                                      type="text"
                                      value={editForm.name}
                                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                  </div>
                                )}

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Date:</label>
                                  <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                  />
                                </div>

                                {['goal', 'project'].includes(activePending.type) && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Target Completion Date:</label>
                                    <input
                                      type="date"
                                      value={editForm.targetDate}
                                      onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                  </div>
                                )}

                                {activePending.type === 'income' && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Source:</label>
                                    <input
                                      type="text"
                                      value={editForm.source}
                                      onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                  </div>
                                )}

                                {['expense', 'budget', 'project_expense'].includes(activePending.type) && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Category:</label>
                                    <input
                                      type="text"
                                      value={editForm.category}
                                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                  </div>
                                )}

                                {activePending.type === 'holding' && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Asset Type:</label>
                                    <input
                                      type="text"
                                      value={editForm.holdingType}
                                      onChange={(e) => setEditForm({ ...editForm, holdingType: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                  </div>
                                )}

                                {activePending.type === 'recurring_payment' && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Frequency:</label>
                                    <select
                                      value={editForm.frequency}
                                      onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    >
                                      <option value="MONTHLY">Monthly</option>
                                      <option value="WEEKLY">Weekly</option>
                                      <option value="YEARLY">Yearly</option>
                                    </select>
                                  </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(activePending)}
                                    className="px-3 py-1 rounded-lg bg-sky-600 text-white font-bold text-xs"
                                  >
                                    Done Editing
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPendingId(null)}
                                    className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 text-xs"
                                  >
                                    Cancel Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Preview Mode */
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between py-0.5">
                                  <span className="text-slate-500">
                                    {activePending.type === 'project' ? 'Target Budget:' : activePending.type === 'goal' ? 'Target Amount:' : activePending.type === 'holding' ? 'Current Value:' : activePending.type === 'budget' ? 'Monthly Limit:' : activePending.type === 'batch' ? 'Total Narration:' : 'Amount:'}
                                  </span>
                                  <strong className="text-slate-900 dark:text-white font-black text-sm">
                                    {formatCurrency(activePending.amount || activePending.totalAmount || activePending.targetBudget || activePending.targetAmount || activePending.currentValue || activePending.remainingAmount)}
                                  </strong>
                                </div>

                                {activePending.type === 'income' && (
                                  <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">Source:</span>
                                    <span className="font-bold">{activePending.source}</span>
                                  </div>
                                )}

                                {activePending.type === 'expense' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Category:</span>
                                      <span className="font-bold">{activePending.category}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Payment:</span>
                                      <span>{activePending.paymentMode || 'UPI'}</span>
                                    </div>
                                  </>
                                )}

                                {activePending.type === 'budget' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Category:</span>
                                      <span className="font-bold">{activePending.category || activePending.categoryName}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Period:</span>
                                      <span>{activePending.month}/{activePending.year} ({activePending.priority || 'Flexible'})</span>
                                    </div>
                                  </>
                                )}

                                {activePending.type === 'project' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Project Name:</span>
                                      <span className="font-bold">{activePending.projectName || activePending.name}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Target Date:</span>
                                      <span>{activePending.targetDate || 'Ongoing'}</span>
                                    </div>
                                  </>
                                )}

                                {activePending.type === 'project_expense' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Project:</span>
                                      <span className="font-bold">{activePending.projectName}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Expense Name:</span>
                                      <span>{activePending.expenseName || activePending.name}</span>
                                    </div>
                                  </>
                                )}

                                {activePending.type === 'goal' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Goal Name:</span>
                                      <span className="font-bold">{activePending.goalName || activePending.name}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Target Date:</span>
                                      <span>{activePending.targetDate || 'Flexible'}</span>
                                    </div>
                                    {activePending.suggestedMonthlyContribution && (
                                      <div className="flex justify-between py-0.5">
                                        <span className="text-slate-500">Monthly Plan:</span>
                                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                                          {formatCurrency(activePending.suggestedMonthlyContribution)}/mo (calc)
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {activePending.type === 'holding' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Asset:</span>
                                      <span className="font-bold">{activePending.name} ({activePending.holdingType})</span>
                                    </div>
                                    {activePending.quantity && (
                                      <div className="flex justify-between py-0.5">
                                        <span className="text-slate-500">Quantity:</span>
                                        <span className="font-semibold">{activePending.quantity} {activePending.quantityUnit || ''}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Purchase Value:</span>
                                      <span className="font-semibold">{formatCurrency(activePending.purchaseValue || activePending.amount)}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Purchase Date:</span>
                                      <span>{activePending.purchaseDate || activePending.date}</span>
                                    </div>
                                    {activePending.currentValue && (
                                      <div className="flex justify-between py-0.5">
                                        <span className="text-slate-500">Current Value:</span>
                                        <span className="font-semibold">{formatCurrency(activePending.currentValue)}</span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {activePending.type === 'batch' && (
                                  <div className="space-y-2 pt-1 pb-1">
                                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      {activePending.items?.length || 0} transactions detected from narration:
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                      {activePending.items?.map((item, idx) => (
                                        <div
                                          key={item.id || idx}
                                          className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span
                                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                                item.type === 'income'
                                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                              }`}
                                            >
                                              {item.type === 'income' ? 'Income' : 'Expense'}
                                            </span>
                                            <div className="truncate">
                                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {item.description || item.merchantName || item.source}
                                              </span>
                                              <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">
                                                ({item.category || item.source})
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-extrabold text-slate-900 dark:text-white">
                                              {formatCurrency(item.amount)}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveBatchItem(idx)}
                                              className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                                              title="Remove item"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {activePending.type === 'recurring_payment' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Schedule:</span>
                                      <span className="font-bold">{activePending.name} ({activePending.frequency || 'Monthly'})</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Next Due:</span>
                                      <span>{activePending.nextDueDate || activePending.date}</span>
                                    </div>
                                  </>
                                )}

                                {activePending.type === 'liability' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Loan:</span>
                                      <span className="font-bold">{activePending.name} ({activePending.interestRate || 0}% p.a.)</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Due Date:</span>
                                      <span>{activePending.dueDate || 'N/A'}</span>
                                    </div>
                                  </>
                                )}

                                {activePending.type === 'tax' && (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Tax Type:</span>
                                      <span className="font-bold">{activePending.taxType} ({activePending.taxYear})</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span className="text-slate-500">Status:</span>
                                      <span>{activePending.status || 'PENDING'}</span>
                                    </div>
                                  </>
                                )}

                                {activePending.date && !['budget', 'holding', 'recurring_payment'].includes(activePending.type) && (
                                  <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">Date:</span>
                                    <span>{activePending.date || activePending.startDate}</span>
                                  </div>
                                )}

                                {activePending.description && (
                                  <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">Description:</span>
                                    <span className="truncate max-w-[200px]">{activePending.description}</span>
                                  </div>
                                )}

                                {/* Interactive Confirmation Action Buttons */}
                                <div className={`flex flex-wrap items-center gap-2 pt-3 border-t ${meta.dividerClass} mt-2`}>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmTransaction(activePending)}
                                    disabled={isConfirming}
                                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                  >
                                    {isConfirming ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>Confirm and Add</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(activePending)}
                                    disabled={isConfirming}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                  >
                                    Edit Details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelTransaction}
                                    disabled={isConfirming}
                                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className={`text-[10px] mt-1.5 ${isUser ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                        {message.time}
                      </div>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-finman-blue text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-finman-blue" />
                    <span>Analyzing your financial data...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Speech recognition error banner */}
            {speechError && (
              <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/50 border-t border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <span>{speechError}</span>
                <button onClick={() => setSpeechError('')} className="text-amber-600 hover:text-amber-800 font-bold ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick prompts */}
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
              <div className="w-full flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Suggested Questions & Actions</span>
              </div>
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={isTyping}
                  className="text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full hover:border-finman-blue hover:text-finman-blue hover:bg-blue-50/50 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Active Continuous Listening Indicator Banner */}
            {isListening && (
              <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900/80 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-semibold">Listening ({speechLang})... Speak naturally across pauses</span>
                </div>
                <button
                  type="button"
                  onClick={toggleListening}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                >
                  Stop Listening
                </button>
              </div>
            )}

            {/* Responsive Multiline Chat Textarea with Voice Dictation & Controls */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  baseTextRef.current = event.target.value;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isListening
                    ? 'Listening... speak clearly now (e.g. "I spent ₹50 on tea")'
                    : 'Ask a question or dictate (Press Enter to send, Shift+Enter for new line)...'
                }
                disabled={isTyping}
                className={`flex-1 border rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all resize-none max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words ${
                  isListening
                    ? 'border-rose-400 ring-2 ring-rose-400/30 bg-rose-50/30 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-medium'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-finman-blue focus:ring-1 focus:ring-finman-blue'
                }`}
              />

              {/* Clear Draft Option */}
              {input.trim() && (
                <button
                  type="button"
                  onClick={handleClearDraft}
                  title="Clear Draft Text"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-900 transition flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Speech Recognition Language Selector */}
              <select
                value={speechLang}
                onChange={(e) => handleSpeechLangChange(e.target.value)}
                disabled={isListening}
                title="Voice Language Locale"
                className="text-[11px] font-semibold px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none shrink-0 cursor-pointer disabled:opacity-60 hidden sm:block"
              >
                <option value="en-IN">EN (IN)</option>
                <option value="en-US">EN (US)</option>
                <option value="hi-IN">HI (IN)</option>
                <option value="ta-IN">TA (IN)</option>
              </select>

              {/* Push-to-Start / Push-to-Stop Microphone Button */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={isTyping}
                title={isListening ? 'Stop Listening' : 'Voice-to-Text Input (Microphone)'}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-md shadow-rose-500/25'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-finman-blue hover:border-finman-blue'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="bg-finman-blue hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Send</span>
              </button>
            </form>

          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Financial summary */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Financial Overview</h3>
              {summary && (
                <div className="space-y-3 text-xs">
                  {[
                    ['Total Income', summary.totalIncome],
                    ['Total Expenses', summary.totalExpenses],
                    ['Net Surplus', summary.totalSavings],
                    ['Project Spending', summary.projects?.totalSpent || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Health Score</span>
                    <span className="font-bold text-finman-blue">
                      {summary.financialHealthScore == null ? 'Pending data' : `${summary.financialHealthScore} / 100`}
                    </span>
                  </div>
                  {summary.predictedExpense > 0 && (
                    <div className="flex justify-between py-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">ML Predicted Expense</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(summary.predictedExpense)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Insights & Alerts */}
            {insights.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dynamic AI Insights</h3>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    {insights.length} active
                  </span>
                </div>
                <div className="space-y-3">
                  {insights.slice(0, 3).map((insight) => (
                    <div
                      key={insight.insight_id || insight.insight_type}
                      className={`p-3 rounded-xl border text-xs ${
                        insight.severity === 'HIGH'
                          ? 'border-rose-200 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                          : 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div className="font-semibold mb-1 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 shrink-0" />
                        <span>{insight.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{insight.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current-month categories */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Top Categories This Month</h3>
              {categories.length ? (
                categories.map((item) => (
                  <div key={item.category_name} className="flex justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">{item.category_name}</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.total_amount)}</strong>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No category spending recorded yet.</p>
              )}
            </div>

            {/* Data boundary note */}
            <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4 rounded-2xl">
              <div className="flex items-center gap-1.5 text-finman-blue font-bold text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Deterministic Financial Grounding</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                FinMan delivers calculations based strictly on your verified transactions, recurring commitments, and budgets.
              </p>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default AIAssistant;
