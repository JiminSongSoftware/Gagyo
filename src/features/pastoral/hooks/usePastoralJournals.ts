/**
 * Hook for fetching pastoral journals with author and small group information.
 *
 * Provides tenant-scoped pastoral journals with role-based filtering.
 * The filtering logic respects the hierarchical review workflow:
 * - Leaders see their own group's journals
 * - Zone leaders see journals from groups in their zone
 * - Pastors/admins see all journals in their tenant
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type PastoralJournal = Database['public']['Tables']['pastoral_journals']['Row'];
type PastoralJournalStatus = PastoralJournal['status'];
type Membership = Database['public']['Tables']['memberships']['Row'];

export interface PastoralJournalWithRelations extends PastoralJournal {
  author: {
    id: string;
    user: {
      id: string;
      display_name: string | null;
      photo_url: string | null;
    } | null;
  } | null;
  small_group: {
    id: string;
    name: string;
  } | null;
  comment_count?: number;
}

export interface PastoralJournalsState {
  journals: PastoralJournalWithRelations[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface PastoralJournalsFilter {
  scope: 'my_journals' | 'submitted_journals' | 'all_journals';
  status?: PastoralJournalStatus;
}

const PAGE_SIZE = 20;

/**
 * Hook for fetching pastoral journals within a tenant.
 *
 * Role-based visibility is enforced at the database level via RLS:
 * - Leaders can only view their own group's journals
 * - Zone leaders can view journals from groups in their zone
 * - Pastors/admins can view all journals in their tenant
 *
 * @param tenantId - The tenant ID to fetch journals for
 * @param membershipId - The current user's membership ID for RLS
 * @param membership - The current user's membership with role and zone info
 * @param filter - Filter option and optional status filter
 * @param initialLimit - Initial number of items to fetch (default: PAGE_SIZE)
 * @returns PastoralJournalsState with journals list, loading, error, hasMore, loadMore, and refetch
 *
 * @example
 * ```tsx
 * function PastoralJournalList() {
 *   const { activeTenantId, membershipId, membership } = useTenantContext();
 *   const { journals, loading, hasMore, loadMore, refetch } = usePastoralJournals(
 *     activeTenantId,
 *     membershipId,
 *     membership,
 *     { scope: 'my_journals' }
 *   );
 *
 *   return (
 *     <FlatList
 *       data={journals}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item }) => <PastoralJournalCard journal={item} />}
 *       onEndReached={() => hasMore && loadMore()}
 *       onRefresh={refetch}
 *       refreshing={loading}
 *     />
 *   );
 * }
 * ```
 */
