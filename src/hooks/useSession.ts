'use client';
import { useState, useEffect, useCallback } from 'react';
import type { SessionResponse } from '@/lib/api/types';
import { createSession as apiCreateSession, getSession } from '@/lib/api/client';

const SESSION_TOKEN_KEY = 'af_token';
const SESSION_ID_KEY = 'af_session_id';

// Check synchronously whether we have stored credentials (client-side only).
// Used to initialise isLoading=true so that route guards don't fire before the
// async resume attempt completes (prevents race-condition redirect to '/').
function hasStoredCredentials(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem(SESSION_TOKEN_KEY) && localStorage.getItem(SESSION_ID_KEY));
}

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Initialise to true when localStorage has a stored session so that any
  // route guard that checks `!isLoading && !session` doesn't fire prematurely.
  const [isLoading, setIsLoading] = useState(() => hasStoredCredentials());
  const [error, setError] = useState<string | null>(null);

  // On mount: attempt auto-resume from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (storedToken && storedSessionId) {
      setIsLoading(true);
      getSession(storedSessionId, storedToken)
        .then((sess) => {
          setSession(sess);
          setToken(sess.token); // fresh token from server
          localStorage.setItem(SESSION_TOKEN_KEY, sess.token);
        })
        .catch(() => {
          // Stale session — clear and let user re-enter
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(SESSION_ID_KEY);
          setError('Your previous session could not be found. Please re-enter your details.');
        })
        .finally(() => setIsLoading(false));
    } else {
      // No stored credentials — ensure isLoading is false (handles SSR/hydration edge cases)
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(
    async (body: { email: string; name: string; team_type: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        const sess = await apiCreateSession(body);
        setSession(sess);
        setToken(sess.token);
        localStorage.setItem(SESSION_TOKEN_KEY, sess.token);
        localStorage.setItem(SESSION_ID_KEY, sess.session_id);
        return sess;
      } catch (err: unknown) {
        const e = err as { message?: string; code?: string };
        // US-7.3: System Owner email blocked — forward server message
        setError(e.message ?? 'An error occurred. Please try again.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resumeSession = useCallback(
    async (sessionId: string, existingToken: string) => {
      setIsLoading(true);
      try {
        const sess = await getSession(sessionId, existingToken);
        setSession(sess);
        setToken(sess.token);
        localStorage.setItem(SESSION_TOKEN_KEY, sess.token);
        localStorage.setItem(SESSION_ID_KEY, sess.session_id);
        return sess;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    setSession(null);
    setToken(null);
  }, []);

  return { session, token, isLoading, error, createSession, resumeSession, clearSession };
}
