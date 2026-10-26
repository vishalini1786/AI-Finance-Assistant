import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

// Protected Route Guard
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminProtectedRoute } from './components/common/AdminProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// User Onboarding Flow
import { Onboarding } from './pages/onboarding/Onboarding';

// Existing 6 Authenticated Core Pages (Paths Preserved)
import { Dashboard } from './pages/Dashboard';
import { Income } from './pages/Income';
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
import { Liabilities } from './pages/Liabilities';
import { BankTransactions } from './pages/BankTransactions';

// Admin Dashboard Pages
import { AdminOverview }        from './pages/admin/AdminOverview';
import { AdminUserManagement }  from './pages/admin/AdminUserManagement';
import { AdminSystemHealth }    from './pages/admin/AdminSystemHealth';
import { AdminDocuments }       from './pages/admin/AdminDocuments';
import { AdminAiMonitoring }    from './pages/admin/AdminAiMonitoring';
import { AdminAuditLogs }       from './pages/admin/AdminAuditLogs';
import { AdminCategories }      from './pages/admin/AdminCategories';
import { AdminProfile }         from './pages/admin/AdminProfile';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* 3. User Onboarding Flow */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* 4. Protected Core Application */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/income" element={<Income />} />
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
              <Route path="/liabilities" element={<Liabilities />} />
              <Route path="/bank-transactions" element={<BankTransactions />} />
            </Route>

            {/* 5. Admin Dashboard (role = admin required) */}
            <Route element={<AdminProtectedRoute />}>
              <Route path="/admin"             element={<AdminOverview />} />
              <Route path="/admin/users"        element={<AdminUserManagement />} />
              <Route path="/admin/health"       element={<AdminSystemHealth />} />
              <Route path="/admin/documents"    element={<AdminDocuments />} />
              <Route path="/admin/ai"           element={<AdminAiMonitoring />} />
              <Route path="/admin/audit-logs"   element={<AdminAuditLogs />} />
              <Route path="/admin/categories"   element={<AdminCategories />} />
              <Route path="/admin/profile"      element={<AdminProfile />} />
            </Route>

            {/* Fallback (must be last) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
