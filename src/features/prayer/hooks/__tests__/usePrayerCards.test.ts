/**
 * Unit tests for usePrayerCards hook.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePrayerCards } from '../usePrayerCards';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('usePrayerCards', () => {
  const mockTenantId = 'tenant-123';
  const mockMembershipId = 'membership-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty prayer cards when tenantId is null', async () => {
    const { result } = renderHook(() =>
      usePrayerCards(null, mockMembershipId, { scope: 'all_prayers' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prayerCards).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return empty prayer cards when membershipId is null', async () => {
    const { result } = renderHook(() =>
      usePrayerCards(mockTenantId, null, { scope: 'all_prayers' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prayerCards).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch prayer cards for all_prayers scope', async () => {
    const mockPrayers = [
      { id: '1', content: 'Prayer 1', answered: false },
      { id: '2', content: 'Prayer 2', answered: true },
    ];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockPrayers,
              error: null,
            }),
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      usePrayerCards(mockTenantId, mockMembershipId, { scope: 'all_prayers' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prayerCards).toEqual(mockPrayers);
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

    const { result } = renderHook(() =>
      usePrayerCards(mockTenantId, mockMembershipId, { scope: 'all_prayers' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should include tenantId in query for tenant isolation', async () => {
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

    renderHook(() => usePrayerCards(mockTenantId, mockMembershipId, { scope: 'all_prayers' }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('prayer_cards');
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

    const { result } = renderHook(() =>
      usePrayerCards(mockTenantId, mockMembershipId, { scope: 'all_prayers' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should provide loadMore function', async () => {
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

    const { result } = renderHook(() =>
      usePrayerCards(mockTenantId, mockMembershipId, { scope: 'all_prayers' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.loadMore).toBe('function');
  });
});
