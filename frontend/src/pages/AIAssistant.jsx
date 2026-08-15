import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { dashboardSummary } from '../data/mockData';
import { Bot, Send, Sparkles, User, Trash2 } from 'lucide-react';

export const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello Vishalini! 👋 How can I help you with your finances today?',
      time: '10:00 AM'
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('English');

  const cannedResponses = {
    'how much did i spend on food this month': "You spent ₹6,200 on food this month. That's approximately 77% of your food budget. Based on your current spending pattern, reducing restaurant and food-delivery expenses could help you save around ₹1,200 this month.",
    'how can i save more': "Here are three areas you can improve:\n1. Reduce dining-out expenses (~₹1,200 saving).\n2. Review unused digital subscriptions.\n3. Increase your monthly SIP savings allocation on the 1st of every month.",
    'analyze my spending': "You've spent ₹32,450 this month against ₹65,000 income. Food (35%) and Transport (20%) are your largest expense categories.",
    'check my budget': "Overall utilization is healthy at 76%. However, Shopping is at 94% with only ₹480 remaining.",
    'what\'s my financial health': "Your score is 82/100 (Good). Your savings rate is strong, but reducing discretionary shopping will push your score above 90.",
    'show my biggest expenses': "1. Food: ₹11,350\n2. Electricity Bill: ₹1,500\n3. Amazon Shopping: ₹1,200",
    'how much can i save this month': "Based on your projected expenses of ₹32,450, you are on track to save ₹32,550 (50.1% savings rate).",
  };

  const handleSend = (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), sender: 'user', text: textToSend, time: currentTime };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const lower = textToSend.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      let reply = "Based on your current accounts, you have ₹1,25,430 total balance and are maintaining a 50.1% savings rate this month. Let me know if you need specific budget recommendations!";

      for (const [key, val] of Object.entries(cannedResponses)) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        if (lower.includes(cleanKey) || cleanKey.includes(lower)) {
          reply = val;
          break;
        }
      }

      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: reply, time: currentTime }]);
    }, 500);
  };

  return (
    <MainLayout>
      <PageHeader
        title="AI Finance Assistant"
        subtitle="Your personal AI financial advisor"
        rightElement={
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
            >
              <option>English</option>
              <option>Tamil</option>
              <option>Hindi</option>
              <option>Telugu</option>
              <option>Malayalam</option>
              <option>Kannada</option>
            </select>
            <button
              onClick={() => setMessages([{ id: 1, sender: 'ai', text: 'Hello Vishalini! 👋 How can I help you with your finances today?', time: '10:00 AM' }])}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chat Interface (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
          {/* Chat Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-finman-blue flex items-center justify-center shrink-0 border border-blue-100">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col">
                  <div
                    className={`max-w-md p-3.5 rounded-xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-finman-blue text-white rounded-br-none font-medium'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none whitespace-pre-line font-medium'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className={`text-[10px] text-slate-400 mt-1 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {m.time}
                  </span>
                </div>
                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                    V
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Action Prompt Pills */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2">
            {[
              "Analyze my spending",
              "How can I save more?",
              "Check my budget",
              "What's my financial health?",
              "Show my biggest expenses",
              "How much can I save this month?"
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full hover:border-finman-blue hover:text-finman-blue transition-colors shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 bg-white border-t border-slate-200 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your finances..."
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-xs outline-none focus:border-finman-blue font-medium"
            />
            <button
              type="submit"
              className="bg-finman-blue hover:bg-finman-blueDark text-white p-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Context Panel (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Financial Summary</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Total Balance</span>
                <span className="font-bold text-slate-800">₹{dashboardSummary.totalBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Monthly Income</span>
                <span className="font-bold text-emerald-600">₹{dashboardSummary.monthlyIncome.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Monthly Expenses</span>
                <span className="font-bold text-rose-600">₹{dashboardSummary.monthlyExpenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Monthly Savings</span>
                <span className="font-bold text-teal-600">₹{dashboardSummary.totalSavings.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Financial Health</span>
                <span className="font-bold text-finman-blue">82 / 100</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Top Spending Categories</h3>
            <div className="space-y-2.5 text-xs">
              {[
                { name: "Food", percent: 35, color: "bg-blue-600" },
                { name: "Transport", percent: 20, color: "bg-teal-600" },
                { name: "Shopping", percent: 15, color: "bg-amber-500" },
                { name: "Bills", percent: 15, color: "bg-rose-500" },
                { name: "Others", percent: 15, color: "bg-slate-400" },
              ].map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700">{c.name}</span>
                    <span className="text-slate-500">{c.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`${c.color} h-1.5 rounded-full`} style={{ width: `${c.percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <div className="flex items-center gap-1.5 text-finman-blue font-bold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Today's AI Insight
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Your spending is currently within your monthly budget, but Shopping is approaching its limit.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};