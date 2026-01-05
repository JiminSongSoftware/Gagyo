/**
 * Unit tests for useMessageSubscription hook.
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  useMessageSubscription,
  useConversationListSubscription,
} from '../useMessageSubscription';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
const mockSubscribe = jest.fn();
const mockOn = jest.fn();
const mockRemoveChannel = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: mockOn.mockReturnThis(),
      subscribe: mockSubscribe,
    })),
    removeChannel: mockRemoveChannel,
  },
}));

describe('useMessageSubscription', () => {
  const mockConversationId = 'conversation-123';
  const mockTenantId = 'tenant-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockImplementation((callback) => {
      callback('SUBSCRIBED');
      return { unsubscribe: jest.fn() };
    });
  });

  it('should not subscribe when conversationId is null', () => {
    const callbacks = {
      onInsert: jest.fn(),
    };

    renderHook(() => useMessageSubscription(null, mockTenantId, callbacks));

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('should not subscribe when tenantId is null', () => {
    const callbacks = {
      onInsert: jest.fn(),
    };

    renderHook(() =>
      useMessageSubscription(mockConversationId, null, callbacks)
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('should subscribe to messages channel when both IDs are provided', () => {
    const callbacks = {
      onInsert: jest.fn(),
    };

    renderHook(() =>
      useMessageSubscription(mockConversationId, mockTenantId, callbacks)
    );

    expect(supabase.channel).toHaveBeenCalledWith(
      `messages:${mockConversationId}`
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${mockConversationId}`,
      }),
      expect.any(Function)
    );
  });

  it('should provide unsubscribe function', () => {
    const callbacks = {
      onInsert: jest.fn(),
    };

    const { result } = renderHook(() =>
      useMessageSubscription(mockConversationId, mockTenantId, callbacks)
    );

    expect(typeof result.current.unsubscribe).toBe('function');
  });

  it('should cleanup subscription on unmount', () => {
    const callbacks = {
      onInsert: jest.fn(),
    };

    const { unmount } = renderHook(() =>
      useMessageSubscription(mockConversationId, mockTenantId, callbacks)
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('should resubscribe when conversationId changes', () => {
    const callbacks = {
      onInsert: jest.fn(),
    };

    const { rerender } = renderHook(
      ({ conversationId }) =>
        useMessageSubscription(conversationId, mockTenantId, callbacks),
      { initialProps: { conversationId: mockConversationId } }
    );

    expect(supabase.channel).toHaveBeenCalledTimes(1);

    rerender({ conversationId: 'new-conversation-456' });

    // Should have removed old channel and created new one
    expect(mockRemoveChannel).toHaveBeenCalled();
    expect(supabase.channel).toHaveBeenCalledWith('messages:new-conversation-456');
  });
});

describe('useConversationListSubscription', () => {
  const mockMembershipId = 'membership-123';
  const mockTenantId = 'tenant-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockImplementation((callback) => {
      callback('SUBSCRIBED');
      return { unsubscribe: jest.fn() };
    });
  });

  it('should not subscribe when membershipId is null', () => {
    const callbacks = {
      onNewMessage: jest.fn(),
    };

    renderHook(() =>
      useConversationListSubscription(null, mockTenantId, callbacks)
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('should not subscribe when tenantId is null', () => {
    const callbacks = {
      onNewMessage: jest.fn(),
    };

    renderHook(() =>
      useConversationListSubscription(mockMembershipId, null, callbacks)
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('should subscribe to conversation list channel', () => {
    const callbacks = {
      onNewMessage: jest.fn(),
    };

    renderHook(() =>
      useConversationListSubscription(mockMembershipId, mockTenantId, callbacks)
    );

    expect(supabase.channel).toHaveBeenCalledWith(
      `conversation-list:${mockMembershipId}`
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }),
      expect.any(Function)
    );
  });

  it('should provide unsubscribe function', () => {
    const callbacks = {
      onNewMessage: jest.fn(),
    };

    const { result } = renderHook(() =>
      useConversationListSubscription(mockMembershipId, mockTenantId, callbacks)
    );

    expect(typeof result.current.unsubscribe).toBe('function');
  });
});
