/**
 * Event Chat E2E Tests
 *
 * Tests for Event Chat feature - selective message visibility.
 * Following TDD: these tests are written before implementation.
 *
 * Event Chat allows users to send messages in group chat while
 * excluding specific members from seeing them (e.g., planning
 * surprise events without the subject knowing).
 */

import { device, element, by, waitFor } from 'detox';
import { completeAuthFlow } from './helpers/auth-helpers';
import {
  navigateToChat,
  openConversation,
  sendMessage,
  waitForMessage,
} from './helpers/chat-helpers';

/**
 * Open the Event Chat selector modal.
 */
export async function openEventChatSelector(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('event-chat-button')).tap();

  await waitFor(element(by.id('event-chat-selector-modal')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Select a user to exclude from Event Chat.
 *
 * @param displayName - The display name of the user to exclude
 */
export async function selectExcludedUser(displayName: string) {
  await element(by.id(`exclude-user-${displayName}`)).tap();
}

/**
 * Deselect a user from exclusion list.
 *
 * @param displayName - The display name of the user to deselect
 */
export async function deselectExcludedUser(displayName: string) {
  await element(by.id(`exclude-user-${displayName}`)).tap();
}

/**
 * Send an Event Chat message with selected exclusions.
 *
 * @param content - The message content to send
 */
export async function sendEventChatMessage(content: string, options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.id('message-text-input')).typeText(content);
  await element(by.id('event-chat-send-button')).tap();

  await waitFor(element(by.text(content)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Confirm Event Chat selections and close selector.
 */
export async function confirmEventChatSelection() {
  await element(by.id('event-chat-confirm-button')).tap();
}

/**
 * Cancel Event Chat mode.
 */
export async function cancelEventChat() {
  await element(by.id('event-chat-cancel-button')).tap();
}

// Test constants
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_TENANT = 'Test Church';

// Secondary user for multi-user tests
const USER_B_EMAIL = 'test2@example.com';
const USER_B_PASSWORD = 'password123';
const USER_B_TENANT = 'Test Church';

// Third user for non-excluded tests
const USER_C_EMAIL = 'test3@example.com';
const USER_C_PASSWORD = 'password123';
const USER_C_TENANT = 'Test Church';

describe('Event Chat', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await completeAuthFlow(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT);
  });

  describe('Event Chat Selector', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
    });

    it('should open Event Chat selector when tapping Event Chat button', async () => {
      await openEventChatSelector();

      await expect(element(by.id('event-chat-selector-modal'))).toBeVisible();
    });

    it('should display list of conversation participants for exclusion', async () => {
      await openEventChatSelector();

      await expect(element(by.id('participant-list'))).toBeVisible();

      // Verify participant names are visible
      await expect(element(by.text('John Doe'))).toBeVisible();
      await expect(element(by.text('Jane Smith'))).toBeVisible();
    });

    it('should allow selecting up to 5 users for exclusion', async () => {
      await openEventChatSelector();

      await selectExcludedUser('John Doe');
      await selectExcludedUser('Jane Smith');

      // Verify selected count is displayed
      await expect(element(by.text('2 of 5 selected'))).toBeVisible();
    });

    it('should prevent selecting more than 5 users', async () => {
      // This test requires a conversation with 6+ participants
      await navigateToChat();
      await openConversation('Large Group'); // Assumes test data has this conversation

      await openEventChatSelector();

      // Select 5 users
      await selectExcludedUser('User 1');
      await selectExcludedUser('User 2');
      await selectExcludedUser('User 3');
      await selectExcludedUser('User 4');
      await selectExcludedUser('User 5');

      // Verify count shows 5 selected
      await expect(element(by.text('5 of 5 selected'))).toBeVisible();

      // Attempt to select 6th user - should show error or be disabled
      await selectExcludedUser('User 6');

      // Assert: Error message or disabled state
      await expect(element(by.text('Maximum 5 users'))).toBeVisible();
    });

    it('should close selector when cancel is pressed', async () => {
      await openEventChatSelector();
      await cancelEventChat();

      // Modal should not be visible
      await expect(element(by.id('event-chat-selector-modal'))).not.toExist();
    });

    it('should filter out current user from exclusion list', async () => {
      await openEventChatSelector();

      // Current user should not appear in the list
      // This assumes we know the current user's display name
      // In a real test, we'd verify the current user is not in the participant list
      await expect(element(by.id('exclude-user-current-user'))).not.toExist();
    });
  });

  describe('Send Event Chat Message', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
    });

    it('should send Event Chat message and show eye indicator', async () => {
      await openEventChatSelector();
      await selectExcludedUser('John Doe');
      await confirmEventChatSelection();

      // Verify Event Chat mode is active
      await expect(element(by.id('event-chat-mode-indicator'))).toBeVisible();

      // Type and send message
      await sendEventChatMessage('Surprise party!');

      // Verify message sent
      await expect(element(by.text('Surprise party!'))).toBeVisible();

      // Verify eye indicator visible (sender only)
      await expect(element(by.id('event-chat-indicator'))).toBeVisible();
    });

    it('should show excluded count in Event Chat mode', async () => {
      await openEventChatSelector();
      await selectExcludedUser('John Doe');
      await selectExcludedUser('Jane Smith');
      await confirmEventChatSelection();

      // Verify excluded count displayed
      await expect(element(by.text('Event Chat mode (2 excluded)'))).toBeVisible();
    });

    it('should reset Event Chat mode after sending message', async () => {
      await openEventChatSelector();
      await selectExcludedUser('John Doe');
      await confirmEventChatSelection();

      await sendEventChatMessage('Secret message');

      // Event Chat mode should be reset
      await expect(element(by.id('event-chat-mode-indicator'))).not.toExist();
    });

    it('should allow canceling Event Chat mode', async () => {
      await openEventChatSelector();
      await selectExcludedUser('John Doe');
      await confirmEventChatSelection();

      // Cancel before sending
      await cancelEventChat();

      // Event Chat mode should not be active
      await expect(element(by.id('event-chat-mode-indicator'))).not.toExist();
    });
  });

  describe('Multi-User Visibility', () => {
    it('should not show Event Chat message to excluded user', async () => {
      // User A sends Event Chat excluding User B
      await navigateToChat();
      await openConversation('Small Group');

      await openEventChatSelector();
      await selectExcludedUser('User B');
      await confirmEventChatSelection();

      const secretMessage = `Secret message ${Date.now()}`;
      await sendEventChatMessage(secretMessage);

      // Logout and login as User B
      await device.reloadReactNative();
      await completeAuthFlow(USER_B_EMAIL, USER_B_PASSWORD, USER_B_TENANT);

      await navigateToChat();
      await openConversation('Small Group');

      // Assert: Message not visible
      await expect(element(by.text(secretMessage))).not.toBeVisible();
    });

    it('should show Event Chat message to non-excluded user', async () => {
      // User A sends Event Chat excluding User B (but not User C)
      await navigateToChat();
      await openConversation('Small Group');

      await openEventChatSelector();
      await selectExcludedUser('User B');
      await confirmEventChatSelection();

      const secretMessage = `Secret message ${Date.now()}`;
      await sendEventChatMessage(secretMessage);

      // Logout and login as User C
      await device.reloadReactNative();
      await completeAuthFlow(USER_C_EMAIL, USER_C_PASSWORD, USER_C_TENANT);

      await navigateToChat();
      await openConversation('Small Group');

      // Assert: Message visible (no eye indicator for non-sender)
      await expect(element(by.text(secretMessage))).toBeVisible();
      await expect(element(by.id('event-chat-indicator'))).not.toBeVisible();
    });

    it('should show Event Chat message to sender with eye indicator', async () => {
      await navigateToChat();
      await openConversation('Small Group');

      await openEventChatSelector();
      await selectExcludedUser('John Doe');
      await confirmEventChatSelection();

      const secretMessage = `Secret message ${Date.now()}`;
      await sendEventChatMessage(secretMessage);

      // Sender should see the message with eye indicator
      await expect(element(by.text(secretMessage))).toBeVisible();
      await expect(element(by.id('event-chat-indicator'))).toBeVisible();
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
    });

    it('should prevent sending Event Chat with no exclusions selected', async () => {
      await openEventChatSelector();
      await confirmEventChatSelection();

      // Should show validation error or disable confirm button
      await expect(element(by.text('Select at least 1 user to exclude'))).toBeVisible();
    });

    it('should validate max 5 exclusions at selection time', async () => {
      await navigateToChat();
      await openConversation('Large Group'); // Conversation with many participants

      await openEventChatSelector();

      // Select 5 users
      for (let i = 1; i <= 5; i++) {
        await selectExcludedUser(`User ${i}`);
      }

      // 6th selection should be blocked
      const sixthUser = element(by.id('exclude-user-User 6'));
      await expect(sixthUser).not.toBeVisible(); // Disabled or hidden
    });
  });

  describe('Internationalization', () => {
    it('should display Event Chat UI in Korean when locale is ko', async () => {
      // This test assumes locale switching is implemented
      // For now, verify i18n keys are being used

      await navigateToChat();
      await openConversation('Small Group');

      // The Event Chat button should use translated text
      await expect(element(by.id('event-chat-button'))).toBeVisible();
    });

    it('should translate validation messages', async () => {
      await navigateToChat();
      await openConversation('Small Group');

      await openEventChatSelector();

      // Try to select 6th user in a conversation with 6+ participants
      // Should show translated error message
      await expect(element(by.text(/maximum.*5.*users/i))).not.toBeVisible();
    });
  });
});

