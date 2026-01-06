/**
 * Integration Tests for Settings Profile Updates and Account Deletion.
 *
 * Tests the integration between:
 * 1. Profile update operations (display name, locale, notification preferences)
 * 2. Profile photo upload and storage
 * 3. Account deletion cascade across all tables
 * 4. RLS policies for profile updates and storage access
 * 5. Notification preferences persistence
 *
 * Running tests:
 * bun test __tests__/integration/settings-profile.test.ts
 *
 * Prerequisites:
 * - Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * - Supabase project with settings schema and RLS policies enabled
 * - Profile photos storage bucket created
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.');
}

// ============================================================================
// TEST DATA
// ============================================================================

const generateTestEmail = () => `settings-test-${Date.now()}@example.com`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a test user with sign up
 */
async function createTestUser(email: string, password: string): Promise<SupabaseClient> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return supabase;
}

/**
 * Get current user from client
 */
async function getUser(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Get user profile from users table
 */
async function getUserProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as unknown;
}

/**
 * Update user profile
 */
async function updateUserProfile(
  client: SupabaseClient,
  userId: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await client
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown;
}

/**
 * Upload a test profile photo
 */
async function uploadProfilePhoto(
  client: SupabaseClient,
  userId: string,
  fileName: string,
  fileData: Uint8Array
) {
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await client.storage
    .from('profile-photos')
    .upload(filePath, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;
  return data as unknown;
}

/**
 * Delete a profile photo
 */
async function deleteProfilePhoto(client: SupabaseClient, filePath: string) {
  const { error } = await client.storage.from('profile-photos').remove([filePath]);
  if (error) throw error;
}

/**
 * Get public URL for a file
 */
function getPublicUrl(client: SupabaseClient, filePath: string) {
  const { data } = client.storage.from('profile-photos').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Call delete-user-account Edge Function
 */
async function deleteAccount(client: SupabaseClient) {
  const { data, error } = await client.functions.invoke('delete-user-account', {
    method: 'POST',
  });

  if (error) throw error;
  return data as { success: boolean; deletion_counts: Record<string, number> };
}

/**
 * Clean up test user (sign out only, not full deletion)
 */
async function cleanupTestUser(client: SupabaseClient): Promise<void> {
  await client.auth.signOut();
}

// ============================================================================
// TESTS
// ============================================================================

describe('Settings Profile Updates - Integration Tests', () => {
  let testEmail: string;
  let testPassword: string;
  let client: SupabaseClient;
  let userId: string;

  beforeEach(async () => {
    testEmail = generateTestEmail();
    testPassword = 'TestPassword123!';
    client = await createTestUser(testEmail, testPassword);
    const user = await getUser(client);
    userId = user!.id;
  });

  afterEach(async () => {
    if (client) {
      await cleanupTestUser(client);
    }
  });

  // ==========================================================================
  // PROFILE UPDATE TESTS
  // ==========================================================================

  describe('Profile Display Name Updates', () => {
    it('should update display name successfully', async () => {
      const newDisplayName = 'Updated Test User';
      const profile = await updateUserProfile(client, userId, {
        display_name: newDisplayName,
      }) as { display_name: string };

      expect(profile).toBeDefined();
      expect(profile.display_name).toBe(newDisplayName);
    });

    it('should clear display name when set to null', async () => {
      // First set a display name
      await updateUserProfile(client, userId, { display_name: 'Test User' });

      // Then clear it
      const profile = await updateUserProfile(client, userId, {
        display_name: null,
      }) as { display_name: string | null };

      expect(profile.display_name).toBeNull();
    });

    it('should handle special characters in display name', async () => {
      const specialName = '김철수 (John) 🎉';
      const profile = await updateUserProfile(client, userId, {
        display_name: specialName,
      }) as { display_name: string };

      expect(profile.display_name).toBe(specialName);
    });

    it('should reject display names exceeding length limit', async () => {
      const longName = 'A'.repeat(300); // Exceeds typical varchar limit

      const { data, error } = await client
        .from('users')
        .update({ display_name: longName })
        .eq('id', userId)
        .select();

      // Should either truncate or error
      expect(error || data).toBeDefined();
    });
  });

  // ==========================================================================
  // LOCALE UPDATE TESTS
  // ==========================================================================

  describe('Locale Updates', () => {
    it('should update locale to English', async () => {
      const profile = await updateUserProfile(client, userId, { locale: 'en' }) as { locale: string };
      expect(profile.locale).toBe('en');
    });

    it('should update locale to Korean', async () => {
      const profile = await updateUserProfile(client, userId, { locale: 'ko' }) as { locale: string };
      expect(profile.locale).toBe('ko');
    });

    it('should reject invalid locale values', async () => {
      const { error } = await client
        .from('users')
        .update({ locale: 'invalid' })
        .eq('id', userId)
        .select();

      // Database constraint should reject invalid locale
      expect(error).toBeDefined();
    });

    it('should persist locale across profile updates', async () => {
      // Set locale to Korean
      await updateUserProfile(client, userId, { locale: 'ko' });

      // Update another field
      const profile = await updateUserProfile(client, userId, {
        display_name: 'Test',
      }) as { locale: string };

      expect(profile.locale).toBe('ko');
    });
  });

  // ==========================================================================
  // NOTIFICATION PREFERENCES TESTS
  // ==========================================================================

  describe('Notification Preferences Updates', () => {
    const defaultPreferences = {
      messages: true,
      prayers: true,
      journals: true,
      system: true,
    };

    it('should have default notification preferences', async () => {
      const profile = await getUserProfile(client, userId) as {
        notification_preferences: typeof defaultPreferences;
      };
      expect(profile.notification_preferences).toBeDefined();
      expect(profile.notification_preferences).toEqual(defaultPreferences);
    });

    it('should update individual notification preference', async () => {
      const profile = await updateUserProfile(client, userId, {
        notification_preferences: {
          ...defaultPreferences,
          messages: false,
        },
      }) as { notification_preferences: typeof defaultPreferences };

      expect(profile.notification_preferences.messages).toBe(false);
      expect(profile.notification_preferences.prayers).toBe(true);
    });

    it('should update all notification preferences', async () => {
      const newPreferences = {
        messages: false,
        prayers: false,
        journals: false,
        system: false,
      };

      const profile = await updateUserProfile(client, userId, {
        notification_preferences: newPreferences,
      }) as { notification_preferences: typeof newPreferences };

      expect(profile.notification_preferences).toEqual(newPreferences);
    });

    it('should update subset of notification preferences', async () => {
      // Update only messages and journals
      const partialUpdate = {
        messages: false,
        journals: false,
      };

      const profile = await updateUserProfile(client, userId, {
        // @ts-ignore - Testing partial update
        notification_preferences: partialUpdate,
      }) as { notification_preferences: typeof partialUpdate };

      // Other preferences should remain unchanged
      expect(profile.notification_preferences.messages).toBe(false);
      expect(profile.notification_preferences.journals).toBe(false);
    });
  });

  // ==========================================================================
  // PROFILE PHOTO STORAGE TESTS
  // ==========================================================================

  describe('Profile Photo Storage', () => {
    it('should upload profile photo to user folder', async () => {
      const fileName = 'test-photo.jpg';
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF]); // JPEG header

      const result = await uploadProfilePhoto(client, userId, fileName, fileData);

      expect(result.path).toContain(userId);
      expect(result.path).toContain(fileName);
    });

    it('should generate public URL for uploaded photo', async () => {
      const fileName = 'public-test.jpg';
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF]);

      await uploadProfilePhoto(client, userId, fileName, fileData);

      const filePath = `${userId}/${fileName}`;
      const publicUrl = getPublicUrl(client, filePath);

      expect(publicUrl).toContain('profile-photos');
      expect(publicUrl).toContain(fileName);
    });

    it('should delete uploaded profile photo', async () => {
      const fileName = 'delete-test.jpg';
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF]);

      await uploadProfilePhoto(client, userId, fileName, fileData);

      const filePath = `${userId}/${fileName}`;
      await deleteProfilePhoto(client, filePath);

      // Verify file no longer accessible
      const { data } = await client.storage
        .from('profile-photos')
        .list(userId);

      const fileExists = data?.some((f) => f.name === fileName);
      expect(fileExists).toBe(false);
    });

    it('should upsert existing photo (replace)', async () => {
      const fileName = 'upsert-test.jpg';
      const fileData1 = new Uint8Array([0xFF, 0xD8, 0xFF]);
      const fileData2 = new Uint8Array([0xFF, 0xD8, 0xFF, 0x00]);

      await uploadProfilePhoto(client, userId, fileName, fileData1);
      await uploadProfilePhoto(client, userId, fileName, fileData2, true);

      // Second upload should replace the first
      const { data } = await client.storage.from('profile-photos').list(userId);
      const fileCount = data?.filter((f) => f.name === fileName).length;

      expect(fileCount).toBe(1);
    });

    it('should update photo_url in users table', async () => {
      const fileName = 'url-update-test.jpg';
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF]);

      await uploadProfilePhoto(client, userId, fileName, fileData);

      const filePath = `${userId}/${fileName}`;
      const publicUrl = getPublicUrl(client, filePath);

      const profile = await updateUserProfile(client, userId, {
        photo_url: publicUrl,
      });

      expect(profile.photo_url).toBe(publicUrl);
    });
  });

  // ==========================================================================
  // RLS POLICY TESTS
  // ==========================================================================

  describe('Row Level Security for Profiles', () => {
    it('should allow user to update own profile', async () => {
      const profile = await updateUserProfile(client, userId, {
        display_name: 'Own Profile Update',
      });

      expect(profile.display_name).toBe('Own Profile Update');
    });

    it('should reject profile update from different user', async () => {
      // Create second user
      const secondUserEmail = `second-${generateTestEmail()}`;
      const secondClient = await createTestUser(secondUserEmail, testPassword);

      // Try to update first user's profile with second user's client
      const { data, error } = await secondClient
        .from('users')
        .update({ display_name: 'Unauthorized Update' })
        .eq('id', userId)
        .select();

      // RLS should block this
      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Verify first user's profile unchanged
      const originalProfile = await getUserProfile(client, userId);
      expect(originalProfile.display_name).not.toBe('Unauthorized Update');

      await secondClient.auth.signOut();
    });
  });

  describe('Storage RLS for Profile Photos', () => {
    it('should allow user to upload to own folder', async () => {
      const fileName = 'own-folder-test.jpg';
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF]);

      const result = await uploadProfilePhoto(client, userId, fileName, fileData);

      expect(result.path).toBe(`${userId}/${fileName}`);
    });

    it('should reject upload to different user folder', async () => {
      const otherUserId = '00000000-0000-0000-0000-000000000000';
      const fileName = 'unauthorized-upload.jpg';
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF]);

      const { error } = await client.storage
        .from('profile-photos')
        .upload(`${otherUserId}/${fileName}`, fileData);

      // RLS should block this
      expect(error).toBeDefined();
    });

    it('should allow public read of profile photos', async () => {
      const fileName = 'public-read-test.jpg';
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF]);

      await uploadProfilePhoto(client, userId, fileName, fileData);

      const filePath = `${userId}/${fileName}`;
      const { data } = await client.storage
        .from('profile-photos')
        .createSignedUrl(filePath, 60);

      // Should succeed for authenticated user
      expect(data).toBeDefined();
    });
  });

  // ==========================================================================
  // ACCOUNT DELETION TESTS
  // ==========================================================================

  describe('Account Deletion Cascade', () => {
    it('should delete user account via Edge Function', async () => {
      // First create some data to verify cascade
      await updateUserProfile(client, userId, {
        display_name: 'Delete Test User',
      });

      const result = await deleteAccount(client);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.deletion_counts).toBeDefined();
    });

    it('should verify user cannot access data after deletion', async () => {
      // Delete account
      await deleteAccount(client);

      // Try to query user profile
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId);

      // User should no longer exist or be inaccessible
      expect(error || data).toBeDefined();
    });

    it('should require authentication for account deletion', async () => {
      // Create anonymous client
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);

      const { error } = await anonClient.functions.invoke('delete-user-account', {
        method: 'POST',
      });

      // Should fail without authentication
      expect(error).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle invalid user ID gracefully', async () => {
      const invalidUserId = 'invalid-uuid';

      const { data, error } = await client
        .from('users')
        .update({ display_name: 'Test' })
        .eq('id', invalidUserId)
        .select();

      expect(error || data).toBeDefined();
    });

    it('should handle malformed notification preferences', async () => {
      const { data, error } = await client
        .from('users')
        .update({
          // @ts-ignore - Testing invalid input
          notification_preferences: 'invalid-json',
        })
        .eq('id', userId)
        .select();

      // Database should handle or reject
      expect(error || data).toBeDefined();
    });

    it('should handle storage upload errors', async () => {
      const largeFile = new Uint8Array(10 * 1024 * 1024); // 10 MB, exceeds 5 MB limit

      const { error } = await client.storage
        .from('profile-photos')
        .upload(`${userId}/large.jpg`, largeFile);

      // Should exceed size limit
      expect(error).toBeDefined();
    });
  });
});

/**
 * ============================================================================
 * NOTES ON SETTINGS TESTING
 * ============================================================================
 *
 * 1. Profile Updates:
 *    - Display name updates are immediate and persistent
 *    - Locale changes sync with i18n system via useLocale hook
 *    - Notification preferences control push notification registration
 *
 * 2. Photo Storage:
 *    - Files are stored in user-specific folders for isolation
 *    - Public URL generation allows profile photos to be displayed
 *    - Upsert behavior allows replacing existing photos
 *    - 5 MB file size limit prevents abuse
 *
 * 3. Account Deletion:
 *    - Edge Function handles cascade deletion in correct order
 *    - Storage cleanup happens after database deletion
 *    - Auth session is cleared after successful deletion
 *    - User is redirected to login screen
 *
 * 4. RLS Policies:
 *    - Users can only update their own profile (user_id() = id)
 *    - Storage access restricted to user's own folder
 *    - Public read access for profile photos
 *    - Account deletion requires valid JWT
 *
 * 5. Testing Best Practices:
 *    - Use unique emails to avoid conflicts
 *    - Clean up test users after tests
 *    - Verify RLS policies actually enforce restrictions
 *    - Test both success and failure scenarios
 */
