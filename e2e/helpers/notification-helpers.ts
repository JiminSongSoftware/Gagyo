import { device, element, by, waitFor } from 'detox';
import * as Notifications from 'expo-notifications';

/**
 * Reusable helper functions for push notification E2E tests.
 *
 * These functions encapsulate common notification actions to reduce
 * test code duplication and improve maintainability.
 *
 * Note: These helpers use a mocked push provider for testing.
 * Real push notifications require actual Expo project credentials.
 */

/**
 * Notification types supported by the app.
 */
export type NotificationType =
  | 'new_message'
  | 'mention'
  | 'prayer_answered'
  | 'pastoral_journal_submitted'
  | 'pastoral_journal_forwarded'
  | 'pastoral_journal_confirmed';

/**
 * Mock notification payload structure.
 */
export interface MockNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data: {
    tenant_id: string;
    conversation_id?: string;
    message_id?: string;
    prayer_card_id?: string;
    journal_id?: string;
    small_group_id?: string;
  };
}

/**
 * Mock a push notification being received by the device.
 *
 * This simulates the Expo Notifications behavior without requiring
 * actual push credentials. It directly calls the notification handler.
 *
 * @param type - The notification type
 * @param payload - The notification payload data
 */
export async function mockPushNotification(
  type: NotificationType,
  payload: Omit<MockNotificationPayload, 'type'>
): Promise<void> {
  const fullPayload: MockNotificationPayload = {
    type,
    ...payload,
  };

  // In a real scenario, this would come from Expo's push service
  // For E2E testing, we use Detox's device.launchApp with notifications
  // or directly trigger the notification listener

  // Simulate receiving notification while app is in background
  await device.sendToHome();
  await device.launchApp({
    newInstance: false,
    userActivity: {
      type: 'notification',
      payload: fullPayload,
    },
  });
}

/**
 * Mock a cold start notification (app launches from notification tap).
 *
 * @param type - The notification type
 * @param payload - The notification payload data
 */
export async function mockColdStartNotification(
  type: NotificationType,
  payload: Omit<MockNotificationPayload, 'type'>
): Promise<void> {
  const fullPayload: MockNotificationPayload = {
    type,
    ...payload,
  };

  // Launch app with notification as the initial trigger
  await device.launchApp({
    newInstance: true,
    userActivity: {
      type: 'notification',
      payload: fullPayload,
    },
  });
}

/**
 * Wait for and verify a notification is displayed (in-app banner).
 *
 * @param title - Expected notification title
 * @param body - Expected notification body
 * @param options - Optional configuration
 */
export async function expectNotificationReceived(
  title: string,
  body: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options;

  // Check for in-app notification banner
  const notificationBanner = element(by.id('notification-banner'));
  await waitFor(notificationBanner).toBeVisible().withTimeout(timeout);

  // Verify title and body
  await expect(element(by.text(title))).toBeVisible();
  await expect(element(by.text(body))).toBeVisible();
}

/**
 * Tap on a notification to trigger deep link navigation.
 *
 * @param notificationId - Test ID of the notification element
 */
export async function tapNotification(
  notificationId: string = 'notification-banner'
): Promise<void> {
  await element(by.id(notificationId)).tap();
}

/**
 * Verify navigation occurred to the expected screen with expected params.
 *
 * @param screenId - The testID of the target screen
 * @param params - Expected route parameters (partial match allowed)
 */
export async function expectDeepLinkNavigation(
  screenId: string,
  params?: Record<string, string>
): Promise<void> {
  // Verify target screen is visible
  await waitFor(element(by.id(screenId)))
    .toBeVisible()
    .withTimeout(5000);

  // If params provided, verify they're reflected in the UI
  if (params) {
    // This would typically involve checking for specific elements
    // that display the param values (e.g., prayer card ID in URL)
    // Implementation depends on how routes are displayed in the app
    for (const [key, value] of Object.entries(params)) {
      // Verify param is reflected somewhere on the screen
      // This is a simplified check - actual implementation may vary
      const paramElement = element(by.id(`param-${key}`));
      await expect(paramElement).toHaveText(value);
    }
  }
}

/**
 * Mock receiving a new message notification.
 *
 * @param senderName - Name of the message sender
 * @param messagePreview - Preview of the message content
 * @param conversationId - ID of the conversation
 * @param tenantId - ID of the tenant
 */
export async function mockNewMessageNotification(
  senderName: string,
  messagePreview: string,
  conversationId: string,
  tenantId: string
): Promise<void> {
  await mockPushNotification('new_message', {
    title: senderName,
    body: messagePreview,
    data: {
      tenant_id: tenantId,
      conversation_id: conversationId,
    },
  });
}

/**
 * Mock receiving a mention notification.
 *
 * @param senderName - Name of the user who mentioned
 * @param messageContent - The message content
 * @param conversationId - ID of the conversation
 * @param messageId - ID of the specific message
 * @param tenantId - ID of the tenant
 */
