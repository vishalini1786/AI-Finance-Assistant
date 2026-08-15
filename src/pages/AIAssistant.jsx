import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { Bot, Send, Sparkles } from 'lucide-react';

export const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello Vishalini! 👋 I am your AI Finance Assistant. How can I help you analyze your finances today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('English');

  const cannedResponses = {
    'analyze my spending': "You've spent ₹32,450 this month. Food is your largest category (₹11,350), accounting for 41% of all outflows.",
    'how can i save more': "1. Limit dining out to save ~₹1,200.\n2. Review small recurrent subscriptions.\n3. Route 10% of salary directly to SIPs on the 1st of every month.",
    'check my budget': "You are on track overall (76% used), but your Shopping category is at 94% utilization with only ₹480 left.",
    'financial health': "Your score is 82/100 (Good). Improving your emergency reserves will push you above 90.",
  };

  const handleSend = (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const lower = textToSend.toLowerCase();
      let reply = "I have analyzed your request based on your current accounts. Everything looks balanced, and you can comfortably allocate 15% toward savings.";

      for (const [key, val] of Object.entries(cannedResponses)) {
        if (lower.includes(key)) {
          reply = val;
          break;
        }
      }

      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: reply }]);
    }, 600);
  };

  return (
    <MainLayout>
      <PageHeader
        title="AI Finance Assistant"
        subtitle="Chat with your personalized AI financial advisor"
        rightElement={
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
          >
            <option>English</option>
            <option>Tamil</option>
            <option>Hindi</option>
            <option>Telugu</option>
            <option>Malayalam</option>
            <option>Kannada</option>
          </select>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px] overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-purple-50 text-finman-purple flex items-center justify-center shrink-0 border border-purple-100">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-finman-purple text-white rounded-br-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-bl-none whitespace-pre-line'
                }`}
              >
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                  V
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
          {['Analyze my spending', 'How can I save more', 'Check my budget', 'Financial health'].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-finman-purple hover:text-finman-purple transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-white border-t border-slate-100 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your expenses, budgets, or savings..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-finman-purple"
          />
          <button
            type="submit"
            className="bg-finman-purple hover:bg-finman-purpleDark text-white p-2.5 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </MainLayout>
  );
};