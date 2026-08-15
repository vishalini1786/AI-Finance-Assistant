import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { Budget } from './pages/Budget';
import { FinancialHealth } from './pages/FinancialHealth';
import { AIAssistant } from './pages/AIAssistant';
import { SmartCalendar } from './pages/SmartCalendar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/health" element={<FinancialHealth />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/calendar" element={<SmartCalendar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;