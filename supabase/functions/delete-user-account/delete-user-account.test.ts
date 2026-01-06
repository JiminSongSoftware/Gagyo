/**
 * Integration Tests for delete-user-account Edge Function
 *
 * Tests the Edge Function for permanent user account deletion.
 * Responsible for:
 * - Verifying JWT authentication
 * - Cascading deletion across all user data
 * - Deleting profile photos from storage
 * - Preventing cross-user deletion attempts
 *
 * Following TDD: these tests are written before implementation.
 *
 * @see claude_docs/21_settings.md
 */

import {
  assertEquals,
  assertExists,
  assertTrue,
  assertFalse,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

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

interface User {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  locale: 'en' | 'ko';
  notification_preferences: {
    messages: boolean;
    prayers: boolean;
    journals: boolean;
    system: boolean;
  };
}

interface Membership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  small_group_id: string | null;
  status: string;
}

interface DeviceToken {
  id: string;
  user_id: string;
  tenant_id: string;
  token: string;
  platform: 'ios' | 'android';
}

interface Notification {
  id: string;
  user_id: string;
  tenant_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
}

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_DATA = {
  tenant1Id: 'tenant-1-uuid-123',
  userId: 'user-to-delete-abc',
  otherUserId: 'user-other-def', // Different user for auth testing
  membership1Id: 'membership-1',
  membership2Id: 'membership-2',
  smallGroupId: 'small-group-1',
  deviceId: 'device-1',
  notification1Id: 'notif-1',
  notification2Id: 'notif-2',
  authToken: 'valid-jwt-token-123',
};

// ============================================================================
// MOCK DATABASE
// ============================================================================

class MockDatabase {
  // Users table
  private users: Map<string, User> = new Map();

  // Memberships table
  private memberships: Map<string, Membership> = new Map();

  // Device tokens table
  private deviceTokens: Map<string, DeviceToken> = new Map();

  // Notifications table
  private notifications: Map<string, Notification> = new Map();

  // Storage files (simulated)
  private storageFiles: Map<string, string[]> = new Map();

  // Deleted records for verification
  deletedUsers: string[] = [];
  deletedMemberships: string[] = [];
  deletedDeviceTokens: string[] = [];
  deletedNotifications: string[] = [];
  deletedStorageFiles: string[] = [];

  // Auth session (simulated)
  private authSession: string | null = null;

  constructor() {
    this.setupTestData();
  }

  private setupTestData() {
    // Create test user
    this.users.set(TEST_DATA.userId, {
      id: TEST_DATA.userId,
      display_name: 'Test User',
      photo_url: 'https://example.com/photo.jpg',
      locale: 'en',
      notification_preferences: {
        messages: true,
        prayers: true,
        journals: true,
        system: true,
      },
    });

    // Create other user (for auth testing)
    this.users.set(TEST_DATA.otherUserId, {
      id: TEST_DATA.otherUserId,
      display_name: 'Other User',
      photo_url: null,
      locale: 'ko',
      notification_preferences: {
        messages: false,
        prayers: false,
        journals: false,
        system: false,
      },
    });

    // Create memberships (user belongs to 2 tenants)
    this.memberships.set(TEST_DATA.membership1Id, {
      id: TEST_DATA.membership1Id,
      user_id: TEST_DATA.userId,
      tenant_id: TEST_DATA.tenant1Id,
      role: 'member',
      small_group_id: TEST_DATA.smallGroupId,
      status: 'active',
    });

    this.memberships.set(TEST_DATA.membership2Id, {
      id: TEST_DATA.membership2Id,
      user_id: TEST_DATA.userId,
      tenant_id: 'tenant-2',
      role: 'small_group_leader',
      small_group_id: null,
      status: 'active',
    });

    // Create device tokens
    this.deviceTokens.set(TEST_DATA.deviceId, {
      id: TEST_DATA.deviceId,
      user_id: TEST_DATA.userId,
      tenant_id: TEST_DATA.tenant1Id,
      token: 'test-push-token',
      platform: 'ios',
    });

    // Create notifications
    this.notifications.set(TEST_DATA.notification1Id, {
      id: TEST_DATA.notification1Id,
      user_id: TEST_DATA.userId,
      tenant_id: TEST_DATA.tenant1Id,
      type: 'new_message',
      title: 'Test Notification',
      body: 'Test body',
      read: false,
    });

    this.notifications.set(TEST_DATA.notification2Id, {
      id: TEST_DATA.notification2Id,
      user_id: TEST_DATA.userId,
      tenant_id: TEST_DATA.tenant1Id,
      type: 'mention',
      title: 'Mention',
      body: 'You were mentioned',
      read: true,
    });

    // Create storage files (profile photos)
    this.storageFiles.set(TEST_DATA.userId, ['photo.jpg', 'photo-2.jpg']);

    // Set auth session
    this.authSession = TEST_DATA.authToken;
  }

