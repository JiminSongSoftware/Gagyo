/**
 * Hook for marking prayer cards as answered.
 *
 * Provides a mutation function for marking prayers as answered
 * and triggering push notifications to recipients.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface MarkPrayerAnsweredState {
  markAnswered: (prayerCardId: string) => Promise<boolean>;
  marking: boolean;
  error: Error | null;
}

/**
 * Hook for marking prayer cards as answered.
 *
 * @param tenantId - The tenant ID for the prayer card
 * @returns MarkPrayerAnsweredState with markAnswered function, marking state, and error
 *
 * @example
 * ```tsx
 * function PrayerDetail({ prayer }: { prayer: PrayerCardWithAuthor }) {
 *   const { membershipId } = useTenantContext();
 *   const { markAnswered, marking } = useMarkPrayerAnswered(prayer.tenant_id);
 *
 *   const isAuthor = membershipId === prayer.author_id;
 *
 *   const handleMarkAnswered = async () => {
 *     await markAnswered(prayer.id);
 *   };
 *
 *   return (
 *     <View>
 *       <Text>{prayer.content}</Text>
 *       {isAuthor && !prayer.answered && (
 *         <Button onPress={handleMarkAnswered} disabled={marking}>
 *           Mark as Answered
 *         </Button>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useMarkPrayerAnswered(tenantId: string | null): MarkPrayerAnsweredState {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const markAnswered = useCallback(
    async (prayerCardId: string): Promise<boolean> => {
      if (!tenantId) {
        setError(new Error('Missing tenant ID'));
        return false;
      }

      if (!prayerCardId) {
        setError(new Error('Missing prayer card ID'));
        return false;
      }

      setMarking(true);
      setError(null);

      try {
        const now = new Date().toISOString();

        // Update prayer card as answered
        const { error: updateError } = await supabase
          .from('prayer_cards')
          .update({
            answered: true,
            answered_at: now,
            updated_at: now,
          })
          .eq('id', prayerCardId)
          .eq('tenant_id', tenantId);

        if (updateError) {
          throw updateError;
        }

        // Call Edge Function to trigger push notifications
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const { error: functionError } = await supabase.functions.invoke(
            'handle-prayer-answered',
            {
              body: {
                prayerCardId,
                tenantId,
              },
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
              },
            }
          );

          if (functionError) {
            // Log error but don't fail the mark as answered operation
            console.error('Failed to trigger prayer answered notifications:', functionError);
          }
        } catch (functionErr) {
          // Log error but don't fail the mark as answered operation
          console.error('Failed to invoke prayer answered function:', functionErr);
        }

        return true;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setMarking(false);
      }
    },
    [tenantId]
  );

  return {
    markAnswered,
    marking,
    error,
  };
}
