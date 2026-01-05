/**
 * Memberships hook for fetching user's tenant memberships.
 *
 * Fetches all active memberships for a given user, including
 * related tenant information.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Membership } from '@/types/database';

export interface MembershipsState {
  memberships: Membership[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching user's memberships.
 *
 * @param userId - The user ID to fetch memberships for, or undefined to skip
 * @returns MembershipsState with memberships list, loading, and error
 *
 * @example
 * ```tsx
 * function TenantSelection() {
 *   const { user } = useAuth();
 *   const { memberships, loading } = useMemberships(user?.id);
 *
 *   if (loading) return <Spinner />;
 *   if (memberships.length === 0) return <NoTenantsMessage />;
 *
 *   return (
 *     <FlatList
 *       data={memberships}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item }) => <TenantButton membership={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useMemberships(userId: string | undefined): MembershipsState {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchMemberships() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('memberships')
          .select('*, tenant:tenants(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        if (!cancelled) {
          setMemberships((data ?? []) as Membership[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setMemberships([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchMemberships();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { memberships, loading, error };
}

/**
 * Convenience hook that returns only active memberships.
 * Same as useMemberships since we already filter by status='active'.
 */
export function useActiveMemberships(userId: string | undefined): MembershipsState {
  return useMemberships(userId);
}

/**
 * Hook that returns true if user has any memberships.
 */
export function useHasMemberships(userId: string | undefined): boolean {
  const { memberships, loading } = useMemberships(userId);
  return !loading && memberships.length > 0;
}
