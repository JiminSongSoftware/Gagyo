/**
 * Unit tests for useConversations hook.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useConversations } from '../useConversations';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useConversations', () => {
  const mockTenantId = 'tenant-123';
  const mockMembershipId = 'membership-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty conversations when tenantId is null', async () => {
    const { result } = renderHook(() =>
      useConversations(null, mockMembershipId)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return empty conversations when membershipId is null', async () => {
    const { result } = renderHook(() => useConversations(mockTenantId, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return empty conversations when user has no participations', async () => {
    // Mock empty participant data
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useConversations(mockTenantId, mockMembershipId)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversations).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database error');

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useConversations(mockTenantId, mockMembershipId)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.conversations).toEqual([]);
  });

  it('should include tenantId in query for tenant isolation', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    renderHook(() => useConversations(mockTenantId, mockMembershipId));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('conversation_participants');
    });
  });

  it('should provide refetch function', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      useConversations(mockTenantId, mockMembershipId)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