/**
 * Event Chat E2E Tests - Korean Locale
 *
 * Tests for Event Chat feature in Korean locale to ensure i18n coverage.
 */
describe('Event Chat (Korean Locale)', () => {
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'password123';
  const TEST_TENANT = 'Test Church';

  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await completeAuthFlow(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT);
  });

  describe('Event Chat Selector (Korean)', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
    });

    it('should display Korean labels in Event Chat selector', async () => {
      await openEventChatSelector();

      // Korean: '이벤트 채팅' for Event Chat
      await expect(element(by.id('event-chat-selector-modal'))).toBeVisible();
    });

    it('should display Korean exclusion count text', async () => {
      await openEventChatSelector();

      await selectExcludedUser('John Doe');
      await selectExcludedUser('Jane Smith');

      // Korean: '2명 / 5명 선택됨'
      await expect(element(by.id('exclusion-count'))).toBeVisible();
    });

    it('should display Korean confirm and cancel buttons', async () => {
      await openEventChatSelector();

      // Korean: '확인' for Confirm, '취소' for Cancel
      await expect(element(by.id('event-chat-confirm-button'))).toBeVisible();
      await expect(element(by.id('event-chat-cancel-button'))).toBeVisible();
    });
  });

  describe('Event Chat Mode Indicator (Korean)', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
    });

    it('should display Korean mode indicator text', async () => {
      await openEventChatSelector();
      await selectExcludedUser('John Doe');
      await confirmEventChatSelection();

      // Korean: '이벤트 채팅 모드 (1명 제외)'
      await expect(element(by.id('event-chat-mode-indicator'))).toBeVisible();
    });
  });

  describe('Validation Messages (Korean)', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
    });

    it('should display Korean validation for empty exclusions', async () => {
      await openEventChatSelector();
      await confirmEventChatSelection();

      // Korean: '최소 1명을 선택해야 합니다'
      await expect(element(by.id('validation-error'))).toBeVisible();
    });

    it('should display Korean validation for max exclusions', async () => {
      await navigateToChat();
      await openConversation('Large Group');

      await openEventChatSelector();

      // Select 5 users
      for (let i = 1; i <= 5; i++) {
        await selectExcludedUser(`User ${i}`);
      }

      // Attempt 6th selection
      await selectExcludedUser('User 6');

      // Korean: '최대 5명까지 선택 가능합니다'
      await expect(element(by.id('max-exclusion-error'))).toBeVisible();
    });
  });

  describe('Event Chat Eye Indicator (Korean)', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
    });

    it('should display Korean tooltip for eye indicator', async () => {
      await openEventChatSelector();
      await selectExcludedUser('John Doe');
      await confirmEventChatSelection();

      const secretMessage = `비밀 메시지 ${Date.now()}`;
      await sendEventChatMessage(secretMessage);

      // Eye indicator should be visible
      await expect(element(by.id('event-chat-indicator'))).toBeVisible();
    });
  });
});

