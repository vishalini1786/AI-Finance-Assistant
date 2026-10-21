import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // currentUser: full user object fetched from PostgreSQL via backend API.
  // null = not yet fetched or not authenticated.
  const [currentUser, setCurrentUser] = useState(null);

  // isAuthenticated: true only when we have a valid user object from the backend.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // isLoading: true while we are verifying the JWT and fetching the user
  // on initial app load. Prevents protected routes from flashing.
  const [isLoading, setIsLoading] = useState(true);

  // ----------------------------------------------------------------
  // On app mount: if a JWT token exists in localStorage, attempt to
  // fetch the current user from the backend to restore the session.
  // PostgreSQL is the source of truth — we do NOT reconstruct user
  // data from localStorage.
  // ----------------------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      if (!authService.isAuthenticated()) {
        // No token → definitely not authenticated.
        setIsLoading(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (err) {
        // Token is invalid or expired → clear it and reset state.
        authService.logout();
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ----------------------------------------------------------------
  // login — calls POST /api/auth/login, stores JWT, sets user from DB.
  // Throws on failure so the Login page can show the error message.
  // ----------------------------------------------------------------
  const login = async (email, password) => {
    const user = await authService.login({ email, password });
    setCurrentUser(user);
    setIsAuthenticated(true);
    return user;
  };

  // ----------------------------------------------------------------
  // register — calls POST /api/auth/register, stores JWT, sets user.
  // Backend creates the user in PostgreSQL with a bcrypt password hash.
  // ----------------------------------------------------------------
  const register = async ({ name, email, password, phone }) => {
    const user = await authService.register({ name, email, password, phone });
    setCurrentUser(user);
    setIsAuthenticated(true);
    return user;
  };

  // ----------------------------------------------------------------
  // completeOnboarding — calls POST /api/users/onboarding.
  // Backend persists ALL onboarding data to PostgreSQL and sets
  // is_onboarded = TRUE. Returns the updated user object.
  // No localStorage is used for onboarding state.
  // ----------------------------------------------------------------
  const completeOnboarding = async (onboardingData) => {
    const updatedUser = await authService.completeOnboarding(onboardingData);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  const refreshCurrentUser = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
    setIsAuthenticated(true);
    return user;
  };

  const updateProfile = async (profileUpdates) => {
    const updatedUser = await userService.updateProfile(profileUpdates);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  // ----------------------------------------------------------------
  // logout — clears the JWT token. User data stays in PostgreSQL.
  // ----------------------------------------------------------------
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const googleLogin = async ({ credential, demoEmail, demoName }) => {
    const user = await authService.googleLogin({ credential, demoEmail, demoName });
    setCurrentUser(user);
    setIsAuthenticated(true);
    return user;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        isLoading,
        login,
        register,
        googleLogin,
        completeOnboarding,
        refreshCurrentUser,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
