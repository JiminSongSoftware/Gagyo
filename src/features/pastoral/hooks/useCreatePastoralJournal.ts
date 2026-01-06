/**
 * Hook for creating pastoral journals.
 *
 * Provides a mutation function for creating pastoral journals with tenant isolation,
 * duplicate prevention (same week + same group), and role-based access control.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type PastoralJournalStatus = Database['public']['Tables']['pastoral_journals']['Row']['status'];

export interface PastoralJournalContent {
  attendance?: {
    present: number;
    absent: number;
    newVisitors: number;
  };
  prayerRequests?: string[];
  highlights?: string[];
  concerns?: string[];
  nextSteps?: string[];
}

export interface CreatePastoralJournalOptions {
  weekStartDate: string; // ISO date string for the Monday of the week
  content: PastoralJournalContent;
  submitForReview?: boolean; // If true, set status to 'submitted' instead of 'draft'
}

export interface CreatePastoralJournalState {
  createJournal: (options: CreatePastoralJournalOptions) => Promise<string | null>;
  creating: boolean;
  error: Error | null;
}

const MAX_PRAYER_REQUESTS = 10;
const MAX_HIGHLIGHTS = 10;
const MAX_CONCERNS = 10;
const MAX_NEXT_STEPS = 10;
const MAX_STRING_LENGTH = 500;

/**
 * Hook for creating pastoral journals.
 *
 * Validates that:
 * - Only one journal per week per small group (enforced by unique constraint)
 * - User has leader or co_leader role (enforced by RLS)
 * - All content is within size limits
 *
 * @param tenantId - The tenant ID for the journal
 * @param smallGroupId - The small group ID (leader's group)
 * @param authorMembershipId - The author's membership ID
 * @returns CreatePastoralJournalState with createJournal function, creating state, and error
 *
 * @example
 * ```tsx
 * function CreatePastoralJournalForm() {
 *   const { activeTenantId, membershipId, membership } = useTenantContext();
 *   const { createJournal, creating, error } = useCreatePastoralJournal(
 *     activeTenantId,
 *     membership?.small_group_id,
 *     membershipId
 *   );
 *
 *   const handleSubmit = async () => {
 *     const result = await createJournal({
 *       weekStartDate: '2025-01-06', // Monday of the week
 *       content: {
 *         attendance: { present: 15, absent: 1, newVisitors: 2 },
 *         prayerRequests: ['Pray for health of our members'],
 *         highlights: ['Three new members joined!'],
 *       },
 *       submitForReview: false, // Save as draft
 *     });
 *
 *     if (result) {
 *       console.log('Created:', result);
 *       router.push(`/pastoral/${result}`);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleSubmit} disabled={creating}>
 *         Save as Draft
 *       </Button>
 *       {error && <Text>{error.message}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useCreatePastoralJournal(
  tenantId: string | null,
  smallGroupId: string | null,
  authorMembershipId: string | null
): CreatePastoralJournalState {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createJournal = useCallback(
    async (options: CreatePastoralJournalOptions): Promise<string | null> => {
      const { weekStartDate, content, submitForReview = false } = options;

      if (!tenantId || !smallGroupId || !authorMembershipId) {
        setError(new Error('Missing required parameters'));
        return null;
      }

      // Validation
      if (!weekStartDate) {
        setError(new Error('Week start date is required'));
        return null;
      }

      // Validate week start date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(weekStartDate)) {
        setError(new Error('Week start date must be in YYYY-MM-DD format'));
        return null;
      }

      // Validate attendance if provided
      if (content.attendance) {
        const { present, absent, newVisitors } = content.attendance;
        if (present < 0 || absent < 0 || newVisitors < 0) {
          setError(new Error('Attendance values cannot be negative'));
          return null;
        }
        if (present > 9999 || absent > 9999 || newVisitors > 9999) {
          setError(new Error('Attendance values are too large'));
          return null;
        }
      }

      // Validate array sizes
      if (content.prayerRequests && content.prayerRequests.length > MAX_PRAYER_REQUESTS) {
        setError(new Error(`Cannot exceed ${MAX_PRAYER_REQUESTS} prayer requests`));
        return null;
      }
      if (content.highlights && content.highlights.length > MAX_HIGHLIGHTS) {
        setError(new Error(`Cannot exceed ${MAX_HIGHLIGHTS} highlights`));
        return null;
      }
      if (content.concerns && content.concerns.length > MAX_CONCERNS) {
        setError(new Error(`Cannot exceed ${MAX_CONCERNS} concerns`));
        return null;
      }
      if (content.nextSteps && content.nextSteps.length > MAX_NEXT_STEPS) {
        setError(new Error(`Cannot exceed ${MAX_NEXT_STEPS} next steps`));
        return null;
      }

      // Validate string lengths in arrays
      const validateStringLengths = (items: string[] | undefined, fieldName: string): boolean => {
        if (!items) return true;
        for (const item of items) {
          if (item.length > MAX_STRING_LENGTH) {
            setError(new Error(`${fieldName} cannot exceed ${MAX_STRING_LENGTH} characters each`));
            return false;
          }
        }
        return true;
      };

      if (
        !validateStringLengths(content.prayerRequests, 'Prayer requests') ||
        !validateStringLengths(content.highlights, 'Highlights') ||
        !validateStringLengths(content.concerns, 'Concerns') ||
        !validateStringLengths(content.nextSteps, 'Next steps')
      ) {
        return null;
      }

      setCreating(true);
      setError(null);

      try {
        // Check for existing journal for same week and group (duplicate prevention)
        const { data: existingJournal, error: checkError } = await supabase
          .from('pastoral_journals')
          .select('id, status')
          .eq('tenant_id', tenantId)
          .eq('small_group_id', smallGroupId)
          .eq('week_start_date', weekStartDate)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is expected
          throw checkError;
        }

        if (existingJournal) {
          // Journal already exists for this week
          const statusText = existingJournal.status.replace('_', ' ');
          throw new Error(
            `A journal for this week already exists (${statusText}). Please edit the existing journal instead.`
          );
        }

        // Insert the pastoral journal
        const { data, error: insertError } = await supabase
          .from('pastoral_journals')
          .insert({
            tenant_id: tenantId,
            small_group_id: smallGroupId,
            author_id: authorMembershipId,
            status: submitForReview
              ? ('submitted' as PastoralJournalStatus)
              : ('draft' as PastoralJournalStatus),
            week_start_date: weekStartDate,
            content:
              content as Database['public']['Tables']['pastoral_journals']['Insert']['content'],
            submitted_at: submitForReview ? new Date().toISOString() : null,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        if (!data) {
          throw new Error('Failed to create pastoral journal');
        }

        return data.id;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [tenantId, smallGroupId, authorMembershipId]
  );

  return {
    createJournal,
    creating,
    error,
  };
}
