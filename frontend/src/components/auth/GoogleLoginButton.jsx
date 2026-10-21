import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const GoogleLoginButton = () => {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleAuthSuccess = (user) => {
    if (user?.is_onboarded) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  };

  useEffect(() => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        // Enforce account chooser and disable silent auto-selection
        window.google.accounts.id.disableAutoSelect();
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (response) => {
            if (!response.credential) return;
            setLoading(true);
            setError('');
            try {
              const user = await googleLogin({ credential: response.credential });
              handleAuthSuccess(user);
            } catch (err) {
              setError(err?.response?.data?.message || 'Google authentication failed.');
            } finally {
              setLoading(false);
            }
          },
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'pill',
          });
        }
      } catch (err) {
        console.warn('Google Identity initialization notice:', err);
      }
    }
  }, [googleClientId]);

  const handleDemoGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await googleLogin({
        demoEmail: 'demo.google@finman.app',
        demoName: 'Google Demo User',
      });
      handleAuthSuccess(user);
    } catch (err) {
      setError(err?.response?.data?.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (googleClientId && window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          prompt: 'select_account',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setError(tokenResponse.error_description || 'Google sign-in was cancelled.');
              return;
            }
            if (tokenResponse.access_token) {
              setLoading(true);
              setError('');
              try {
                const user = await googleLogin({ credential: tokenResponse.access_token });
                handleAuthSuccess(user);
              } catch (err) {
                setError(err?.response?.data?.message || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('OAuth2 prompt init error, falling back:', err);
      }
    }

    // Fallback if no OAuth client configured
    handleDemoGoogleLogin();
  };

  return (
    <div className="w-full">
      {/* If Google GIS Client is configured, mount the GIS container */}
      {googleClientId && (
        <div id="google-btn-container" ref={googleBtnRef} className="w-full flex justify-center mb-2" />
      )}

      {/* Standard Google login button with official branding & prompt: select_account */}
      <button
        id="google-login-custom-btn"
        onClick={handleGoogleClick}
        disabled={loading}
        type="button"
        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-finman-blue" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{googleClientId ? 'Sign in with Google (Choose Account)' : 'Continue with Google'}</span>
      </button>

      {error && (
        <p className="text-[11px] text-rose-500 text-center mt-2 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};