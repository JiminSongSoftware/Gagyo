/**
 * Hook for fetching prayer analytics statistics.
 *
 * Provides prayer statistics for different scopes and time periods.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AnalyticsScope = 'individual' | 'small_group' | 'church_wide';
export type AnalyticsPeriod = 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface PrayerAnalytics {
  totalPrayers: number;
  answeredPrayers: number;
  answerRate: number;
  period: AnalyticsPeriod;
  scope: AnalyticsScope;
}

export interface PrayerAnalyticsState {
  analytics: PrayerAnalytics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Get date range for a given period.
 */
function getDateRange(period: AnalyticsPeriod): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString();

  let startDate: Date;

  switch (period) {
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'semi_annual':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'annual':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
  }

  return {
    startDate: startDate.toISOString(),
    endDate,
  };
}

/**
 * Hook for fetching prayer analytics.
 *
 * @param tenantId - The tenant ID to fetch analytics for
 * @param scope - The scope: individual, small_group, or church_wide
 * @param scopeId - The membership ID or small group ID (null for church_wide)
 * @param period - The time period: weekly, monthly, quarterly, semi_annual, or annual
 * @returns PrayerAnalyticsState with analytics data
 *
 * @example
 * ```tsx
 * function PrayerStats() {
 *   const { activeTenantId, membershipId, smallGroupId } = useTenantContext();
 *   const { analytics, loading } = usePrayerAnalytics(
 *     activeTenantId,
 *     'small_group',
 *     smallGroupId,
 *     'monthly'
 *   );
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <View>
 *       <Text>Total: {analytics?.totalPrayers}</Text>
 *       <Text>Answered: {analytics?.answeredPrayers}</Text>
 *       <Text>Rate: {analytics?.answerRate}%</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function usePrayerAnalytics(
  tenantId: string | null,
  scope: AnalyticsScope = 'church_wide',
  scopeId: string | null = null,
  period: AnalyticsPeriod = 'monthly'
): PrayerAnalyticsState {
  const [analytics, setAnalytics] = useState<PrayerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!tenantId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(period);

      let query = supabase
        .from('prayer_cards')
        .select('id, answered, author_id, recipient_scope')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Apply scope-based filtering
      switch (scope) {
        case 'individual':
          // For individual scope, fetch only authored prayers
          if (scopeId) {
            query = query.eq('author_id', scopeId);
          }
          break;
        case 'small_group':
          // For small group scope, fetch prayers with small_group scope
          // RLS will handle the actual small group membership check
          query = query.eq('recipient_scope', 'small_group');
          break;
        case 'church_wide':
        default:
          // For church-wide, fetch all prayers
          break;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const totalPrayers = data?.length ?? 0;
      const answeredPrayers = data?.filter((p) => p.answered).length ?? 0;
      const answerRate = totalPrayers > 0 ? (answeredPrayers / totalPrayers) * 100 : 0;

      setAnalytics({
        totalPrayers,
        answeredPrayers,
        answerRate: Math.round(answerRate * 10) / 10, // Round to 1 decimal place
        period,
        scope,
      });
    } catch (err) {
      setError(err as Error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, scope, scopeId, period]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
