import { element, by, waitFor } from 'detox';

/**
 * Reusable helper functions for chat E2E tests.
 *
 * These functions encapsulate common chat actions to reduce
 * test code duplication and improve maintainability.
 */

/**
 * Navigate to the chat tab and verify it's visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function navigateToChat(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await element(by.text('Chat')).tap();

  await waitFor(element(by.id('chat-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Open a conversation by tapping on it in the list.
 *
 * @param conversationName - The name of the conversation to open
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function openConversation(
  conversationName: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await element(by.text(conversationName)).tap();

  await waitFor(element(by.id('chat-detail-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Send a text message in the current conversation.
 *
 * @param message - The message text to send
 * @param options - Optional configuration
 * @param options.expectSuccess - Whether to expect the message to appear (default: true)
 * @param options.timeout - Timeout for message appearance (default: 5000ms)
 */
export async function sendMessage(
  message: string,
  options: { expectSuccess?: boolean; timeout?: number } = {}
) {
  const { expectSuccess = true, timeout = 5000 } = options;

  await element(by.id('message-input')).typeText(message);
  await element(by.id('send-button')).tap();

  if (expectSuccess) {
    await waitFor(element(by.text(message)))
      .toBeVisible()
      .withTimeout(timeout);

    // Verify input is cleared
    await expect(element(by.id('message-input'))).toHaveText('');
  }
}

/**
 * Wait for a specific message to appear in the conversation.
 *
 * @param messageContent - The message content to wait for
 * @param options - Optional configuration
 * @param options.timeout - Timeout for message appearance (default: 10000ms)
 */
export async function waitForMessage(
  messageContent: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 10000 } = options;

  await waitFor(element(by.text(messageContent)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the conversation list is visible and contains conversations.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for list appearance (default: 5000ms)
 */
export async function expectConversationListVisible(
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('conversation-list')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the empty state is shown when there are no conversations.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for empty state appearance (default: 5000ms)
 */
export async function expectEmptyState(options: { timeout?: number } = {}) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('chat-empty-state')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify a conversation has an unread count badge.
 *
 * @param conversationName - The name of the conversation
 * @param expectedCount - The expected unread count (optional)
 */
export async function expectUnreadBadge(
  conversationName: string,
  expectedCount?: number
) {
  const conversationItem = element(
    by.id(`conversation-item-${conversationName.toLowerCase().replace(/\s+/g, '-')}`)
  );
  await expect(conversationItem).toBeVisible();

  const badge = element(by.id('unread-badge').withAncestor(by.id(`conversation-item-${conversationName.toLowerCase().replace(/\s+/g, '-')}`)));
  await expect(badge).toBeVisible();

  if (expectedCount !== undefined) {
    await expect(badge).toHaveText(String(expectedCount));
  }
}

/**
 * Verify the chat detail screen has a specific background color class.
 * Note: This is a simplified check - actual color verification may require
 * screenshot comparison or native testing utilities.
 *
 * @param conversationType - The type of conversation ('direct' | 'small_group' | 'ministry' | 'church_wide')
 */
export async function expectRoomTypeBackground(
  conversationType: 'direct' | 'small_group' | 'ministry' | 'church_wide'
) {
  const backgroundId = `chat-background-${conversationType}`;
  await expect(element(by.id(backgroundId))).toExist();
}

/**
 * Navigate back from chat detail to chat list.
 */
export async function navigateBackToList() {
  await element(by.id('back-button')).tap();

  await waitFor(element(by.id('chat-screen')))
    .toBeVisible()
    .withTimeout(3000);
}

/**
 * Scroll to load more messages (pagination test).
 */
export async function scrollToLoadMoreMessages() {
  await element(by.id('message-list')).scroll(500, 'up');
}

/**
 * Verify messages are displayed in chronological order.
 * This is a simplified check that verifies expected messages exist.
 *
 * @param messages - Array of message contents in expected order (oldest first)
 */
export async function expectMessagesInOrder(messages: string[]) {
  for (const message of messages) {
    await expect(element(by.text(message))).toBeVisible();
  }
}

/**
 * Verify sender name is visible for a message.
 *
 * @param senderName - The display name of the sender
 */
export async function expectSenderName(senderName: string) {
  await expect(element(by.text(senderName))).toBeVisible();
}