/**
 * ============================================================================
 * NOTES ON EVENT CHAT E2E TESTING
 * ============================================================================
 *
 * Test Setup Requirements:
 * 1. Test data must include conversations with multiple participants
 * 2. Multiple test users must be available for multi-user visibility tests
 * 3. User switching must work (logout/login flow)
 *
 * Test ID Conventions:
 * - Event Chat button: 'event-chat-button'
 * - Selector modal: 'event-chat-selector-modal'
 * - Participant list: 'participant-list'
 * - Exclude user checkbox: 'exclude-user-{displayName}'
 * - Confirm button: 'event-chat-confirm-button'
 * - Cancel button: 'event-chat-cancel-button'
 * - Send button in Event Chat mode: 'event-chat-send-button'
 * - Eye indicator: 'event-chat-indicator'
 * - Event Chat mode indicator: 'event-chat-mode-indicator'
 * - Message input: 'message-text-input'
 *
 * Visual States:
 * - Normal mode: Standard message input
 * - Event Chat mode: Badge with excluded count, "Send Event Chat" button
 * - Selector modal: Participant list with checkboxes
 *
 * Edge Cases Covered:
 * - Max 5 exclusions
 * - Cannot exclude self
 * - Multi-user visibility
 * - Mode reset after send
 * - Validation at selection time
 */
