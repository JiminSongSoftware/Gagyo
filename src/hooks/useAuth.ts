/**
 * Authentication hook for managing user auth state.
 *
 * Provides the current session, user, and loading state.
 * Listens to Supabase auth state changes and updates reactively.
 */

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

/**
 * Hook for accessing authentication state.
 *
 * @returns AuthState with session, user, and loading status
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *   if (!user) return <LoginScreen />;
 *
 *   return <WelcomeScreen name={user.email} />;
 * }
 * ```
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    let mounted = true;

    async function getInitialSession() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }

      // Clear tenant context on sign out
      if (event === 'SIGNED_OUT') {
        const { useTenantStore } = await import('@/stores/tenantStore');
        await useTenantStore.getState().clearTenantContext();
      }
    });

    // Cleanup subscription on unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

/**
 * Hook convenience exports for individual values.
 */
export function useSession(): Session | null {
  const { session } = useAuth();
  return session;
}

export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

export function useAuthLoading(): boolean {
  const { loading } = useAuth();
  return loading;
}

/**
 * Hook that returns true if user is authenticated.
 */
export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && user !== null;
}
