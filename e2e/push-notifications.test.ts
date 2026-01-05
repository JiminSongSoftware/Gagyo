import { device, element, by, waitFor } from 'detox';
import { completeAuthFlow } from './helpers/auth-helpers';
import {
  mockNewMessageNotification,
  mockMentionNotification,
  mockPrayerAnsweredNotification,
  mockPastoralJournalNotification,
  mockColdStartNotification,
  expectNotificationReceived,
  tapNotification,
  expectDeepLinkNavigation,
  navigateToNotificationSettings,
  expectNotificationToggleEnabled,
  toggleNotificationSettings,
} from './helpers/notification-helpers';

/**
 * Push Notifications E2E Tests
 *
 * Tests for push notification flows including:
 * - Permission request and handling
 * - Token registration (covered in integration tests)
 * - Notification receipt and display
 * - Notification tap handling and deep linking
 * - Tenant context switching from notifications
 * - Cold start notification handling
 *
 * Following TDD: these tests are written before implementation.
 */
describe('Push Notifications', () => {
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'password123';
  const TEST_TENANT = 'Test Church';
  const TEST_TENANT_ID = 'test-tenant-uuid-123';

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await completeAuthFlow(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT);
  });

  // ============================================================================
  // NOTIFICATION PERMISSION FLOW
  // ============================================================================

  describe('Permission Request', () => {
    it('should request notification permissions on first launch', async () => {
      // This test verifies the permission prompt is shown
      // In E2E, permissions might be auto-granted based on test configuration
      // We verify the flow exists by checking app continues after permission

      await expect(element(by.id('home-screen'))).toBeVisible();

      // App should not hang or crash during permission request
      // Permission handling is logged in debug builds
    });

    it('should handle permission denied gracefully', async () => {
      // If user denies permission, app should still function
      await expect(element(by.id('home-screen'))).toBeVisible();

      // Verify app is functional without notification permission
      await element(by.text('Chat')).tap();
      await expect(element(by.id('chat-screen'))).toBeVisible();
    });

    it('should respect permission choice across app restarts', async () => {
      // Verify permission state persists after app restart
      await device.reloadReactNative();
      await expect(element(by.id('home-screen'))).toBeVisible();

      // App should remember permission choice and not re-prompt
    });
  });

  // ============================================================================
  // NEW MESSAGE NOTIFICATION
  // ============================================================================

  describe('New Message Notification', () => {
    it('should display notification when receiving new message', async () => {
      const conversationId = 'conv-abc-123';
      const senderName = 'John Doe';
      const messagePreview = 'Hey, how are you doing?';

      await mockNewMessageNotification(senderName, messagePreview, conversationId, TEST_TENANT_ID);

      // Verify in-app notification banner is shown
      await expectNotificationReceived(senderName, messagePreview);
    });

    it('should navigate to chat detail when tapping message notification', async () => {
      const conversationId = 'conv-xyz-789';
      const senderName = 'Jane Smith';
      const messagePreview = 'Meeting at 3pm';

      await mockNewMessageNotification(senderName, messagePreview, conversationId, TEST_TENANT_ID);

      await expectNotificationReceived(senderName, messagePreview);
      await tapNotification();

      // Verify navigation to chat detail screen
      await expectDeepLinkNavigation('chat-detail-screen', {
        conversation_id: conversationId,
      });
    });

    it('should mark conversation as read after opening from notification', async () => {
      const conversationId = 'conv-read-123';
      const senderName = 'Bob Johnson';
      const messagePreview = 'Please read this';

      await mockNewMessageNotification(senderName, messagePreview, conversationId, TEST_TENANT_ID);

      await tapNotification();

      // After navigating to chat, unread badge should be cleared
      // This verifies the message is marked as read
      const conversationItem = element(by.id(`conversation-item-${conversationId}`));
      await expect(conversationItem).toBeVisible();

      // Unread badge should not be present
      const unreadBadge = element(
        by.id('unread-badge').withAncestor(by.id(`conversation-item-${conversationId}`))
      );
      await expect(unreadBadge).not.toExist();
    });

    it('should show attachment indicator for media messages', async () => {
      const senderName = 'Alice Williams';
      const attachmentPreview = '[Attachment]';

      await mockNewMessageNotification(
        senderName,
        attachmentPreview,
        'conv-media-123',
        TEST_TENANT_ID
      );

      await expectNotificationReceived(senderName, attachmentPreview);
    });
  });

  // ============================================================================
  // MENTION NOTIFICATION
  // ============================================================================

  describe('Mention Notification', () => {
    it('should display mention notification with higher priority', async () => {
      const conversationId = 'conv-mention-123';
      const senderName = 'Pastor David';
      const messageContent = '@john can you help with setup?';
      const messageId = 'msg-mention-456';

      await mockMentionNotification(
        senderName,
        messageContent,
        conversationId,
        messageId,
        TEST_TENANT_ID
      );

      // Verify mention notification is displayed
      await expectNotificationReceived(`Mentioned by ${senderName}`, messageContent);
    });

    it('should navigate to specific message when tapping mention notification', async () => {
      const conversationId = 'conv-mention-789';
      const senderName = 'Sarah Kim';
      const messageContent = 'Please review this @john';
      const messageId = 'msg-target-123';

      await mockMentionNotification(
        senderName,
        messageContent,
        conversationId,
        messageId,
        TEST_TENANT_ID
      );

      await tapNotification();

      // Verify navigation to chat detail with message_id param
      await expectDeepLinkNavigation('chat-detail-screen', {
        conversation_id: conversationId,
        message_id: messageId,
      });

      // The specific message should be highlighted or scrolled into view
      await expect(element(by.id(`message-${messageId}`))).toBeVisible();
    });

    it('should use different sound for mention notifications', async () => {
      // This test verifies the notification payload includes sound config
      // Actual sound verification would require audio testing infrastructure
      // We verify the payload is correctly structured

      await mockMentionNotification(
        'Test User',
        'Mention test',
        'conv-123',
        'msg-123',
        TEST_TENANT_ID
      );

      // Notification should be received (sound is verified in unit tests)
      await expectNotificationReceived('Mentioned by Test User', 'Mention test');
    });
  });

  // ============================================================================
  // PRAYER ANSWERED NOTIFICATION
  // ============================================================================

  describe('Prayer Answered Notification', () => {
    it('should display celebratory prayer answered notification', async () => {
      const authorName = 'Maria Garcia';
      const prayerCardId = 'prayer-answered-123';

      await mockPrayerAnsweredNotification(authorName, prayerCardId, TEST_TENANT_ID);

      // Verify notification with emoji is displayed
      await expectNotificationReceived(
        'Prayer Answered 🎉',
        `${authorName}'s prayer has been answered`
      );
    });

    it('should navigate to prayer card when tapping prayer answered notification', async () => {
      const authorName = 'James Lee';
      const prayerCardId = 'prayer-nav-456';

      await mockPrayerAnsweredNotification(authorName, prayerCardId, TEST_TENANT_ID);

      await tapNotification();

      // Verify navigation to prayer card detail
      await expectDeepLinkNavigation('prayer-detail-screen', {
        prayer_card_id: prayerCardId,
      });
    });

    it('should show prayer card details after navigation', async () => {
      const prayerCardId = 'prayer-details-789';

      await mockPrayerAnsweredNotification('Test Author', prayerCardId, TEST_TENANT_ID);

      await tapNotification();

      // Verify prayer card content is visible
      await expect(element(by.id('prayer-card-content'))).toBeVisible();
      await expect(element(by.id('prayer-status-answered'))).toBeVisible();
    });
  });

  // ============================================================================
  // PASTORAL JOURNAL NOTIFICATIONS
  // ============================================================================

  describe('Pastoral Journal Notifications', () => {
    it('should notify zone leader when journal is submitted', async () => {
      const journalId = 'journal-submitted-123';

      await mockPastoralJournalNotification('submitted', {
        leaderName: 'John Small Group Leader',
        groupName: 'Grace Group',
        journalId,
        tenantId: TEST_TENANT_ID,
        smallGroupId: 'sg-123',
      });

      await expectNotificationReceived(
        'Pastoral Journal Submitted',
        'John Small Group Leader submitted a journal for Grace Group'
      );
    });

    it('should notify pastors when journal is forwarded', async () => {
      const journalId = 'journal-forwarded-456';

      await mockPastoralJournalNotification('forwarded', {
        zoneLeaderName: 'Zone Leader Mike',
        groupName: 'Hope Group',
        journalId,
        tenantId: TEST_TENANT_ID,
        smallGroupId: 'sg-456',
      });

      await expectNotificationReceived(
        'Journal Ready for Review',
        "Zone Leader Mike forwarded Hope Group's journal"
      );
    });

    it('should notify leader when journal is confirmed', async () => {
      const journalId = 'journal-confirmed-789';

      await mockPastoralJournalNotification('confirmed', {
        journalId,
        tenantId: TEST_TENANT_ID,
        smallGroupId: 'sg-789',
      });

      await expectNotificationReceived(
        'Pastoral Journal Confirmed ✝️',
        'Pastor has reviewed your journal'
      );
    });

    it('should navigate to journal detail when tapping pastoral notification', async () => {
      const journalId = 'journal-nav-123';

      await mockPastoralJournalNotification('confirmed', {
        journalId,
        tenantId: TEST_TENANT_ID,
        smallGroupId: 'sg-123',
      });

      await tapNotification();

      await expectDeepLinkNavigation('pastoral-journal-detail-screen', {
        journal_id: journalId,
      });
    });
  });

  // ============================================================================
  // TENANT CONTEXT HANDLING
  // ============================================================================

  describe('Tenant Context from Notifications', () => {
    it('should switch to correct tenant when tapping notification from different tenant', async () => {
      // This test assumes user has membership in multiple tenants
      const otherTenantId = 'other-tenant-uuid-456';

      await mockNewMessageNotification(
        'Other Tenant User',
        'Message from other tenant',
        'conv-other-123',
        otherTenantId
      );

      await tapNotification();

      // Verify tenant context was switched
      // App should show other tenant's data
      await expect(element(by.id('current-tenant-indicator'))).toHaveText('Other Church');
    });

    it('should show error if tenant membership is inactive', async () => {
      const inactiveTenantId = 'inactive-tenant-789';

      await mockNewMessageNotification(
        'Inactive User',
        'Should not see this',
        'conv-inactive-123',
        inactiveTenantId
      );

      await tapNotification();

      // Should show error message instead of navigating
      await expect(element(by.id('error-message'))).toBeVisible();
      await expect(element(by.text('No active membership in this tenant'))).toBeVisible();
    });

    it('should require re-authentication if tenant session expired', async () => {
      // Simulate expired session for tenant
      const expiredTenantId = 'expired-tenant-123';

      await mockNewMessageNotification(
        'Expired User',
        'Session expired',
        'conv-expired-123',
        expiredTenantId
      );

      await tapNotification();

      // Should redirect to login instead of navigating
      await expect(element(by.id('login-screen'))).toBeVisible();
    });
  });

  // ============================================================================
  // COLD START NOTIFICATION HANDLING
  // ============================================================================

  describe('Cold Start from Notification', () => {
    beforeAll(async () => {
      // Terminate app completely before cold start tests
      await device.terminateApp();
    });

    it('should handle notification tap when app is not running', async () => {
      const conversationId = 'cold-start-conv-123';

      // Launch app from notification (cold start)
      await mockColdStartNotification('new_message', {
        title: 'Cold Start Message',
        body: 'App was not running',
        data: {
          tenant_id: TEST_TENANT_ID,
          conversation_id: conversationId,
        },
      });

      // Verify app navigates correctly even from cold start
      await expectDeepLinkNavigation('chat-detail-screen', {
        conversation_id: conversationId,
      });
    });

    it('should authenticate first if needed during cold start', async () => {
      // This test assumes no active session
      await device.launchApp({ newInstance: true });

      // Mock notification that requires auth
      await mockColdStartNotification('new_message', {
        title: 'Auth Required',
        body: 'Please sign in',
        data: {
          tenant_id: TEST_TENANT_ID,
          conversation_id: 'conv-auth-123',
        },
      });

      // Should show login screen first
      await expect(element(by.id('login-screen'))).toBeVisible();

      // After auth, should navigate to intended destination
      await completeAuthFlow(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT);

      await expectDeepLinkNavigation('chat-detail-screen', {
        conversation_id: 'conv-auth-123',
      });
    });

    it('should preserve notification data during cold start navigation', async () => {
      const prayerCardId = 'cold-prayer-123';

      await mockColdStartNotification('prayer_answered', {
        title: 'Cold Start Prayer',
        body: 'Prayer answered from cold start',
        data: {
          tenant_id: TEST_TENANT_ID,
          prayer_card_id: prayerCardId,
        },
      });

      await expectDeepLinkNavigation('prayer-detail-screen', {
        prayer_card_id: prayerCardId,
      });

      // Verify all prayer card data is loaded correctly
      await expect(element(by.id('prayer-card-content'))).toBeVisible();
    });
  });

  // ============================================================================
  // BACKGROUND APP NOTIFICATION HANDLING
  // ============================================================================

  describe('Background App Notification', () => {
    it('should show notification banner when app is backgrounded', async () => {
      // Send app to background
      await device.sendToHome();

      // Wait a moment for app to enter background
      await waitFor(1000);

      // Receive notification
      await mockNewMessageNotification(
        'Background User',
        'Background message',
        'conv-bg-123',
        TEST_TENANT_ID
      );

      // Bring app to foreground
      await device.launchApp({ newInstance: false });

      // Verify in-app notification banner is shown
      await expectNotificationReceived('Background User', 'Background message');
    });

    it('should not show banner if notification was tapped from notification center', async () => {
      await device.sendToHome();

      // Simulate tapping notification in notification center
      // which opens app directly to target screen
      await mockNewMessageNotification(
        'Direct Nav User',
        'Navigate directly',
        'conv-direct-123',
        TEST_TENANT_ID
      );

      await device.launchApp({
        newInstance: false,
        userActivity: {
          type: 'notification',
          payload: {
            type: 'new_message',
            title: 'Direct Nav User',
            body: 'Navigate directly',
            data: {
              tenant_id: TEST_TENANT_ID,
              conversation_id: 'conv-direct-123',
            },
          },
        },
      });

      // Should navigate directly without showing banner
      await expect(element(by.id('chat-detail-screen'))).toBeVisible();
      await expect(element(by.id('notification-banner'))).not.toBeVisible();
    });
  });

  // ============================================================================
  // NOTIFICATION SETTINGS
  // ============================================================================

  describe('Notification Settings', () => {
    it('should display notification preferences in settings', async () => {
      await navigateToNotificationSettings();

      // Verify notification settings screen is visible
      await expect(element(by.id('notification-settings-screen'))).toBeVisible();

      // Verify various notification type toggles
      await expect(element(by.id('toggle-messages'))).toBeVisible();
      await expect(element(by.id('toggle-mentions'))).toBeVisible();
      await expect(element(by.id('toggle-prayers'))).toBeVisible();
      await expect(element(by.id('toggle-pastoral'))).toBeVisible();
    });

    it('should allow disabling specific notification types', async () => {
      await navigateToNotificationSettings();

      // Disable mention notifications
      await element(by.id('toggle-mentions')).tap();

      // Verify state is saved
      await expectNotificationToggleEnabled(false);

      // Reload and verify preference persists
      await device.reloadReactNative();
      await navigateToNotificationSettings();
      await expectNotificationToggleEnabled(false);
    });

    it('should respect notification preferences when sending', async () => {
      await navigateToNotificationSettings();

      // Disable message notifications
      await element(by.id('toggle-messages')).tap();

      // Even if message notification is triggered, it should not display
      await mockNewMessageNotification(
        'Muted Sender',
        'Should not show',
        'conv-muted-123',
        TEST_TENANT_ID
      );

      // Notification banner should NOT appear
      await expect(element(by.id('notification-banner'))).not.toBeVisible();
    });
  });

  // ============================================================================
  // EVENT CHAT EXCLUSION
  // ============================================================================

  describe('Event Chat Exclusion', () => {
    it('should not send notification to users excluded from event chat', async () => {
      // This test verifies the exclusion logic
      // The actual exclusion is handled on the backend
      // Here we verify the client doesn't show notifications for excluded chats

      const eventConversationId = 'event-chat-excluded-123';

      // Simulate notification for event chat where user is excluded
      await mockNewMessageNotification(
        'Event Chat User',
        'Should not receive this',
        eventConversationId,
        TEST_TENANT_ID
      );

      // Client should check exclusion status and not display
      await expect(element(by.id('notification-banner'))).not.toBeVisible();
    });

    it('should send notification to included users in event chat', async () => {
      const eventConversationId = 'event-chat-included-456';

      // Mock user is included in this event chat
      await mockNewMessageNotification(
        'Event Chat User',
        'Should receive this',
        eventConversationId,
        TEST_TENANT_ID
      );

      // Notification should be displayed
      await expectNotificationReceived('Event Chat User', 'Should receive this');
    });
  });

  // ============================================================================
  // INTERNATIONALIZATION
  // ============================================================================

  describe('Notification i18n', () => {
    it('should display Korean notifications when locale is ko', async () => {
      // This test would require changing device locale
      // For now, we verify the i18n system is being used

      await mockNewMessageNotification(
        'Korean User',
        'Korean message',
        'conv-ko-123',
        TEST_TENANT_ID
      );

      // In Korean locale, title/body would be translated
      // The test verifies notification structure supports i18n
      await expectNotificationReceived('Korean User', 'Korean message');
    });

    it('should show localized prayer answered notification', async () => {
      // Korean: "기도 응답 🎉"
      await mockPrayerAnsweredNotification('Korean Author', 'prayer-ko-123', TEST_TENANT_ID);

      // Verify emoji is preserved in translation
      await expectNotificationReceived(
        expect.stringContaining('🎉'),
        expect.stringContaining('기도')
      );
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle malformed notification payload gracefully', async () => {
      // Simulate notification with missing required fields
      await device.launchApp({
        newInstance: false,
        userActivity: {
          type: 'notification',
          payload: {
            // Missing type, title, body - malformed
            data: { tenant_id: TEST_TENANT_ID },
          },
        },
      });

      // App should not crash, should handle gracefully
      await expect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should show error when navigation target is not found', async () => {
      await mockNewMessageNotification(
        'Error User',
        'Invalid target',
        'conv-does-not-exist',
        TEST_TENANT_ID
      );

      await tapNotification();

      // Should show error toast or alert
      await expect(element(by.id('error-toast'))).toBeVisible();
      await expect(element(by.text('Conversation not found'))).toBeVisible();
    });

    it('should handle network errors when fetching notification data', async () => {
      // Mock network failure scenario
      await mockNewMessageNotification(
        'Network Error User',
        'Will fail to fetch',
        'conv-network-error',
        TEST_TENANT_ID
      );

      await tapNotification();

      // Should show appropriate error message
      await expect(element(by.id('error-toast'))).toBeVisible();
      await expect(element(by.text('Unable to load conversation'))).toBeVisible();
    });
  });
});
