/**
 * MessageList component tests.
 *
 * Tests the MessageList component behavior, specifically:
 * - Tab minimization scroll should not cause visual jumps
 * - Tab minimization scroll should not trigger pagination
 */

import { render, act, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import { I18nextProvider } from 'react-i18next';
import { MessageList } from '../MessageList';
import i18n, { initI18n } from '@/i18n';
import type { MessageWithSender } from '@/types/database';
import { useChatStore } from '@/features/chat/store/chatStore';

// Mock the chat store
jest.mock('@/features/chat/store/chatStore');

const mockUseChatStore = useChatStore as jest.MockedFunction<typeof useChatStore>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider>
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  </TamaguiProvider>
);

const mockMessages: MessageWithSender[] = [
  {
    id: '1',
    content: 'First message',
    sender_id: 'user1',
    conversation_id: 'conv1',
    created_at: '2025-01-13T00:00:00Z',
    updated_at: '2025-01-13T00:00:00Z',
    sender: {
      id: 'user1',
      nickname: 'User One',
      profile_image_url: null,
    },
  },
  {
    id: '2',
    content: 'Second message',
    sender_id: 'user2',
    conversation_id: 'conv1',
    created_at: '2025-01-13T01:00:00Z',
    updated_at: '2025-01-13T01:00:00Z',
    sender: {
      id: 'user2',
      nickname: 'User Two',
      profile_image_url: null,
    },
  },
  {
    id: '3',
    content: 'Third message',
    sender_id: 'user1',
    conversation_id: 'conv1',
    created_at: '2025-01-13T02:00:00Z',
    updated_at: '2025-01-13T02:00:00Z',
    sender: {
      id: 'user1',
      nickname: 'User One',
      profile_image_url: null,
    },
  },
];

describe('MessageList', () => {
  beforeAll(async () => {
    await initI18n();
    mockUseChatStore.mockReturnValue({
      selectedMessage: null,
    } as unknown as ReturnType<typeof useChatStore>);
  });

  beforeEach(() => {
    mockUseChatStore.mockReturnValue({
      selectedMessage: null,
    } as unknown as ReturnType<typeof useChatStore>);
  });

  describe('scrollToTop', () => {
    it('should not trigger pagination when called for tab minimization', async () => {
      const onLoadMoreMock = jest.fn();
      const ref = React.createRef<MessageList.MessageListHandle>();

      render(
        <MessageList
          ref={ref}
          messages={mockMessages}
          loading={false}
          error={null}
          conversationType="group"
          currentUserId="user1"
          onLoadMore={onLoadMoreMock}
          hasMore={true}
          loadingMore={false}
        />,
        { wrapper }
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      // Call scrollToTop to trigger tab minimization
      await act(async () => {
        ref.current?.scrollToTop();
      });

      // onLoadMore should NOT be called during scrollToTop
      // This verifies that programmatic scroll for tab minimization
      // does not enter the "near top" zone that triggers pagination
      expect(onLoadMoreMock).not.toHaveBeenCalled();
    });

    it('should not cause visual jump by scrolling to position 0', async () => {
      const ref = React.createRef<MessageList.MessageListHandle>();
      const scrollViewSpy = jest.fn();

      // Spy on ScrollView's scrollTo method
      const originalScrollTo = ScrollView.prototype.scrollTo;
      ScrollView.prototype.scrollTo = scrollViewSpy;

      try {
        render(
          <MessageList
            ref={ref}
            messages={mockMessages}
            loading={false}
            error={null}
            conversationType="group"
            currentUserId="user1"
            hasMore={true}
            loadingMore={false}
          />,
          { wrapper }
        );

        await waitFor(() => {
          expect(ref.current).toBeTruthy();
        });

        // Clear any initial scroll calls
        scrollViewSpy.mockClear();

        // Call scrollToTop
        await act(async () => {
          ref.current?.scrollToTop();
        });

        // Check the scroll calls
        // The implementation should:
        // 1. Get current position (not scroll to 0)
        // 2. Apply small downward scroll from current position
        // 3. Return to original position
        const scrollCalls = scrollViewSpy.mock.calls.map((call) => call[0]);

        // Verify that we don't have y: 0 as the final resting position
        // which would cause a visual jump
        const finalCall = scrollCalls[scrollCalls.length - 1];

        // The final scroll should not be to position 0 (which jumps to top)
        // It should either stay at or return to the user's reading position
        expect(finalCall?.y).not.toBe(0);
      } finally {
        // Restore original method
        ScrollView.prototype.scrollTo = originalScrollTo;
      }
    });

    it('should use minimal downward scroll from current position', async () => {
      const ref = React.createRef<MessageList.MessageListHandle>();
      const scrollViewSpy = jest.fn();

      const originalScrollTo = ScrollView.prototype.scrollTo;
      ScrollView.prototype.scrollTo = scrollViewSpy;

      try {
        render(
          <MessageList
            ref={ref}
            messages={mockMessages}
            loading={false}
            error={null}
            conversationType="group"
            currentUserId="user1"
            hasMore={true}
            loadingMore={false}
          />,
          { wrapper }
        );

        await waitFor(() => {
          expect(ref.current).toBeTruthy();
        });

        scrollViewSpy.mockClear();

        await act(async () => {
          ref.current?.scrollToTop();
        });

        const scrollCalls = scrollViewSpy.mock.calls.map((call) => call[0]);

        // Should have a small downward scroll (40-60px from current)
        // This is what triggers the "onScrollDown" minimize behavior
        const hasSmallDownwardScroll = scrollCalls.some((call) => call.y > 0 && call.y <= 100);

        expect(hasSmallDownwardScroll).toBe(true);
      } finally {
        ScrollView.prototype.scrollTo = originalScrollTo;
      }
    });

    it('should prevent pagination when near top but scroll is programmatic', async () => {
      const onLoadMoreMock = jest.fn();
      const ref = React.createRef<MessageList.MessageListHandle>();

      render(
        <MessageList
          ref={ref}
          messages={mockMessages}
          loading={false}
          error={null}
          conversationType="group"
          currentUserId="user1"
          onLoadMore={onLoadMoreMock}
          hasMore={true}
          loadingMore={false}
        />,
        { wrapper }
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      // Call scrollToTop multiple times rapidly
      await act(async () => {
        ref.current?.scrollToTop();
        ref.current?.scrollToTop();
        ref.current?.scrollToTop();
      });

      // onLoadMore should never be called for programmatic scrolls
      // even though the scroll might pass through the "near top" zone
      expect(onLoadMoreMock).not.toHaveBeenCalled();
    });
  });
});
