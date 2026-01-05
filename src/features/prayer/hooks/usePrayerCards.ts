/**
 * Hook for fetching prayer cards with author information.
 *
 * Provides tenant-scoped prayer cards with filtering by recipient scope.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PrayerCardWithAuthor, PrayerCardRecipientScope } from '@/types/database';

export interface PrayerCardsState {
  prayerCards: PrayerCardWithAuthor[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface PrayerCardsFilter {
  scope: 'my_prayers' | 'received_prayers' | 'all_prayers';
}

const PAGE_SIZE = 20;

/**
 * Hook for fetching prayer cards within a tenant.
 *
 * @param tenantId - The tenant ID to fetch prayer cards for
 * @param membershipId - The current user's membership ID for filtering
 * @param filter - Filter option: my_prayers, received_prayers, or all_prayers
 * @param initialLimit - Initial number of items to fetch (default: PAGE_SIZE)
 * @returns PrayerCardsState with prayer cards list, loading, error, hasMore, loadMore, and refetch
 *
 * @example
 * ```tsx
 * function PrayerList() {
 *   const { activeTenantId, membershipId } = useTenantContext();
 *   const { prayerCards, loading, hasMore, loadMore, refetch } = usePrayerCards(
 *     activeTenantId,
 *     membershipId,
 *     { scope: 'my_prayers' }
 *   );
 *
 *   return (
 *     <FlatList
 *       data={prayerCards}
 *       keyExtractor={(item) => item.id}
 *       renderItem={({ item }) => <PrayerCardItem prayer={item} />}
 *       onEndReached={() => hasMore && loadMore()}
 *       onRefresh={refetch}
 *       refreshing={loading}
 *     />
 *   );
 * }
 * ```
 */
export function usePrayerCards(
  tenantId: string | null,
  membershipId: string | null,
  filter: PrayerCardsFilter = { scope: 'all_prayers' },
  initialLimit: number = PAGE_SIZE
): PrayerCardsState {
  const [prayerCards, setPrayerCards] = useState<PrayerCardWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchPrayerCards = useCallback(
    async (append: boolean = false) => {
      if (!tenantId || !membershipId) {
        setPrayerCards([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(!append);
      setError(null);

      try {
        let query = supabase
          .from('prayer_cards')
          .select(
            `
              id,
              tenant_id,
              author_id,
              content,
              recipient_scope,
              answered,
              answered_at,
              created_at,
              updated_at,
              author:author_id (
                id,
                user:users!memberships_user_id_fkey (
                  id,
                  display_name,
                  photo_url
                )
              )
            `
          )
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .range(append ? offset : 0, (append ? offset : 0) + initialLimit - 1);

        // Apply scope-based filtering using RLS
        // For 'my_prayers', fetch only authored prayers
        // For 'received_prayers', fetch prayers where user is a recipient
        // For 'all_prayers', fetch all church-wide plus small group/individual addressed to user
        switch (filter.scope) {
          case 'my_prayers':
            query = query.eq('author_id', membershipId);
            break;
          case 'received_prayers':
            // RLS will handle recipient filtering - we just need to exclude own prayers
            query = query.neq('author_id', membershipId);
            break;
          case 'all_prayers':
          default:
            // No additional filter - RLS handles visibility
            break;
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        // Transform data to match PrayerCardWithAuthor type
        const transformedData =
          data?.map((item) => ({
            id: item.id,
            tenant_id: item.tenant_id,
            author_id: item.author_id,
            content: item.content,
            recipient_scope: item.recipient_scope as PrayerCardRecipientScope,
            answered: item.answered,
            answered_at: item.answered_at,
            created_at: item.created_at,
            updated_at: item.updated_at,
            author: {
              id: item.author?.id ?? membershipId,
              user: {
                id: item.author?.user?.id ?? '',
                display_name: item.author?.user?.display_name ?? null,
                photo_url: item.author?.user?.photo_url ?? null,
              },
            },
          })) ?? [];

        if (append) {
          setPrayerCards((prev) => [...prev, ...transformedData]);
        } else {
          setPrayerCards(transformedData);
        }

        // Check if there are more items to load
        setHasMore(transformedData.length === initialLimit);
        setOffset(append ? offset + initialLimit : initialLimit);
      } catch (err) {
        setError(err as Error);
        setPrayerCards([]);
      } finally {
        setLoading(false);
      }
    },
    [tenantId, membershipId, filter.scope, initialLimit, offset]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchPrayerCards(true);
  }, [hasMore, loading, fetchPrayerCards]);

  const refetch = useCallback(async () => {
    setOffset(0);
    await fetchPrayerCards(false);
  }, [fetchPrayerCards]);

  useEffect(() => {
    void fetchPrayerCards(false);
  }, [tenantId, membershipId, filter.scope]);

  return {
    prayerCards,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

/**
 * Hook for fetching a single prayer card by ID.
 *
 * @param prayerCardId - The prayer card ID to fetch
 * @returns PrayerCardsState with single prayer card
 *
 * @example
 * ```tsx
 * function PrayerDetail({ prayerId }: { prayerId: string }) {
 *   const { prayerCards, loading } = usePrayerCardById(prayerId);
 *   const prayer = prayerCards[0];
 *
 *   if (loading) return <Spinner />;
 *   if (!prayer) return <Text>Not found</Text>;
 *
 *   return <PrayerCardDetail prayer={prayer} />;
 * }
 * ```
 */
export function usePrayerCardById(
  prayerCardId: string | null
): Omit<PrayerCardsState, 'hasMore' | 'loadMore'> {
  const [prayerCards, setPrayerCards] = useState<PrayerCardWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrayerCard = useCallback(async () => {
    if (!prayerCardId) {
      setPrayerCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('prayer_cards')
        .select(
          `
            id,
            tenant_id,
            author_id,
            content,
            recipient_scope,
            answered,
            answered_at,
            created_at,
            updated_at,
            author:author_id (
              id,
              user:users!memberships_user_id_fkey (
                id,
                display_name,
                photo_url
              )
            )
          `
        )
        .eq('id', prayerCardId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const transformedData: PrayerCardWithAuthor = {
          id: data.id,
          tenant_id: data.tenant_id,
          author_id: data.author_id,
          content: data.content,
          recipient_scope: data.recipient_scope as PrayerCardRecipientScope,
          answered: data.answered,
          answered_at: data.answered_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
          author: {
            id: (data.author as { id?: string } | null)?.id ?? '',
            user: {
              id: (data.author as { user?: { id?: string } } | null)?.user?.id ?? '',
              display_name:
                (data.author as { user?: { display_name?: string | null } } | null)?.user
                  ?.display_name ?? null,
              photo_url:
                (data.author as { user?: { photo_url?: string | null } } | null)?.user?.photo_url ??
                null,
            },
          },
        };

        setPrayerCards([transformedData]);
      } else {
        setPrayerCards([]);
      }
    } catch (err) {
      setError(err as Error);
      setPrayerCards([]);
    } finally {
      setLoading(false);
    }
  }, [prayerCardId]);

  useEffect(() => {
    void fetchPrayerCard();
  }, [fetchPrayerCard]);

  return {
    prayerCards,
    loading,
    error,
    refetch: fetchPrayerCard,
  };
}
