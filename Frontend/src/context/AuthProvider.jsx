import { useEffect, useRef, useState } from 'react';
import { authService, isAuthConfigured } from '../services/authService';
import { AuthContext } from './authContextValue';
import { createSessionRecheck } from '../utils/sessionRecheck';

export function AuthProvider({ children }) {
  const sessionVersion = useRef(0);
  const signedIn = useRef(false);
  const [user, setUser] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [sessionStatus, setSessionStatus] = useState(
    isAuthConfigured ? 'loading' : 'guest',
  );
  const sessionRecheck = useRef(null);
  if (!sessionRecheck.current) {
    sessionRecheck.current = createSessionRecheck({
      loadSession: () => authService.session(),
      onSession(nextUser) {
        sessionVersion.current += 1;
        signedIn.current = Boolean(nextUser);
        setUser(nextUser);
        setSessionStatus(nextUser ? 'authenticated' : 'guest');
        setSessionError(nextUser ? '' : 'Your session has expired. Please sign in again.');
      },
      // Keep the account during a network/server failure; it does not establish
      // that the cookie has expired and can be retried without signing in.
      onError: error => setSessionError(error.message),
    });
  }

  useEffect(() => {
    if (!isAuthConfigured) return;
    let active = true;
    const version = sessionVersion.current;
    setSessionStatus('loading'); setSessionError('');
    authService
      .session()
      .then((nextUser) => {
        if (active && version === sessionVersion.current) {
          signedIn.current = Boolean(nextUser);
          setUser(nextUser);
          setSessionStatus(nextUser ? 'authenticated' : 'guest');
        }
      })
      .catch(error => {
        if (active && version === sessionVersion.current) {
          setSessionStatus('error'); setSessionError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    function expired() {
      if (signedIn.current) void sessionRecheck.current.check();
    }
    window.addEventListener('fixmybuddy:session-expired', expired);
    return () => {
      window.removeEventListener('fixmybuddy:session-expired', expired);
      sessionRecheck.current.invalidate();
    };
  }, []);

  function acceptUser(nextUser) {
    sessionVersion.current += 1;
    sessionRecheck.current.invalidate();
    signedIn.current = Boolean(nextUser);
    setUser(nextUser);
    setSessionStatus('authenticated');
    setSessionError('');
  }
  async function signOut() {
    await authService.logout();
    sessionVersion.current += 1;
    sessionRecheck.current.invalidate();
    signedIn.current = false;
    setUser(null); setSessionStatus('guest');
    setSessionError('');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        signOut,
        acceptUser,
        sessionStatus,
        sessionError,
        retrySession: () => {
          sessionVersion.current += 1;
          sessionRecheck.current.invalidate();
          setRefresh(value => value + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
