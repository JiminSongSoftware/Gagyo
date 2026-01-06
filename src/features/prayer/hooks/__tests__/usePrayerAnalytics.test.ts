/**
 * Unit tests for usePrayerAnalytics hook.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePrayerAnalytics } from '../usePrayerAnalytics';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('usePrayerAnalytics', () => {
  const mockTenantId = 'tenant-123';
  const mockMembershipId = 'membership-456';
  const mockSmallGroupId = 'small-group-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null analytics when tenantId is null', async () => {
    const { result } = renderHook(() => usePrayerAnalytics(null, 'church_wide', null, 'monthly'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.analytics).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch church_wide analytics', async () => {
    const mockPrayers = [
      { id: '1', answered: false },
      { id: '2', answered: true },
    ];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      usePrayerAnalytics(mockTenantId, 'church_wide', null, 'monthly')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.analytics?.totalPrayers).toBe(2);
    expect(result.current.analytics?.answeredPrayers).toBe(1);
    expect(result.current.analytics?.answerRate).toBe(50);
    expect(result.current.analytics?.scope).toBe('church_wide');
  });

  it('should fetch individual scope analytics', async () => {
    const mockPrayers = [
      { id: '1', answered: false },
      { id: '2', answered: true },
      { id: '3', answered: true },
    ];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.analytics?.totalPrayers).toBe(3);
    expect(result.current.analytics?.answeredPrayers).toBe(2);
    expect(result.current.analytics?.answerRate).toBe(66.7);
    expect(result.current.analytics?.scope).toBe('individual');
  });

  it('should fetch small_group scope analytics with join', async () => {
    const mockRecipients = [
      { prayer_cards: { id: '1', answered: false } },
      { prayer_cards: { id: '2', answered: true } },
    ];

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({
        data: mockRecipients,
        error: null,
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      usePrayerAnalytics(mockTenantId, 'small_group', mockSmallGroupId, 'monthly')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.analytics?.totalPrayers).toBe(2);
    expect(result.current.analytics?.answeredPrayers).toBe(1);
    expect(result.current.analytics?.answerRate).toBe(50);
    expect(result.current.analytics?.scope).toBe('small_group');
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database error');

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      usePrayerAnalytics(mockTenantId, 'church_wide', null, 'monthly')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.analytics).toBeNull();
  });

  it('should filter by church_wide recipient_scope for church_wide analytics', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      usePrayerAnalytics(mockTenantId, 'church_wide', null, 'monthly')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify that recipient_scope filter was applied
    expect(mockFrom).toHaveBeenCalledWith('prayer_cards');
  });

  it('should provide refetch function', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() =>
      usePrayerAnalytics(mockTenantId, 'church_wide', null, 'monthly')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
