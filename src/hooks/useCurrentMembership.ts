/**
 * Current membership hook.
 *
 * Returns the current user's membership for the active tenant.
 * Used to get the membership ID for chat operations.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useTenantContext } from './useTenantContext';
import type { Membership } from '@/types/database';

export interface CurrentMembershipState {
  membership: Membership | null;
  membershipId: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching the current user's membership in the active tenant.
 *
 * @returns CurrentMembershipState with membership data, loading, and error
 *
 * @example
 * ```tsx
 * function ChatScreen() {
 *   const { membershipId, loading } = useCurrentMembership();
 *
 *   if (loading) return <Spinner />;
 *   if (!membershipId) return <NotAMember />;
 *
 *   return <ChatList membershipId={membershipId} />;
 * }
 * ```
 */
export function useCurrentMembership(): CurrentMembershipState {
  const { user } = useAuth();
  const { activeTenantId } = useTenantContext();

  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !activeTenantId) {
      setMembership(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchMembership() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('memberships')
          .select('*, tenant:tenants(*)')
          .eq('user_id', user!.id)
          .eq('tenant_id', activeTenantId!)
          .eq('status', 'active')
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!cancelled) {
          setMembership(data as Membership);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setMembership(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMembership();

    return () => {
      cancelled = true;
    };
  }, [user, activeTenantId]);

  return {
    membership,
    membershipId: membership?.id ?? null,
    loading,
    error,
  };
}
