import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const FloatingAIButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/ai-assistant')}
      className="fixed bottom-6 right-6 bg-finman-purple hover:bg-finman-purpleDark text-white p-3.5 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 z-30 flex items-center justify-center gap-2 group"
      title="Open AI Assistant"
    >
      <Sparkles className="w-5 h-5" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-semibold pr-1">
        Ask AI
      </span>
    </button>
  );
};