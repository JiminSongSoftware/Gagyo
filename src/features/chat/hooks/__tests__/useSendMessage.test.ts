/**
 * Unit tests for useSendMessage hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSendMessage, useSendReply } from '../useSendMessage';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useSendMessage', () => {
  const mockConversationId = 'conversation-123';
  const mockTenantId = 'tenant-456';
  const mockSenderMembershipId = 'membership-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() =>
      useSendMessage(mockConversationId, mockTenantId, mockSenderMembershipId)
    );

    expect(result.current.sending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should not send when conversationId is null', async () => {
    const { result } = renderHook(() => useSendMessage(null, mockTenantId, mockSenderMembershipId));

    await act(async () => {
      const response = await result.current.sendMessage('Hello');
      expect(response).toBeNull();
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should not send when tenantId is null', async () => {
    const { result } = renderHook(() =>
      useSendMessage(mockConversationId, null, mockSenderMembershipId)
    );

    await act(async () => {
      const response = await result.current.sendMessage('Hello');
      expect(response).toBeNull();
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should not send when senderMembershipId is null', async () => {
    const { result } = renderHook(() => useSendMessage(mockConversationId, mockTenantId, null));

    await act(async () => {
      const response = await result.current.sendMessage('Hello');
      expect(response).toBeNull();
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should send a text message successfully', async () => {
    const mockMessage = {
      id: 'new-msg-1',
      tenant_id: mockTenantId,
      conversation_id: mockConversationId,
      sender_id: mockSenderMembershipId,
      parent_id: null,
      content: 'Hello!',
      content_type: 'text',
      is_event_chat: false,
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      deleted_at: null,
      sender: {
        id: mockSenderMembershipId,
        user: {
          id: 'user-123',
          display_name: 'Test User',
          photo_url: null,
        },
      },
    };

    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockMessage,
            error: null,
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendMessage(mockConversationId, mockTenantId, mockSenderMembershipId)
    );

    let sentMessage;
    await act(async () => {
      sentMessage = await result.current.sendMessage('Hello!');
    });

    expect(sentMessage).toEqual(mockMessage);
    expect(mockFrom).toHaveBeenCalledWith('messages');
  });

  it('should handle send errors gracefully', async () => {
    const mockError = new Error('Failed to send message');

    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendMessage(mockConversationId, mockTenantId, mockSenderMembershipId)
    );

    await act(async () => {
      const response = await result.current.sendMessage('Hello!');
      expect(response).toBeNull();
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should set sending state while sending', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(
                  () =>
                    resolve({
                      data: { id: 'msg-1' },
                      error: null,
                    }),
                  100
                )
              )
          ),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendMessage(mockConversationId, mockTenantId, mockSenderMembershipId)
    );

    expect(result.current.sending).toBe(false);

    act(() => {
      void result.current.sendMessage('Hello!');
    });

    // Should be sending immediately after call
    expect(result.current.sending).toBe(true);

    await waitFor(() => {
      expect(result.current.sending).toBe(false);
    });
  });

  it('should include tenant_id in message payload', async () => {
    const insertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'msg-1' },
          error: null,
        }),
      }),
    });

    const mockFrom = jest.fn().mockReturnValue({
      insert: insertMock,
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendMessage(mockConversationId, mockTenantId, mockSenderMembershipId)
    );

    await act(async () => {
      await result.current.sendMessage('Hello!');
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: mockTenantId,
        conversation_id: mockConversationId,
        sender_id: mockSenderMembershipId,
        content: 'Hello!',
        content_type: 'text',
      })
    );
  });
});

describe('useSendReply', () => {
  const mockConversationId = 'conversation-123';
  const mockTenantId = 'tenant-456';
  const mockSenderMembershipId = 'membership-789';
  const mockParentMessageId = 'parent-msg-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() =>
      useSendReply(mockConversationId, mockTenantId, mockSenderMembershipId, mockParentMessageId)
    );

    expect(result.current.sending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.sendReply).toBe('function');
  });

  it('should include parent_message_id in reply payload', async () => {
    const insertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'reply-1' },
          error: null,
        }),
      }),
    });

    const mockFrom = jest.fn().mockReturnValue({
      insert: insertMock,
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendReply(mockConversationId, mockTenantId, mockSenderMembershipId, mockParentMessageId)
    );

    await act(async () => {
      await result.current.sendReply('Reply text');
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_id: mockParentMessageId,
        content: 'Reply text',
      })
    );
  });

  it('should not send reply when parentMessageId is null', async () => {
    const { result } = renderHook(() =>
      useSendReply(mockConversationId, mockTenantId, mockSenderMembershipId, null)
    );

    await act(async () => {
      const response = await result.current.sendReply('Reply');
      expect(response).toBeNull();
    });

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should reject replying to a reply (nested thread)', async () => {
    // Mock parent message that already has a parent_id (it's a reply)
    const mockParentIsReply = {
      parent_id: 'grandparent-msg-123', // This message is already a reply
    };

    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockParentIsReply,
            error: null,
          }),
        }),
      }),
    });

    const mockFrom = jest.fn().mockReturnValue({
      select: selectMock,
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendReply(mockConversationId, mockTenantId, mockSenderMembershipId, mockParentMessageId)
    );

    await act(async () => {
      try {
        await result.current.sendReply('Nested reply attempt');
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error?.message).toBe('Cannot reply to a reply');
  });

  it('should allow replying to a top-level message', async () => {
    // Mock parent message that is a top-level message (parent_id is null)
    const mockParentIsTopLevel = {
      parent_id: null, // This message is a top-level message
    };

    const mockReply = {
      id: 'reply-1',
      tenant_id: mockTenantId,
      conversation_id: mockConversationId,
      sender_id: mockSenderMembershipId,
      parent_id: mockParentMessageId,
      content: 'Valid reply',
      content_type: 'text',
      is_event_chat: false,
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      deleted_at: null,
      sender: {
        id: mockSenderMembershipId,
        user: {
          id: 'user-123',
          display_name: 'Test User',
          photo_url: null,
        },
      },
    };

    // First call: check parent message's parent_id
    const selectParentMock = jest.fn().mockResolvedValue({
      data: mockParentIsTopLevel,
      error: null,
    });

    // Second call: insert the reply
    const insertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockReply,
          error: null,
        }),
      }),
    });

    let callCount = 0;
    const mockFrom = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: checking parent message
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: selectParentMock,
              }),
            }),
          }),
        };
      }
      // Subsequent calls: insert
      return {
        insert: insertMock,
      };
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendReply(mockConversationId, mockTenantId, mockSenderMembershipId, mockParentMessageId)
    );

    let sentReply;
    await act(async () => {
      sentReply = await result.current.sendReply('Valid reply');
    });

    expect(sentReply).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle error when verifying parent message', async () => {
    const verifyError = new Error('Failed to fetch parent');

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: verifyError,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useSendReply(mockConversationId, mockTenantId, mockSenderMembershipId, mockParentMessageId)
    );

    await act(async () => {
      try {
        await result.current.sendReply('Reply');
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error?.message).toBe('Failed to verify parent message');
  });
});
