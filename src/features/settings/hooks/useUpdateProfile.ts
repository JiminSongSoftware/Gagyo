/**
 * Hook for updating user profile information.
 *
 * Handles updating display name, locale, and notification preferences.
 * Locale changes are synced with the i18n system for immediate UI refresh.
 *
 * @module features/settings/hooks/useUpdateProfile
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { changeLocale } from '@/i18n';
import type { Locale } from '@/i18n/types';
import type { Json } from '@/lib/supabase';

/**
 * Shape of notification preferences.
 */
export interface NotificationPreferences {
  messages: boolean;
  prayers: boolean;
  journals: boolean;
  system: boolean;
}

/**
 * Parameters for updating user profile.
 */
export interface UpdateProfileParams {
  displayName?: string;
  locale?: Locale;
  notificationPreferences?: NotificationPreferences;
}

/**
 * Return type for useUpdateProfile hook.
 */
export interface UseUpdateProfileReturn {
  /** Whether the update is in progress */
  updating: boolean;
  /** Error from the last update attempt, if any */
  error: Error | null;
  /** Update the user profile */
  updateProfile: (params: UpdateProfileParams) => Promise<boolean>;
}

/**
 * Hook for updating user profile information.
 *
 * Updates the users table with new display name, locale, and/or notification
 * preferences. When locale is changed, it also triggers an immediate i18n
 * language change for UI refresh.
 *
 * @example
 * ```tsx
 * function ProfileSettings() {
 *   const { updating, error, updateProfile } = useUpdateProfile();
 *
 *   const handleSave = async () => {
 *     const success = await updateProfile({
 *       displayName: 'John Doe',
 *       locale: 'ko',
 *       notificationPreferences: {
 *         messages: true,
 *         prayers: false,
 *         journals: true,
 *         system: true,
 *       },
 *     });
 *
 *     if (success) {
 *       // Show success message
 *     }
 *   };
 *
 *   return <Button onPress={handleSave} disabled={updating} />;
 * }
 * ```
 */
export function useUpdateProfile(): UseUpdateProfileReturn {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateProfile = useCallback(
    async (params: UpdateProfileParams): Promise<boolean> => {
      setUpdating(true);
      setError(null);

      try {
        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Build update payload
        const updates: Record<string, string | Json> = {};

        if (params.displayName !== undefined) {
          updates.display_name = params.displayName;
        }

        if (params.locale !== undefined) {
          updates.locale = params.locale;
        }

        if (params.notificationPreferences !== undefined) {
          updates.notification_preferences = params.notificationPreferences;
        }

        // Only update if there are changes
        if (Object.keys(updates).length === 0) {
          return true;
        }

        // Update users table
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        // Sync locale change with i18n system for immediate UI refresh
        if (params.locale !== undefined) {
          await changeLocale(params.locale);
        }

        return true;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Failed to update profile');
        setError(errorObj);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    []
  );

  return {
    updating,
    error,
    updateProfile,
  };
}
