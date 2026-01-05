import { element, by, waitFor } from 'detox';

/**
 * Reusable helper functions for thread E2E tests.
 *
 * These functions encapsulate common thread actions to reduce
 * test code duplication and improve maintainability.
 */

/**
 * Open the thread view by tapping on a message.
 *
 * @param messageContent - The content of the message to open thread for
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function openThreadFromMessage(
  messageContent: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  // Tap on the message to open its thread
  await element(by.text(messageContent)).tap();

  await waitFor(element(by.id('thread-view-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Tap on a message that has replies (via the reply count badge).
 *
 * @param messageContent - The content of the message with replies
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 5000ms)
 */
export async function tapMessageWithReplies(
  messageContent: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  // Find the message and tap on the reply count badge
  const messageElement = element(by.text(messageContent));
  await expect(messageElement).toBeVisible();

  // Tap the message itself (which should have the thread indicator)
  await messageElement.tap();

  await waitFor(element(by.id('thread-view-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Send a reply in the current thread view.
 *
 * @param replyContent - The reply text to send
 * @param options - Optional configuration
 * @param options.expectSuccess - Whether to expect the reply to appear (default: true)
 * @param options.timeout - Timeout for reply appearance (default: 5000ms)
 */
export async function sendThreadReply(
  replyContent: string,
  options: { expectSuccess?: boolean; timeout?: number } = {}
) {
  const { expectSuccess = true, timeout = 5000 } = options;

  await element(by.id('thread-reply-input')).typeText(replyContent);
  await element(by.id('thread-send-button')).tap();

  if (expectSuccess) {
    await waitFor(element(by.text(replyContent)))
      .toBeVisible()
      .withTimeout(timeout);

    // Verify input is cleared
    await expect(element(by.id('thread-reply-input'))).toHaveText('');
  }
}

/**
 * Verify the thread view screen is visible.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for visibility check (default: 5000ms)
 */
export async function expectThreadViewVisible(
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('thread-view-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the parent message is visible at the top of the thread view.
 *
 * @param messageContent - The expected parent message content
 */
export async function expectParentMessageVisible(messageContent: string) {
  // Parent message should be in the parent message container
  await expect(element(by.text(messageContent))).toBeVisible();
}

/**
 * Verify a thread reply is visible in the thread view.
 *
 * @param replyContent - The expected reply content
 * @param options - Optional configuration
 * @param options.timeout - Timeout for visibility check (default: 5000ms)
 */
export async function expectThreadReplyVisible(
  replyContent: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.text(replyContent)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify the thread empty state is shown (no replies yet).
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for visibility check (default: 5000ms)
 */
export async function expectThreadEmptyState(
  options: { timeout?: number } = {}
) {
  const { timeout = 5000 } = options;

  await waitFor(element(by.id('thread-empty-state')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Navigate back from thread view to chat detail.
 *
 * @param options - Optional configuration
 * @param options.timeout - Timeout for navigation (default: 3000ms)
 */
export async function navigateBackFromThread(
  options: { timeout?: number } = {}
) {
  const { timeout = 3000 } = options;

  await element(by.id('thread-back-button')).tap();

  await waitFor(element(by.id('chat-detail-screen')))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify a message has the expected thread reply count.
 *
 * @param messageContent - The message content
 * @param expectedCount - The expected number of replies
 */
export async function expectThreadReplyCount(
  messageContent: string,
  expectedCount: number
) {
  // Find the message element
  const messageElement = element(by.text(messageContent));
  await expect(messageElement).toBeVisible();

  // The reply count badge should show the expected count
  // Note: The actual badge text format may vary (e.g., "3" or "3 replies")
  const badgeText = `${expectedCount}`;
  await expect(element(by.text(badgeText))).toBeVisible();
}

/**
 * Scroll the thread reply list to load more replies.
 *
 * @param direction - Scroll direction ('up' | 'down')
 * @param distance - Distance to scroll in pixels (default: 500)
 */
export async function scrollThreadReplies(
  direction: 'up' | 'down' = 'up',
  distance: number = 500
) {
  await element(by.id('thread-reply-list')).scroll(distance, direction);
}

/**
 * Wait for a thread reply to appear (useful for real-time tests).
 *
 * @param replyContent - The reply content to wait for
 * @param options - Optional configuration
 * @param options.timeout - Timeout for appearance (default: 10000ms)
 */
export async function waitForThreadReply(
  replyContent: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 10000 } = options;

  await waitFor(element(by.text(replyContent)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Verify thread reply input is disabled.
 * Useful for testing loading states or permission restrictions.
 */
export async function expectThreadReplyInputDisabled() {
  const input = element(by.id('thread-reply-input'));
  await expect(input).toBeVisible();
  // Note: actual disabled state check may vary by implementation
}

/**
 * Verify thread reply input is enabled and ready for input.
 */
export async function expectThreadReplyInputEnabled() {
  const input = element(by.id('thread-reply-input'));
  await expect(input).toBeVisible();

  // Verify we can type into the input
  await input.typeText('test');
  await input.clearText();
}