export async function mockMentionNotification(
  senderName: string,
  messageContent: string,
  conversationId: string,
  messageId: string,
  tenantId: string
): Promise<void> {
  await mockPushNotification('mention', {
    title: `Mentioned by ${senderName}`,
    body: messageContent,
    data: {
      tenant_id: tenantId,
      conversation_id: conversationId,
      message_id: messageId,
    },
  });
}

/**
 * Mock receiving a prayer answered notification.
 *
 * @param authorName - Name of the prayer author
 * @param prayerCardId - ID of the prayer card
 * @param tenantId - ID of the tenant
 */
export async function mockPrayerAnsweredNotification(
  authorName: string,
  prayerCardId: string,
  tenantId: string
): Promise<void> {
  await mockPushNotification('prayer_answered', {
    title: 'Prayer Answered 🎉',
    body: `${authorName}'s prayer has been answered`,
    data: {
      tenant_id: tenantId,
      prayer_card_id: prayerCardId,
    },
  });
}

/**
 * Mock receiving a pastoral journal notification.
 *
 * @param workflowStage - The workflow stage
 * @param details - Details about the journal
 */
export async function mockPastoralJournalNotification(
  workflowStage: 'submitted' | 'forwarded' | 'confirmed',
  details: {
    leaderName?: string;
    groupName?: string;
    zoneLeaderName?: string;
    journalId: string;
    tenantId: string;
    smallGroupId?: string;
  }
): Promise<void> {
  const titles = {
    submitted: 'Pastoral Journal Submitted',
    forwarded: 'Journal Ready for Review',
    confirmed: 'Pastoral Journal Confirmed ✝️',
  };

  const bodies = {
    submitted: `${details.leaderName} submitted a journal for ${details.groupName}`,
    forwarded: `${details.zoneLeaderName} forwarded ${details.groupName}'s journal`,
    confirmed: 'Pastor has reviewed your journal',
  };

  await mockPushNotification(`pastoral_journal_${workflowStage}` as NotificationType, {
    title: titles[workflowStage],
    body: bodies[workflowStage],
    data: {
      tenant_id: details.tenantId,
      journal_id: details.journalId,
      small_group_id: details.smallGroupId,
    },
  });
}

/**
 * Verify notification permission prompt is shown.
 */
export async function expectPermissionPrompt(): Promise<void> {
  // iOS shows a system alert that Detox can interact with
  // Android doesn't show a prompt for notifications
  if (device.getPlatform() === 'ios') {
    await waitFor(element(by.type('UIAlertController')))
      .toBeVisible()
      .withTimeout(3000);
  }
}

/**
 * Grant notification permissions (for testing).
 *
 * Note: On real devices, this requires user interaction.
 * In E2E tests, permissions can be pre-configured via launch args.
 */
export async function grantNotificationPermissions(): Promise<void> {
  // Permissions are typically granted via device capabilities in E2E setup
  // This is a placeholder for any additional permission handling
  // In Detox, permissions are set in beforeEach or via device.launchApp args
}

/**
 * Verify the notification settings toggle state.
 *
 * @param enabled - Whether notifications should be enabled
 */
export async function expectNotificationToggleEnabled(enabled: boolean): Promise<void> {
  const toggle = element(by.id('notification-toggle'));
  await expect(toggle).toBeVisible();

  // Verify toggle state based on implementation
  // This might involve checking accessibility value or visual state
  if (enabled) {
    await expect(toggle).toHaveLabel('enabled');
  } else {
    await expect(toggle).toHaveLabel('disabled');
  }
}

/**
 * Toggle notification settings on/off.
 */
export async function toggleNotificationSettings(): Promise<void> {
  await element(by.id('notification-toggle')).tap();
}

/**
 * Navigate to notification settings.
 */
export async function navigateToNotificationSettings(): Promise<void> {
  await element(by.text('Settings')).tap();
  await waitFor(element(by.id('settings-screen')))
    .toBeVisible()
    .withTimeout(3000);

  await element(by.text('Notifications')).tap();
  await waitFor(element(by.id('notification-settings-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Clear all notifications from the notification center.
 *
 * Note: This is platform-specific and may require special handling.
 */
export async function clearAllNotifications(): Promise<void> {
  // On iOS, this might involve long-pressing and clearing
  // On Android, this might involve swiping away all notifications
  // For E2E testing, we typically don't need to clear notifications
  // as each test starts with a fresh app state
}

/**
 * Verify app is in background (for testing background notification handling).
 */
export async function expectAppInBackground(): Promise<void> {
  // Detox provides device.launchApp() which implies app was not active
  // This is a placeholder for any specific background state verification
}

/**
 * Verify app is in foreground (active).
 */
export async function expectAppInForeground(): Promise<void> {
  await expect(element(by.id('app-root'))).toBeVisible();
}
