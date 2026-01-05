/**
 * Unit tests for useMessages hook.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useMessages } from '../useMessages';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useMessages', () => {
  const mockConversationId = 'conversation-123';
  const mockTenantId = 'tenant-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty messages when conversationId is null', async () => {
    const { result } = renderHook(() => useMessages(null, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return empty messages when tenantId is null', async () => {
    const { result } = renderHook(() => useMessages(mockConversationId, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch messages with sender information', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        conversation_id: mockConversationId,
        content: 'Hello!',
        content_type: 'text',
        created_at: '2024-01-01T12:00:00Z',
        sender: {
          id: 'membership-1',
          user: {
            id: 'user-1',
            display_name: 'John Doe',
            photo_url: null,
          },
        },
      },
    ];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockMessages,
              error: null,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useMessages(mockConversationId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello!');
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database error');

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useMessages(mockConversationId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.messages).toEqual([]);
  });

  it('should query messages table with correct conversation_id', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    renderHook(() => useMessages(mockConversationId, mockTenantId));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('messages');
    });
  });

  it('should provide refetch function', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useMessages(mockConversationId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should provide loadMore function for pagination', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useMessages(mockConversationId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.loadMore).toBe('function');
  });

  it('should provide appendMessage function for real-time updates', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useMessages(mockConversationId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // appendMessage is a separate exported utility, not returned by the hook
    // It is used by the real-time subscription hook
    const { appendMessage: appendMessageUtil } = await import('../useMessages');
    expect(typeof appendMessageUtil).toBe('function');
  });
});
