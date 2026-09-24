import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated, currentUser, isLoading } = useAuth();

  // Wait for the session restore attempt to complete before rendering.
  // This prevents the login redirect flash on page refresh.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Loading FinMan...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // is_onboarded comes from PostgreSQL via the backend user object.
  // It is NOT read from localStorage.
  if (currentUser && !currentUser.is_onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};