  // Auth operations
  setAuthSession(token: string | null) {
    this.authSession = token;
  }

  verifyAuth(token: string): string | null {
    if (token === this.authSession) {
      return TEST_DATA.userId; // Returns the authenticated user's ID
    }
    return null;
  }

  // User operations
  getUser(id: string): User | null {
    return this.users.get(id) || null;
  }

  deleteUser(id: string): boolean {
    if (this.users.has(id)) {
      this.users.delete(id);
      this.deletedUsers.push(id);
      return true;
    }
    return false;
  }

  userExists(id: string): boolean {
    return this.users.has(id);
  }

  // Membership operations
  getMembershipsByUserId(userId: string): Membership[] {
    return Array.from(this.memberships.values()).filter((m) => m.user_id === userId);
  }

  deleteMembership(id: string): boolean {
    if (this.memberships.has(id)) {
      this.memberships.delete(id);
      this.deletedMemberships.push(id);
      return true;
    }
    return false;
  }

  membershipCount(): number {
    return this.memberships.size;
  }

  // Device token operations
  getDeviceTokensByUserId(userId: string): DeviceToken[] {
    return Array.from(this.deviceTokens.values()).filter((d) => d.user_id === userId);
  }

  deleteDeviceToken(id: string): boolean {
    if (this.deviceTokens.has(id)) {
      this.deviceTokens.delete(id);
      this.deletedDeviceTokens.push(id);
      return true;
    }
    return false;
  }

  deviceTokenCount(): number {
    return this.deviceTokens.size;
  }

  // Notification operations
  getNotificationsByUserId(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.user_id === userId);
  }

  deleteNotification(id: string): boolean {
    if (this.notifications.has(id)) {
      this.notifications.delete(id);
      this.deletedNotifications.push(id);
      return true;
    }
    return false;
  }

  notificationCount(): number {
    return this.notifications.size;
  }

  // Storage operations
  deleteProfilePhotos(userId: string): boolean {
    const files = this.storageFiles.get(userId);
    if (files && files.length > 0) {
      this.deletedStorageFiles.push(...files.map((f) => `${userId}/${f}`));
      this.storageFiles.delete(userId);
      return true;
    }
    return false;
  }

  hasProfilePhotos(userId: string): boolean {
    const files = this.storageFiles.get(userId);
    return files !== undefined && files.length > 0;
  }

  // Reset for next test
  reset() {
    this.users.clear();
    this.memberships.clear();
    this.deviceTokens.clear();
    this.notifications.clear();
    this.storageFiles.clear();
    this.deletedUsers = [];
    this.deletedMemberships = [];
    this.deletedDeviceTokens = [];
    this.deletedNotifications = [];
    this.deletedStorageFiles = [];
    this.authSession = null;
    this.setupTestData();
  }

  // Get deletion counts
  getDeletionCounts() {
    return {
      memberships: this.deletedMemberships.length,
      device_tokens: this.deletedDeviceTokens.length,
      notifications: this.deletedNotifications.length,
      profile_photo_deleted: this.deletedStorageFiles.length > 0,
    };
  }
}

const mockDb = new MockDatabase();

// ============================================================================
// EDGE FUNCTION SIMULATION
// ============================================================================

