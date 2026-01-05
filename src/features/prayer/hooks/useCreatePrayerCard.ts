/**
 * Hook for creating prayer cards.
 *
 * Provides a mutation function for creating prayer cards with tenant isolation
 * and recipient management.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PrayerCardRecipientScope } from '@/types/database';

export interface CreatePrayerCardOptions {
  content: string;
  recipientScope: PrayerCardRecipientScope;
  recipientIds?: string[];
}

export interface CreatePrayerCardState {
  createPrayerCard: (options: CreatePrayerCardOptions) => Promise<string | null>;
  creating: boolean;
  error: Error | null;
}

const MAX_CONTENT_LENGTH = 1000;

/**
 * Hook for creating prayer cards.
 *
 * @param tenantId - The tenant ID for the prayer card
 * @param authorMembershipId - The author's membership ID
 * @returns CreatePrayerCardState with createPrayerCard function, creating state, and error
 *
 * @example
 * ```tsx
 * function CreatePrayerForm() {
 *   const { activeTenantId, membershipId } = useTenantContext();
 *   const { createPrayerCard, creating, error } = useCreatePrayerCard(
 *     activeTenantId,
 *     membershipId
 *   );
 *
 *   const handleSubmit = async () => {
 *     const result = await createPrayerCard({
 *       content: 'Please pray for my surgery tomorrow.',
 *       recipientScope: 'small_group',
 *     });
 *
 *     if (result) {
 *       console.log('Created:', result);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <TextInput value={content} onChangeText={setContent} />
 *       <Button onPress={handleSubmit} disabled={creating}>
 *         Create Prayer Card
 *       </Button>
 *       {error && <Text>{error.message}</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useCreatePrayerCard(
  tenantId: string | null,
  authorMembershipId: string | null
): CreatePrayerCardState {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPrayerCard = useCallback(
    async (options: CreatePrayerCardOptions): Promise<string | null> => {
      const { content, recipientScope, recipientIds = [] } = options;

      if (!tenantId || !authorMembershipId) {
        setError(new Error('Missing required parameters'));
        return null;
      }

      // Validation
      if (!content.trim()) {
        setError(new Error('Prayer content cannot be empty'));
        return null;
      }

      if (content.length > MAX_CONTENT_LENGTH) {
        setError(new Error(`Prayer content cannot exceed ${MAX_CONTENT_LENGTH} characters`));
        return null;
      }

      // Validate recipient scope and IDs
      if (recipientScope === 'individual' && recipientIds.length === 0) {
        setError(new Error('At least one recipient must be selected for individual scope'));
        return null;
      }

      if (recipientScope === 'small_group' && recipientIds.length === 0) {
        setError(new Error('A small group must be selected for small group scope'));
        return null;
      }

      // For individual scope, validate recipients
      if (recipientScope === 'individual') {
        // Validate max recipients
        if (recipientIds.length > 50) {
          setError(new Error('Cannot send to more than 50 individuals at once'));
          return null;
        }

        // Validate author not in recipient list (optional, can pray for yourself)
        // This is allowed, so no validation needed
      }

      setCreating(true);
      setError(null);

      try {
        // Insert prayer card
        const { data, error: insertError } = await supabase
          .from('prayer_cards')
          .insert({
            tenant_id: tenantId,
            author_id: authorMembershipId,
            content: content.trim(),
            recipient_scope: recipientScope,
            answered: false,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        if (!data) {
          throw new Error('Failed to create prayer card');
        }

        const prayerCardId = data.id;

        // Insert recipients based on scope
        if (recipientScope === 'individual' && recipientIds.length > 0) {
          const individualRecipients = recipientIds.map((membershipId) => ({
            prayer_card_id: prayerCardId,
            recipient_membership_id: membershipId,
            recipient_small_group_id: null,
          }));

          const { error: recipientsError } = await supabase
            .from('prayer_card_recipients')
            .insert(individualRecipients);

          if (recipientsError) {
            throw recipientsError;
          }
        } else if (recipientScope === 'small_group' && recipientIds.length > 0) {
          // For small group, insert the small group ID
          const smallGroupRecipients = recipientIds.map((smallGroupId) => ({
            prayer_card_id: prayerCardId,
            recipient_membership_id: null,
            recipient_small_group_id: smallGroupId,
          }));

          const { error: recipientsError } = await supabase
            .from('prayer_card_recipients')
            .insert(smallGroupRecipients);

          if (recipientsError) {
            throw recipientsError;
          }
        }
        // For church_wide, no recipients needed - all tenant members can see

        return prayerCardId;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [tenantId, authorMembershipId]
  );

  return {
    createPrayerCard,
    creating,
    error,
  };
}
