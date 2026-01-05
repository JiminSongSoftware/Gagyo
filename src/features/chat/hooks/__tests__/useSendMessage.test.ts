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
      conversation_id: mockConversationId,
      tenant_id: mockTenantId,
      sender_membership_id: mockSenderMembershipId,
      content: 'Hello!',
      content_type: 'text',
      created_at: '2024-01-01T12:00:00Z',
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
        sender_membership_id: mockSenderMembershipId,
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
        parent_message_id: mockParentMessageId,
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
});
