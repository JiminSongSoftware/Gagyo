/**
 * Hook for deleting user account.
 *
 * Calls the delete-user-account Edge Function which cascades deletion
 * across all user data including profile photos, memberships, messages,
 * notifications, and auth records.
 *
 * @module features/settings/hooks/useDeleteAccount
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Response from the delete account Edge Function.
 */
export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deleted_counts: {
    memberships: number;
    device_tokens: number;
    notifications: number;
    profile_photo_deleted: boolean;
  };
}

/**
 * Return type for useDeleteAccount hook.
 */
export interface UseDeleteAccountReturn {
  /** Whether the deletion is in progress */
  deleting: boolean;
  /** Error from the last deletion attempt, if any */
  error: Error | null;
  /** Result of the last successful deletion */
  result: DeleteAccountResponse | null;
  /** Delete the authenticated user's account */
  deleteAccount: () => Promise<DeleteAccountResponse | null>;
}

const EDGE_FUNCTION_NAME = 'delete-user-account';
const EDGE_FUNCTION_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL +
  `/functions/v1/${EDGE_FUNCTION_NAME}`;

/**
 * Hook for deleting the authenticated user's account.
 *
 * This is a destructive operation that cascades across all tenant-scoped
 * data. A confirmation dialog should be shown before calling this function.
 *
 * After successful deletion, the auth session should be cleared and the
 * user redirected to the login screen.
 *
 * @example
 * ```tsx
 * function AccountDeletionButton() {
 *   const { deleting, error, result, deleteAccount } = useDeleteAccount();
 *
 *   const handleDelete = async () => {
 *     // Show confirmation dialog first
 *     const confirmed = await showConfirmationDialog({
 *       title: 'Delete Account?',
 *       message: 'This action cannot be undone.',
 *     });
 *
 *     if (!confirmed) return;
 *
 *     const response = await deleteAccount();
 *
 *     if (response?.success) {
 *       // Clear auth session and redirect to login
 *       await supabase.auth.signOut();
 *       router.replace('/login');
 *     }
 *   };
 *
 *   return (
 *     <Button onPress={handleDelete} disabled={deleting}>
 *       Delete Account
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteAccount(): UseDeleteAccountReturn {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<DeleteAccountResponse | null>(null);

  const deleteAccount = useCallback(
    async (): Promise<DeleteAccountResponse | null> => {
      setDeleting(true);
      setError(null);
      setResult(null);

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

        const userId = user.id;
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token;

        if (!token) {
          throw new Error('No auth token available');
        }

        // Call Edge Function
        const response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id: userId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to delete account: ${response.status} ${errorText}`
          );
        }

        const data: DeleteAccountResponse = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to delete account');
        }

        setResult(data);
        return data;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Failed to delete account');
        setError(errorObj);
        return null;
      } finally {
        setDeleting(false);
      }
    },
    []
  );

  return {
    deleting,
    error,
    result,
    deleteAccount,
  };
}
