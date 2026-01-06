/**
 * Delete User Account Edge Function
 *
 * Permanently deletes a user account and all associated data.
 * This is a destructive operation that cascades across all tenant-scoped data.
 *
 * Environment Variables:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
 *
 * Security:
 * - Requires valid JWT authentication
 * - Users can only delete their own account
 * - Confirmation dialog must be shown before calling this function
 *
 * Cascade Order:
 * 1. Profile photo from storage
 * 2. Device tokens (push notifications)
 * 3. Notifications
 * 4. Memberships (cascades to: conversation_participants, prayer cards authored, etc.)
 * 5. Public user record
 * 6. Auth user record (via admin API)
 *
 * @see claude_docs/21_settings.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================================================
// TYPES
// ============================================================================

interface DeleteAccountRequest {
  user_id: string;
}

interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deleted_counts: {
    memberships: number;
    device_tokens: number;
    notifications: number;
    profile_photo_deleted: boolean;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STORAGE_BUCKET_NAME = 'profile-photos';

// ============================================================================
// SUPABASE CLIENTS
// ============================================================================

// Admin client for service operations
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify JWT and get authenticated user ID
 */
async function getAuthenticatedUser(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  const { data, error } = await adminSupabase.auth.getUser(token);

  if (error || !data.user) {
    console.error('Auth verification failed:', error?.message);
    return null;
  }

  return data.user.id;
}

/**
 * Delete user's profile photo from storage
 */
async function deleteProfilePhoto(userId: string): Promise<boolean> {
  try {
    // List all files in the user's profile photo folder
    const { data: files, error: listError } = await adminSupabase.storage
      .from(STORAGE_BUCKET_NAME)
      .list(`${userId}/`, {
        limit: 100,
      });

    if (listError) {
      // Bucket might not exist or user has no photos
      console.log('No profile photos to delete or bucket does not exist');
      return false;
    }

    // Delete each file
    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${userId}/${f.name}`);

      const { error: deleteError } = await adminSupabase.storage
        .from(STORAGE_BUCKET_NAME)
        .remove(filePaths);

      if (deleteError) {
        console.error('Failed to delete profile photos:', deleteError.message);
        return false;
      }

      console.log(`Deleted ${filePaths.length} profile photo(s) for user ${userId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    return false;
  }
}

/**
 * Delete user's device tokens
 */
async function deleteDeviceTokens(userId: string): Promise<number> {
  const { data, error } = await adminSupabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) {
    console.error('Failed to delete device tokens:', error.message);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Delete user's notifications
 */
async function deleteNotifications(userId: string): Promise<number> {
  const { data, error } = await adminSupabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) {
    console.error('Failed to delete notifications:', error.message);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Delete user's memberships (this cascades to many related tables)
 * Due to RLS policies, we need to delete each membership individually
 */
async function deleteMemberships(userId: string): Promise<number> {
  // First, get all memberships for this user
  const { data: memberships, error: fetchError } = await adminSupabase
    .from('memberships')
    .select('id, tenant_id')
    .eq('user_id', userId);

  if (fetchError) {
    console.error('Failed to fetch memberships:', fetchError.message);
    return 0;
  }

  if (!memberships || memberships.length === 0) {
    return 0;
  }

  let deletedCount = 0;

  // Delete each membership
  // The cascade will handle:
  // - conversation_participants
  // - prayer_cards (author_id SET NULL, but card recipients deleted)
  // - pastoral_journals (author_id SET NULL)
  // - pastoral_journal_comments
  // - ministry_memberships
  // - mentions (if they exist)
  for (const membership of memberships) {
    const { error: deleteError } = await adminSupabase
      .from('memberships')
      .delete()
      .eq('id', membership.id);

    if (deleteError) {
      console.error(`Failed to delete membership ${membership.id}:`, deleteError.message);
    } else {
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Delete the auth user record
 * This is done via the admin API and will cascade to public.users
 */
async function deleteAuthUser(userId: string): Promise<boolean> {
  try {
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Failed to delete auth user:', error.message);
      return false;
    }

    console.log(`Deleted auth user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error deleting auth user:', error);
    return false;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function deleteUserAccount(
  userId: string,
  authenticatedUserId: string
): Promise<DeleteAccountResponse> {
  // Security check: users can only delete their own account
  if (userId !== authenticatedUserId) {
    return {
      success: false,
      message: 'You can only delete your own account',
      deleted_counts: {
        memberships: 0,
        device_tokens: 0,
        notifications: 0,
        profile_photo_deleted: false,
      },
    };
  }

  try {
    // Step 1: Delete profile photo from storage
    const profilePhotoDeleted = await deleteProfilePhoto(userId);

    // Step 2: Delete device tokens
    const deviceTokensDeleted = await deleteDeviceTokens(userId);

    // Step 3: Delete notifications
    const notificationsDeleted = await deleteNotifications(userId);

    // Step 4: Delete memberships (cascades to many related tables)
    const membershipsDeleted = await deleteMemberships(userId);

    // Step 5: Delete auth user (cascades to public.users via FK)
    const authUserDeleted = await deleteAuthUser(userId);

    if (!authUserDeleted) {
      return {
        success: false,
        message: 'Failed to delete auth user record',
        deleted_counts: {
          memberships: membershipsDeleted,
          device_tokens: deviceTokensDeleted,
          notifications: notificationsDeleted,
          profile_photo_deleted: profilePhotoDeleted,
        },
      };
    }

    return {
      success: true,
      message: 'Account deleted successfully',
      deleted_counts: {
        memberships: membershipsDeleted,
        device_tokens: deviceTokensDeleted,
        notifications: notificationsDeleted,
        profile_photo_deleted: profilePhotoDeleted,
      },
    };
  } catch (error) {
    console.error('Error in deleteUserAccount:', error);

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      deleted_counts: {
        memberships: 0,
        device_tokens: 0,
        notifications: 0,
        profile_photo_deleted: false,
      },
    };
  }
}

// ============================================================================
// SERVE HANDLER
// ============================================================================

serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const authenticatedUserId = await getAuthenticatedUser(authHeader);

    if (!authenticatedUserId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { user_id } = body as DeleteAccountRequest;

    if (!user_id) {
      return new Response('Missing required field: user_id', { status: 400 });
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return new Response('Invalid user_id format', { status: 400 });
    }

    // Delete the account
    const result = await deleteUserAccount(user_id, authenticatedUserId);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in delete-user-account:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// TYPE EXPORTS FOR TESTING
// ============================================================================

export type { DeleteAccountRequest, DeleteAccountResponse };
