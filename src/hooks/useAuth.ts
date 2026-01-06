/**
 * Authentication hook for managing user auth state.
 *
 * Provides the current session, user, and loading state.
 * Listens to Supabase auth state changes and updates reactively.
 */

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  setUserContext as setSentryUserContext,
  clearUserContext as clearSentryUserContext,
  setTags,
} from '@/lib/monitoring/sentry';
import { identifyUser, resetUser } from '@/lib/monitoring/posthog';
import { getCurrentLocale } from '@/i18n';

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

    void getInitialSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }

      // Handle monitoring integration on auth state changes
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Get active tenant ID and primary role for user context
        const { useTenantStore: tenantStore } = await import('@/stores/tenantStore');
        const activeTenantId = tenantStore.getState().activeTenantId;
        const primary_role = tenantStore.getState().activeMembership?.role;
        const locale = getCurrentLocale();

        // Set Sentry user context with tenant and role
        setSentryUserContext(newSession.user.id, {
          tenant_id: activeTenantId ?? undefined,
          role: primary_role,
          locale,
        });

        // Set Sentry tags for filtering
        setTags({
          tenant_id: activeTenantId ?? undefined,
          user_role: primary_role,
          locale,
        });

        // Identify user in PostHog with properties
        const userProps = {
          tenant_count: 0, // TODO: fetch actual tenant count
          primary_role: primary_role ?? 'member',
          locale,
          created_at: newSession.user.created_at,
          email: newSession.user.email,
          display_name: newSession.user.user_metadata?.display_name,
        };
        identifyUser(newSession.user.id, userProps);
      } else if (event === 'SIGNED_OUT') {
        // Clear user context from monitoring services
        clearSentryUserContext();
        resetUser();

        // Clear tenant context
        const { useTenantStore: tenantStore } = await import('@/stores/tenantStore');
        await tenantStore.getState().clearTenantContext();
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
