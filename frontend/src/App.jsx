import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

// Protected Route Guard
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Marketing Website Pages
import { Home } from './pages/public/Home';
import { FeaturesPage } from './pages/public/Features';
import { HowItWorksPage } from './pages/public/HowItWorks';
import { AIOverviewPage } from './pages/public/AIOverview';
import { SecurityPage } from './pages/public/Security';
import { AboutPage } from './pages/public/About';
import { ContactPage } from './pages/public/Contact';

// Authentication Pages
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';

// User Onboarding Flow
import { Onboarding } from './pages/onboarding/Onboarding';

// Existing 6 Authenticated Core Pages (Paths Preserved)
import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { Budget } from './pages/Budget';
import { FinancialHealth } from './pages/FinancialHealth';
import { AIAssistant } from './pages/AIAssistant';
import { SmartCalendar } from './pages/SmartCalendar';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { Profile } from './pages/Profile';
import { Reports } from './pages/Reports';
import { SavingsGoals } from './pages/SavingsGoals';
import { Investments } from './pages/Investments';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Public Marketing Website */}
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/ai" element={<AIOverviewPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* 2. Authentication */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 3. User Onboarding Flow */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* 4. Protected Core Application (6 Authenticated Pages) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/health" element={<FinancialHealth />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/calendar" element={<SmartCalendar />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/savings-goals" element={<SavingsGoals />} />
              <Route path="/investments" element={<Investments />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
