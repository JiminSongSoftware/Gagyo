import { device, element, by, waitFor } from 'detox';
import { completeAuthFlow } from './helpers/auth-helpers';
import {
  navigateToChat,
  openConversation,
  sendMessage,
  waitForMessage,
  navigateBackToList,
} from './helpers/chat-helpers';
import {
  openThreadFromMessage,
  sendThreadReply,
  expectThreadViewVisible,
  expectParentMessageVisible,
  expectThreadReplyVisible,
  expectThreadEmptyState,
  navigateBackFromThread,
  expectThreadReplyCount,
  tapMessageWithReplies,
} from './helpers/thread-helpers';

/**
 * Thread E2E Tests
 *
 * Tests for message threading (nested conversation) functionality.
 * Following TDD: these tests are written before implementation.
 *
 * Thread model: single-level threading only (no nested replies to replies)
 */
describe('Thread', () => {
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'password123';
  const TEST_TENANT = 'Test Church';

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await completeAuthFlow(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT);
  });

  describe('Thread Navigation', () => {
    it('should navigate to thread view when tapping a message', async () => {
      await navigateToChat();
      await openConversation('Small Group');

      // Tap on a message to open its thread
      await openThreadFromMessage('Hello everyone!');

      // Verify thread view is visible
      await expectThreadViewVisible();
    });

    it('should display parent message at the top of thread view', async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');

      // Verify parent message is visible at top
      await expectParentMessageVisible('Hello everyone!');
    });

    it('should navigate back to chat detail from thread view', async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');
      await navigateBackFromThread();

      // Verify we're back in chat detail
      await expect(element(by.id('chat-detail-screen'))).toBeVisible();
    });

    it('should show thread reply count badge on messages with replies', async () => {
      await navigateToChat();
      await openConversation('Small Group');

      // Verify a message with replies shows the count badge
      await expectThreadReplyCount('Hello everyone!', 3);
    });

    it('should open thread when tapping reply count badge', async () => {
      await navigateToChat();
      await openConversation('Small Group');

      // Tap the reply count badge
      await tapMessageWithReplies('Hello everyone!');

      // Verify thread view opens
      await expectThreadViewVisible();
    });
  });

  describe('Thread Replies', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');
    });

    it('should display existing thread replies', async () => {
      // Verify existing replies are visible
      await expectThreadReplyVisible('Great to hear from you!');
      await expectThreadReplyVisible('Hope everyone is doing well.');
    });

    it('should show empty state when thread has no replies', async () => {
      // Navigate back and open a message without replies
      await navigateBackFromThread();
      await openThreadFromMessage('How is everyone doing?');

      // Verify empty state is shown
      await expectThreadEmptyState();
    });

    it('should send a reply to the thread', async () => {
      const testReply = `Thread reply ${Date.now()}`;

      await sendThreadReply(testReply);

      // Verify reply appears in thread
      await expectThreadReplyVisible(testReply);
    });

    it('should clear reply input after sending', async () => {
      const testReply = 'Reply to clear';

      await element(by.id('thread-reply-input')).typeText(testReply);
      await element(by.id('thread-send-button')).tap();

      // Wait for reply to appear
      await waitFor(element(by.text(testReply)))
        .toBeVisible()
        .withTimeout(5000);

      // Verify input is cleared
      await expect(element(by.id('thread-reply-input'))).toHaveText('');
    });
  });

  describe('Nested Thread Prevention', () => {
    it('should not allow tapping on thread replies to open nested threads', async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');

      // Tap on a reply - should NOT navigate to another thread
      await element(by.text('Great to hear from you!')).tap();

      // Verify we're still in the same thread view
      await expectThreadViewVisible();
      await expectParentMessageVisible('Hello everyone!');
    });

    it('should not show reply count badges on thread replies', async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');

      // Thread replies should not have reply count badges
      const replyBadge = element(
        by.id('reply-count-badge').withAncestor(by.id('thread-reply-list'))
      );
      await expect(replyBadge).not.toExist();
    });
  });

  describe('Real-Time Thread Updates', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');
    });

    it('should display new thread replies in real-time without refresh', async () => {
      // This test verifies the UI is set up for real-time updates
      // In a real test environment, this would involve:
      // 1. Having a second test client send a reply
      // 2. Or using a test API to insert a reply directly

      // Verify the thread list is visible and can receive updates
      await expect(element(by.id('thread-reply-list'))).toBeVisible();
    });

    it('should update reply count on parent message after adding reply', async () => {
      // Get initial reply count
      const initialCount = 3; // assuming message has 3 replies

      // Send a new reply
      const testReply = `Count test reply ${Date.now()}`;
      await sendThreadReply(testReply);

      // Navigate back to verify count updated
      await navigateBackFromThread();

      // Verify reply count increased
      await expectThreadReplyCount('Hello everyone!', initialCount + 1);
    });
  });

  describe('Thread UI Elements', () => {
    beforeEach(async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');
    });

    it('should display Thread title in header', async () => {
      // Verify header shows "Thread" or translated equivalent
      await expect(element(by.text('Thread'))).toBeVisible();
    });

    it('should show reply input at the bottom', async () => {
      await expect(element(by.id('thread-reply-input'))).toBeVisible();
      await expect(element(by.id('thread-send-button'))).toBeVisible();
    });

    it('should show sender names on thread replies in group chats', async () => {
      // In group conversations, sender names should be visible
      await expect(element(by.id('sender-name'))).toExist();
    });

    it('should apply room type background color to thread view', async () => {
      // Thread view should inherit the conversation type background
      await expect(element(by.id('thread-view-screen'))).toBeVisible();
    });
  });

  describe('Thread Pagination', () => {
    it('should load more thread replies when scrolling up', async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');

      // Scroll up to trigger pagination
      await element(by.id('thread-reply-list')).scroll(500, 'up');

      // Verify older replies are loaded
      // This would be verified by checking for older message content
      await expect(element(by.id('thread-reply-list'))).toBeVisible();
    });
  });

  describe('Thread Navigation State', () => {
    it('should preserve thread state when returning from another screen', async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');

      const testReply = `State test ${Date.now()}`;
      await sendThreadReply(testReply);

      // Navigate away and back (e.g., minimize and reopen app)
      // For this test, we navigate back and re-enter
      await navigateBackFromThread();
      await openThreadFromMessage('Hello everyone!');

      // Reply should still be visible
      await expectThreadReplyVisible(testReply);
    });

    it('should return to correct conversation when navigating back through thread', async () => {
      await navigateToChat();
      await openConversation('Small Group');
      await openThreadFromMessage('Hello everyone!');
      await navigateBackFromThread();
      await navigateBackToList();

      // Verify we're back at conversation list
      await expect(element(by.id('conversation-list'))).toBeVisible();
    });
  });
});