export function usePastoralJournals(
  tenantId: string | null,
  membershipId: string | null,
  membership: Membership | null,
  filter: PastoralJournalsFilter = { scope: 'my_journals' },
  initialLimit: number = PAGE_SIZE
): PastoralJournalsState {
  const [journals, setJournals] = useState<PastoralJournalWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchJournals = useCallback(
    async (append: boolean = false) => {
      if (!tenantId || !membershipId) {
        setJournals([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(!append);
      setError(null);

      try {
        // Build the base query with author and small group relations
        let query = supabase
          .from('pastoral_journals')
          .select(
            `
              id,
              tenant_id,
              small_group_id,
              author_id,
              status,
              week_start_date,
              content,
              submitted_at,
              zone_reviewed_at,
              pastor_confirmed_at,
              created_at,
              updated_at,
              author:author_id (
                id,
                user:users!memberships_user_id_fkey (
                  id,
                  display_name,
                  photo_url
                )
              ),
              small_group:small_group_id (
                id,
                name
              )
            `
          )
          .eq('tenant_id', tenantId)
          .order('week_start_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(append ? offset : 0, (append ? offset : 0) + initialLimit - 1);

        // Apply status filter if provided
        if (filter.status) {
          query = query.eq('status', filter.status);
        }

        // Apply scope-based filtering
        // Note: RLS policies handle the actual access control
        // These filters help optimize the query and respect user preferences
        switch (filter.scope) {
          case 'my_journals':
            // Leaders see their own group's journals
            // RLS will enforce that only leaders/co-leaders can query
            if (membership?.small_group_id) {
              query = query.eq('small_group_id', membership.small_group_id);
            }
            break;
          case 'submitted_journals':
            // Zone leaders see journals from their zone that are submitted
            // Pastors see all submitted journals
            query = query.in('status', ['submitted', 'zone_reviewed']);
            break;
          case 'all_journals':
            // No additional filter - RLS handles visibility based on role
            break;
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        // Transform data to match PastoralJournalWithRelations type
        const transformedData =
          data?.map((item) => ({
            id: item.id,
            tenant_id: item.tenant_id,
            small_group_id: item.small_group_id,
            author_id: item.author_id,
            status: item.status as PastoralJournalStatus,
            week_start_date: item.week_start_date,
            content: item.content,
            submitted_at: item.submitted_at,
            zone_reviewed_at: item.zone_reviewed_at,
            pastor_confirmed_at: item.pastor_confirmed_at,
            created_at: item.created_at,
            updated_at: item.updated_at,
            author: item.author
              ? {
                  id: item.author.id,
                  user: {
                    id: item.author.user?.id ?? '',
                    display_name: item.author.user?.display_name ?? null,
                    photo_url: item.author.user?.photo_url ?? null,
                  },
                }
              : null,
            small_group: item.small_group
              ? {
                  id: item.small_group.id,
                  name: item.small_group.name,
                }
              : null,
          })) ?? [];

        if (append) {
          setJournals((prev) => [...prev, ...transformedData]);
        } else {
          setJournals(transformedData);
        }

        // Check if there are more items to load
        setHasMore(transformedData.length === initialLimit);
        setOffset(append ? offset + initialLimit : initialLimit);
      } catch (err) {
        setError(err as Error);
        setJournals([]);
      } finally {
        setLoading(false);
      }
    },
    [tenantId, membershipId, membership, filter.scope, filter.status, initialLimit, offset]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchJournals(true);
  }, [hasMore, loading, fetchJournals]);

  const refetch = useCallback(async () => {
    setOffset(0);
    await fetchJournals(false);
  }, [fetchJournals]);

  useEffect(() => {
    void fetchJournals(false);
  }, [tenantId, membershipId, membership?.small_group_id, filter.scope, filter.status]);

  return {
    journals,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

/**
 * Hook for fetching a single pastoral journal by ID.
 *
 * @param journalId - The pastoral journal ID to fetch
 * @returns PastoralJournalsState with single journal
 *
 * @example
 * ```tsx
 * function PastoralJournalDetail({ journalId }: { journalId: string }) {
 *   const { journals, loading } = usePastoralJournalById(journalId);
 *   const journal = journals[0];
 *
 *   if (loading) return <Spinner />;
 *   if (!journal) return <Text>Not found</Text>;
 *
 *   return <PastoralJournalDetailContent journal={journal} />;
 * }
 * ```
 */
export function usePastoralJournalById(
  journalId: string | null
): Omit<PastoralJournalsState, 'hasMore' | 'loadMore'> {
  const [journals, setJournals] = useState<PastoralJournalWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchJournal = useCallback(async () => {
    if (!journalId) {
      setJournals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pastoral_journals')
        .select(
          `
            id,
            tenant_id,
            small_group_id,
            author_id,
            status,
            week_start_date,
            content,
            submitted_at,
            zone_reviewed_at,
            pastor_confirmed_at,
            created_at,
            updated_at,
            author:author_id (
              id,
              user:users!memberships_user_id_fkey (
                id,
                display_name,
                photo_url
              )
            ),
            small_group:small_group_id (
              id,
              name
            )
          `
        )
        .eq('id', journalId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const transformedData: PastoralJournalWithRelations = {
          id: data.id,
          tenant_id: data.tenant_id,
          small_group_id: data.small_group_id,
          author_id: data.author_id,
          status: data.status as PastoralJournalStatus,
          week_start_date: data.week_start_date,
          content: data.content,
          submitted_at: data.submitted_at,
          zone_reviewed_at: data.zone_reviewed_at,
          pastor_confirmed_at: data.pastor_confirmed_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
          author: data.author
            ? {
                id: data.author.id,
                user: {
                  id: data.author.user?.id ?? '',
                  display_name: data.author.user?.display_name ?? null,
                  photo_url: data.author.user?.photo_url ?? null,
                },
              }
            : null,
          small_group: data.small_group
            ? {
                id: data.small_group.id,
                name: data.small_group.name,
              }
            : null,
        };

        setJournals([transformedData]);
      } else {
        setJournals([]);
      }
    } catch (err) {
      setError(err as Error);
      setJournals([]);
    } finally {
      setLoading(false);
    }
  }, [journalId]);

  useEffect(() => {
    void fetchJournal();
  }, [fetchJournal]);

  return {
    journals,
    loading,
    error,
    refetch: fetchJournal,
  };
}
