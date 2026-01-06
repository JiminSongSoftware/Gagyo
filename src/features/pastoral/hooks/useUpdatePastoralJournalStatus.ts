/**
 * Hook for updating pastoral journal status.
 *
 * Provides a mutation function for updating journal status with:
 * - Client-side transition validation
 * - Role-based access control (via RLS)
 * - Edge function triggering for notifications
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type PastoralJournalStatus = Database['public']['Tables']['pastoral_journals']['Row']['status'];
type Membership = Database['public']['Tables']['memberships']['Row'];

export interface UpdatePastoralJournalStatusOptions {
  journalId: string;
  newStatus: PastoralJournalStatus;
}

export interface UpdatePastoralJournalStatusState {
  updateStatus: (options: UpdatePastoralJournalStatusOptions) => Promise<boolean>;
  updating: boolean;
  error: Error | null;
}

/**
 * Valid status transitions based on the hierarchical review workflow.
 *
 * draft → submitted (leader action)
 * submitted → zone_reviewed (zone leader action)
 * zone_reviewed → pastor_confirmed (pastor action)
 */
const VALID_TRANSITIONS: Record<PastoralJournalStatus, PastoralJournalStatus[]> = {
  draft: ['submitted'],
  submitted: ['zone_reviewed'],
  zone_reviewed: ['pastor_confirmed'],
  pastor_confirmed: [], // Terminal state - no further transitions
};

/**
 * Required roles for each status transition.
 * RLS will enforce these at the database level.
 */
const REQUIRED_ROLES: Record<string, string[]> = {
  'draft->submitted': ['leader', 'co_leader'],
  'submitted->zone_reviewed': ['zone_leader'],
  'zone_reviewed->pastor_confirmed': ['pastor', 'admin'],
};

/**
 * Hook for updating pastoral journal status.
 *
 * The hook validates that:
 * - The transition is valid (follows the workflow)
 * - The user has the required role (client-side check, RLS enforces server-side)
 *
 * After a successful update, the edge function is called to send notifications.
 *
 * @param tenantId - The tenant ID
 * @param membership - The current user's membership with role info
 * @returns UpdatePastoralJournalStatusState with updateStatus function, updating state, and error
 *
 * @example
 * ```tsx
 * function PastoralJournalDetail({ journal }: { journal: PastoralJournal }) {
 *   const { activeTenantId, membership } = useTenantContext();
 *   const { updateStatus, updating, error } = useUpdatePastoralJournalStatus(
 *     activeTenantId,
 *     membership
 *   );
 *
 *   const handleSubmitForReview = async () => {
 *     const success = await updateStatus({
 *       journalId: journal.id,
 *       newStatus: 'submitted',
 *     });
 *
 *     if (success) {
 *       console.log('Journal submitted for review');
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleSubmitForReview} disabled={updating}>
 *         Submit for Review
 *       </Button>
 *       {error && <Text>{error.message}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useUpdatePastoralJournalStatus(
  tenantId: string | null,
  membership: Membership | null
): UpdatePastoralJournalStatusState {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateStatus = useCallback(
    async (options: UpdatePastoralJournalStatusOptions): Promise<boolean> => {
      const { journalId, newStatus } = options;

      if (!tenantId) {
        setError(new Error('Missing tenant context'));
        return false;
      }

      if (!journalId) {
        setError(new Error('Journal ID is required'));
        return false;
      }

      setUpdating(true);
      setError(null);

      try {
        // First, fetch the current journal to get its current status
        const { data: journal, error: fetchError } = await supabase
          .from('pastoral_journals')
          .select('id, status, tenant_id')
          .eq('id', journalId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!journal) {
          throw new Error('Journal not found');
        }

        const oldStatus = journal.status as PastoralJournalStatus;

        // Validate the transition is allowed
        const allowedTransitions = VALID_TRANSITIONS[oldStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
          throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
        }

        // Client-side role validation (RLS will enforce server-side)
        const role = membership?.role;
        const transitionKey = `${oldStatus}->${newStatus}`;
        const allowedRoles = REQUIRED_ROLES[transitionKey];

        if (allowedRoles && role && !allowedRoles.includes(role)) {
          throw new Error(
            `You do not have permission to perform this action. Required role: ${allowedRoles.join(' or ')}`
          );
        }

        // Perform the status update
        const updateData: Database['public']['Tables']['pastoral_journals']['Update'] = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        // Set the appropriate timestamp based on the new status
        switch (newStatus) {
          case 'submitted':
            updateData.submitted_at = new Date().toISOString();
            break;
          case 'zone_reviewed':
            updateData.zone_reviewed_at = new Date().toISOString();
            break;
          case 'pastor_confirmed':
            updateData.pastor_confirmed_at = new Date().toISOString();
            break;
        }

        const { error: updateError } = await supabase
          .from('pastoral_journals')
          .update(updateData)
          .eq('id', journalId)
          .eq('tenant_id', tenantId);

        if (updateError) {
          throw updateError;
        }

        // Trigger the edge function to send notifications
        // We do this after the update succeeds
        const { error: edgeFunctionError } = await supabase.functions.invoke(
          'handle-pastoral-journal-change',
          {
            body: {
              journal_id: journalId,
              old_status: oldStatus,
              new_status: newStatus,
            },
          }
        );

        if (edgeFunctionError) {
          console.warn('Status updated but notification failed:', edgeFunctionError);
          // We don't throw here - the status update was successful
          // Notifications are best-effort
        }

        return true;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [tenantId, membership]
  );

  return {
    updateStatus,
    updating,
    error,
  };
}

/**
 * Hook for checking if a user can perform a specific status transition.
 *
 * @param membership - The current user's membership
 * @param currentStatus - The current status of the journal
 * @param targetStatus - The target status to transition to
 * @returns Whether the user can perform the transition
 *
 * @example
 * ```tsx
 * function SubmitButton({ journal }: { journal: PastoralJournal }) {
 *   const { membership } = useTenantContext();
 *   const canSubmit = useCanUpdateStatus(membership, journal.status, 'submitted');
 *
 *   return (
 *     <Button disabled={!canSubmit}>
 *       Submit for Review
 *     </Button>
 *   );
 * }
 * ```
 */
export function useCanUpdateStatus(
  membership: Membership | null,
  currentStatus: PastoralJournalStatus,
  targetStatus: PastoralJournalStatus
): boolean {
  if (!membership) {
    return false;
  }

  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(targetStatus)) {
    return false;
  }

  const transitionKey = `${currentStatus}->${targetStatus}`;
  const allowedRoles = REQUIRED_ROLES[transitionKey];

  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(membership.role);
}