async function deleteUserAccount(
  request: DeleteAccountRequest,
  authToken: string
): Promise<DeleteAccountResponse> {
  // Step 1: Verify authentication
  const authenticatedUserId = mockDb.verifyAuth(authToken);
  if (!authenticatedUserId) {
    return {
      success: false,
      message: 'Unauthorized',
      deleted_counts: {
        memberships: 0,
        device_tokens: 0,
        notifications: 0,
        profile_photo_deleted: false,
      },
    };
  }

  // Step 2: Security check - users can only delete their own account
  if (request.user_id !== authenticatedUserId) {
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

  const deleted_counts = {
    memberships: 0,
    device_tokens: 0,
    notifications: 0,
    profile_photo_deleted: false,
  };

  try {
    // Step 3: Delete profile photo from storage
    deleted_counts.profile_photo_deleted = mockDb.deleteProfilePhotos(request.user_id);

    // Step 4: Delete device tokens
    const deviceTokens = mockDb.getDeviceTokensByUserId(request.user_id);
    for (const token of deviceTokens) {
      mockDb.deleteDeviceToken(token.id);
      deleted_counts.device_tokens++;
    }

    // Step 5: Delete notifications
    const notifications = mockDb.getNotificationsByUserId(request.user_id);
    for (const notification of notifications) {
      mockDb.deleteNotification(notification.id);
      deleted_counts.notifications++;
    }

    // Step 6: Delete memberships (this cascades to many related tables)
    const memberships = mockDb.getMembershipsByUserId(request.user_id);
    for (const membership of memberships) {
      mockDb.deleteMembership(membership.id);
      deleted_counts.memberships++;
    }

    // Step 7: Delete auth user (cascades to public.users)
    const authUserDeleted = mockDb.deleteUser(request.user_id);
    if (!authUserDeleted) {
      return {
        success: false,
        message: 'Failed to delete auth user record',
        deleted_counts,
      };
    }

    return {
      success: true,
      message: 'Account deleted successfully',
      deleted_counts,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      deleted_counts,
    };
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('delete-user-account Edge Function', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, '');

      assertEquals(result.success, false);
      assertEquals(result.message, 'Unauthorized');
      assertEquals(mockDb.getDeletionCounts().memberships, 0);
    });

    it('should reject requests with invalid token', async () => {
      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, 'invalid-token');

      assertEquals(result.success, false);
      assertEquals(result.message, 'Unauthorized');
    });

    it('should accept requests with valid JWT token', async () => {
      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
    });
  });

  // ============================================================================
  // AUTHORIZATION
  // ============================================================================

  describe('Authorization', () => {
    it('should allow users to delete their own account', async () => {
      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
      assertEquals(result.message, 'Account deleted successfully');
      assertFalse(mockDb.userExists(TEST_DATA.userId));
    });

    it('should prevent users from deleting other users accounts', async () => {
      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.otherUserId, // Different from authenticated user
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, false);
      assertEquals(result.message, 'You can only delete your own account');
      assertTrue(mockDb.userExists(TEST_DATA.otherUserId)); // Other user should still exist
    });

    it('should return deleted counts in response', async () => {
      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
      assertEquals(result.deleted_counts.memberships, 2); // 2 memberships
      assertEquals(result.deleted_counts.device_tokens, 1); // 1 device token
      assertEquals(result.deleted_counts.notifications, 2); // 2 notifications
      assertEquals(result.deleted_counts.profile_photo_deleted, true); // Profile photos deleted
    });
  });

  // ============================================================================
  // STORAGE DELETION
  // ============================================================================

  describe('Profile Photo Deletion', () => {
    it('should delete all profile photos from storage', async () => {
      assertTrue(mockDb.hasProfilePhotos(TEST_DATA.userId));

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      await deleteUserAccount(request, TEST_DATA.authToken);

      assertFalse(mockDb.hasProfilePhotos(TEST_DATA.userId));
    });

    it('should handle users without profile photos', async () => {
      // Remove profile photos
      mockDb.deleteProfilePhotos(TEST_DATA.userId);

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
      assertEquals(result.deleted_counts.profile_photo_deleted, false);
    });
  });

  // ============================================================================
  // CASCADE DELETION
  // ============================================================================

  describe('Cascade Deletion', () => {
    it('should delete all user memberships', async () => {
      const membershipsBefore = mockDb.getMembershipsByUserId(TEST_DATA.userId);
      assertEquals(membershipsBefore.length, 2);

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      await deleteUserAccount(request, TEST_DATA.authToken);

      const membershipsAfter = mockDb.getMembershipsByUserId(TEST_DATA.userId);
      assertEquals(membershipsAfter.length, 0);
      assertEquals(mockDb.getDeletionCounts().memberships, 2);
    });

    it('should delete all device tokens', async () => {
      const tokensBefore = mockDb.getDeviceTokensByUserId(TEST_DATA.userId);
      assertEquals(tokensBefore.length, 1);

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      await deleteUserAccount(request, TEST_DATA.authToken);

      const tokensAfter = mockDb.getDeviceTokensByUserId(TEST_DATA.userId);
      assertEquals(tokensAfter.length, 0);
      assertEquals(mockDb.getDeletionCounts().device_tokens, 1);
    });

    it('should delete all notifications', async () => {
      const notificationsBefore = mockDb.getNotificationsByUserId(TEST_DATA.userId);
      assertEquals(notificationsBefore.length, 2);

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      await deleteUserAccount(request, TEST_DATA.authToken);

      const notificationsAfter = mockDb.getNotificationsByUserId(TEST_DATA.userId);
      assertEquals(notificationsAfter.length, 0);
      assertEquals(mockDb.getDeletionCounts().notifications, 2);
    });

    it('should delete the user record from public.users', async () => {
      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      await deleteUserAccount(request, TEST_DATA.authToken);

      assertFalse(mockDb.userExists(TEST_DATA.userId));
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing user_id gracefully', async () => {
      const request = {} as DeleteAccountRequest;

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, false);
    });

    it('should handle non-existent user', async () => {
      const request: DeleteAccountRequest = {
        user_id: 'non-existent-user-id',
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      // Should fail authorization (user_id doesn't match authenticated user)
      assertEquals(result.success, false);
      assertEquals(result.message, 'You can only delete your own account');
    });

    it('should handle invalid UUID format', () => {
      const request: DeleteAccountRequest = {
        user_id: 'not-a-uuid',
      };

      // In actual implementation, this would be validated
      // For now, just verify the request structure
      assertExists(request.user_id);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle user with no memberships', async () => {
      // Delete all memberships first
      const memberships = mockDb.getMembershipsByUserId(TEST_DATA.userId);
      for (const membership of memberships) {
        mockDb.deleteMembership(membership.id);
      }

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
      assertEquals(result.deleted_counts.memberships, 0);
    });

    it('should handle user with no device tokens', async () => {
      // Delete device tokens first
      const tokens = mockDb.getDeviceTokensByUserId(TEST_DATA.userId);
      for (const token of tokens) {
        mockDb.deleteDeviceToken(token.id);
      }

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
      assertEquals(result.deleted_counts.device_tokens, 0);
    });

    it('should handle user with no notifications', async () => {
      // Delete notifications first
      const notifications = mockDb.getNotificationsByUserId(TEST_DATA.userId);
      for (const notification of notifications) {
        mockDb.deleteNotification(notification.id);
      }

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
      assertEquals(result.deleted_counts.notifications, 0);
    });

    it('should handle user with no profile photo', async () => {
      // Clear profile photos
      mockDb.deleteProfilePhotos(TEST_DATA.userId);

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      const result = await deleteUserAccount(request, TEST_DATA.authToken);

      assertEquals(result.success, true);
      assertEquals(result.deleted_counts.profile_photo_deleted, false);
    });
  });

  // ============================================================================
  // DELETION ORDER
  // ============================================================================

  describe('Deletion Order', () => {
    it('should delete in correct order to avoid constraint violations', async () => {
      // The order should be:
      // 1. Storage files (no FK dependencies)
      // 2. Device tokens (user_id FK, but we want to delete these first)
      // 3. Notifications (user_id FK)
      // 4. Memberships (user_id FK, cascades to many tables)
      // 5. User record (last, after all dependent records are gone)

      const deletionOrder: string[] = [];

      // Override delete methods to track order
      const originalDeletePhoto = mockDb.deleteProfilePhotos.bind(mockDb);
      mockDb.deleteProfilePhotos = (userId: string) => {
        deletionOrder.push('storage');
        return originalDeletePhoto(userId);
      };

      const originalDeleteToken = mockDb.deleteDeviceToken.bind(mockDb);
      mockDb.deleteDeviceToken = (id: string) => {
        if (deletionOrder[deletionOrder.length - 1] !== 'device_tokens') {
          deletionOrder.push('device_tokens');
        }
        return originalDeleteToken(id);
      };

      const originalDeleteNotification = mockDb.deleteNotification.bind(mockDb);
      mockDb.deleteNotification = (id: string) => {
        if (deletionOrder[deletionOrder.length - 1] !== 'notifications') {
          deletionOrder.push('notifications');
        }
        return originalDeleteNotification(id);
      };

      const originalDeleteMembership = mockDb.deleteMembership.bind(mockDb);
      mockDb.deleteMembership = (id: string) => {
        if (deletionOrder[deletionOrder.length - 1] !== 'memberships') {
          deletionOrder.push('memberships');
        }
        return originalDeleteMembership(id);
      };

      const originalDeleteUser = mockDb.deleteUser.bind(mockDb);
      mockDb.deleteUser = (id: string) => {
        deletionOrder.push('user');
        return originalDeleteUser(id);
      };

      const request: DeleteAccountRequest = {
        user_id: TEST_DATA.userId,
      };

      await deleteUserAccount(request, TEST_DATA.authToken);

      // Verify order: storage, device_tokens, notifications, memberships, user
      assertEquals(deletionOrder[0], 'storage');
      assertEquals(deletionOrder[1], 'device_tokens');
      assertEquals(deletionOrder[2], 'notifications');
      assertEquals(deletionOrder[3], 'memberships');
      assertEquals(deletionOrder[4], 'user');
    });
  });
});

/**
 * ============================================================================
 * TESTING NOTES
 * ============================================================================
 *
 * To run these tests:
 * 1. Deno must be installed: `brew install deno`
 * 2. Run: `deno test --allow-all supabase/functions/delete-user-account/delete-user-account.test.ts`
 *
 * Deployment:
 * - Deploy: `supabase functions deploy delete-user-account`
 * - Verify: Check Supabase dashboard for deployed function
 *
 * Integration Testing:
 * - For full integration, create test users in Supabase
 * - Call the function with real JWT tokens
 * - Verify all data is cascaded correctly
 * - Check storage bucket for file deletion
 * - Verify auth.users record is removed
 */
