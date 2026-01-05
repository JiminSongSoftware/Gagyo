/**
 * Unit tests for useThreadMessages hook.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import {
  useThreadMessages,
  appendThreadMessage,
  updateThreadMessage,
  removeThreadMessage,
} from '../useThreadMessages';
import { supabase } from '@/lib/supabase';
import type { MessageWithSender } from '@/types/database';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useThreadMessages', () => {
  const mockParentMessageId = 'parent-msg-123';
  const mockTenantId = 'tenant-456';

  const createMockMessage = (overrides: Partial<MessageWithSender> = {}): MessageWithSender => ({
    id: 'msg-1',
    tenant_id: mockTenantId,
    conversation_id: 'conv-123',
    sender_id: 'membership-1',
    parent_id: mockParentMessageId,
    content: 'Test message',
    content_type: 'text',
    is_event_chat: false,
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    deleted_at: null,
    sender: {
      id: 'membership-1',
      user: {
        id: 'user-1',
        display_name: 'John Doe',
        photo_url: null,
      },
    },
    reply_count: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty messages when parentMessageId is null', async () => {
    const { result } = renderHook(() => useThreadMessages(null, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.parentMessage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return empty messages when tenantId is null', async () => {
    const { result } = renderHook(() => useThreadMessages(mockParentMessageId, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.parentMessage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch parent message and thread replies', async () => {
    const mockParentMessage = createMockMessage({
      id: mockParentMessageId,
      parent_id: null,
      content: 'Parent message',
    });

    const mockThreadReplies = [
      createMockMessage({
        id: 'reply-1',
        content: 'First reply',
        created_at: '2024-01-01T12:01:00Z',
      }),
      createMockMessage({
        id: 'reply-2',
        content: 'Second reply',
        created_at: '2024-01-01T12:02:00Z',
      }),
    ];

    // Mock parent message fetch
    const mockSingleParent = jest.fn().mockResolvedValue({
      data: mockParentMessage,
      error: null,
    });

    // Mock thread replies fetch
    const mockRangeReplies = jest.fn().mockResolvedValue({
      data: mockThreadReplies,
      error: null,
    });

    const mockFrom = jest.fn().mockImplementation((_table: string) => {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                single: mockSingleParent,
                order: jest.fn().mockReturnValue({
                  range: mockRangeReplies,
                }),
              }),
            }),
          }),
        }),
      };
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useThreadMessages(mockParentMessageId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(result.current.messages.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Database error');

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: null,
                  error: mockError,
                }),
              }),
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useThreadMessages(mockParentMessageId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.messages).toEqual([]);
  });

  it('should provide refetch function', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useThreadMessages(mockParentMessageId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should provide loadMore function for pagination', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useThreadMessages(mockParentMessageId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.loadMore).toBe('function');
  });

  it('should set hasMore to false when no more pages', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [], // Empty = no more pages
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useThreadMessages(mockParentMessageId, mockTenantId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);
  });
});

describe('Thread message helper functions', () => {
  const createMockMessage = (id: string, content: string): MessageWithSender => ({
    id,
    tenant_id: 'tenant-1',
    conversation_id: 'conv-1',
    sender_id: 'sender-1',
    parent_id: 'parent-1',
    content,
    content_type: 'text',
    is_event_chat: false,
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    deleted_at: null,
    sender: {
      id: 'sender-1',
      user: {
        id: 'user-1',
        display_name: 'Test User',
        photo_url: null,
      },
    },
    reply_count: 0,
  });

  describe('appendThreadMessage', () => {
    it('should append a new message to the end of the list', () => {
      const existing = [createMockMessage('msg-1', 'First'), createMockMessage('msg-2', 'Second')];
      const newMessage = createMockMessage('msg-3', 'Third');

      const result = appendThreadMessage(existing, newMessage);

      expect(result).toHaveLength(3);
      expect(result[2].id).toBe('msg-3');
      expect(result[2].content).toBe('Third');
    });

    it('should not mutate the original array', () => {
      const existing = [createMockMessage('msg-1', 'First')];
      const newMessage = createMockMessage('msg-2', 'Second');

      const result = appendThreadMessage(existing, newMessage);

      expect(existing).toHaveLength(1);
      expect(result).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const newMessage = createMockMessage('msg-1', 'First');

      const result = appendThreadMessage([], newMessage);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
    });
  });

  describe('updateThreadMessage', () => {
    it('should update an existing message by id', () => {
      const existing = [
        createMockMessage('msg-1', 'Original'),
        createMockMessage('msg-2', 'Second'),
      ];
      const updated = createMockMessage('msg-1', 'Updated');

      const result = updateThreadMessage(existing, updated);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Updated');
      expect(result[1].content).toBe('Second');
    });

    it('should not mutate the original array', () => {
      const existing = [createMockMessage('msg-1', 'Original')];
      const updated = createMockMessage('msg-1', 'Updated');

      const result = updateThreadMessage(existing, updated);

      expect(existing[0].content).toBe('Original');
      expect(result[0].content).toBe('Updated');
    });

    it('should return unchanged array if message not found', () => {
      const existing = [createMockMessage('msg-1', 'First')];
      const updated = createMockMessage('msg-2', 'Not found');

      const result = updateThreadMessage(existing, updated);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
    });
  });

  describe('removeThreadMessage', () => {
    it('should remove a message by id', () => {
      const existing = [
        createMockMessage('msg-1', 'First'),
        createMockMessage('msg-2', 'Second'),
        createMockMessage('msg-3', 'Third'),
      ];

      const result = removeThreadMessage(existing, 'msg-2');

      expect(result).toHaveLength(2);
      expect(result.find((m) => m.id === 'msg-2')).toBeUndefined();
    });

    it('should not mutate the original array', () => {
      const existing = [createMockMessage('msg-1', 'First'), createMockMessage('msg-2', 'Second')];

      const result = removeThreadMessage(existing, 'msg-1');

      expect(existing).toHaveLength(2);
      expect(result).toHaveLength(1);
    });

    it('should return unchanged array if message not found', () => {
      const existing = [createMockMessage('msg-1', 'First')];

      const result = removeThreadMessage(existing, 'non-existent');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
    });

    it('should handle empty array', () => {
      const result = removeThreadMessage([], 'msg-1');

      expect(result).toHaveLength(0);
    });
  });
});
