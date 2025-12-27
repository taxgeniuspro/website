'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Session user type - compatible with NextAuth session format
 */
interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
  isActive?: boolean;
}

/**
 * Session data type - matches NextAuth's session structure
 */
interface SessionData {
  user: SessionUser;
  expires: string;
}

/**
 * useSession hook - Drop-in replacement for NextAuth's useSession
 *
 * Uses Supabase Auth for authentication state and fetches
 * user profile/role from our database via /api/auth/session
 *
 * @returns {{ data: SessionData | null, status: 'loading' | 'authenticated' | 'unauthenticated', update: () => Promise<void> }}
 */
export function useSession() {
  const [data, setData] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        setData(null);
        setStatus('unauthenticated');
        return;
      }

      const session = await res.json();

      if (session?.user?.id) {
        setData(session);
        setStatus('authenticated');
      } else {
        setData(null);
        setStatus('unauthenticated');
      }
    } catch (error) {
      console.error('[useSession] Error fetching session:', error);
      setData(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // User is logged in via Supabase, fetch full profile
        fetchSession();
      } else {
        setData(null);
        setStatus('unauthenticated');
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchSession();
        } else if (event === 'SIGNED_OUT') {
          setData(null);
          setStatus('unauthenticated');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSession]);

  // Update function for manual session refresh
  const update = useCallback(async () => {
    setStatus('loading');
    await fetchSession();
  }, [fetchSession]);

  return { data, status, update };
}

/**
 * signOut function - Signs out the user from Supabase
 * Compatible with NextAuth's signOut behavior
 */
export async function signOut(options?: { callbackUrl?: string; redirect?: boolean }) {
  const supabase = createClient();
  await supabase.auth.signOut();

  if (options?.redirect !== false) {
    const callbackUrl = options?.callbackUrl || '/';
    window.location.href = callbackUrl;
  }
}

/**
 * signIn function - Redirects to sign in page
 * Compatible with NextAuth's signIn behavior
 */
export function signIn(provider?: string, options?: { callbackUrl?: string }) {
  const callbackUrl = options?.callbackUrl || '/dashboard';
  const redirectUrl = `/auth/signin?redirect=${encodeURIComponent(callbackUrl)}`;
  window.location.href = redirectUrl;
}
