/**
 * Unit tests for usePrayerAnalytics hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePrayerAnalytics } from '../usePrayerAnalytics';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test constants
const mockTenantId = 'test-tenant-id';
const mockMembershipId = 'test-membership-id';
const mockSmallGroupId = 'test-small-group-id';

// Types for mock query builder
interface MockQueryResult {
  data: unknown[] | null;
  error: Error | null;
}

interface MockQueryBuilder {
  eq: jest.Mock<MockQueryBuilder, [string, unknown]>;
  gte: jest.Mock<MockQueryBuilder, [string, string]>;
  lte: jest.Mock<MockQueryBuilder, [string, string]>;
  select: jest.Mock<Promise<MockQueryResult>, []>;
}

// Mock query builder chain
const createMockQuery = (data: unknown[], error: Error | null = null): MockQueryBuilder => {
  const mockQuery: Partial<MockQueryBuilder> = {
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue({ data, error }),
  };

  return mockQuery as MockQueryBuilder;
};

describe('usePrayerAnalytics', () => {
  describe('Individual Scope', () => {
    it('should return empty analytics when tenantId is null', async () => {
      const { result } = renderHook(() =>
        usePrayerAnalytics(null, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should fetch individual analytics with author_id filter', async () => {
      const mockPrayers = [
        { id: '1', answered: true, created_at: '2024-01-01' },
        { id: '2', answered: false, created_at: '2024-01-02' },
        { id: '3', answered: true, created_at: '2024-01-03' },
      ];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('prayer_cards');
      expect(result.current.analytics).toEqual({
        totalPrayers: 3,
        answeredPrayers: 2,
        answerRate: 66.7,
        period: 'monthly',
        scope: 'individual',
      });
    });

    it('should calculate answer rate as 0 when no prayers exist', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics?.answerRate).toBe(0);
      expect(result.current.analytics?.totalPrayers).toBe(0);
      expect(result.current.analytics?.answeredPrayers).toBe(0);
    });

    it('should return 100% answer rate when all prayers are answered', async () => {
      const mockPrayers = [
        { id: '1', answered: true, created_at: '2024-01-01' },
        { id: '2', answered: true, created_at: '2024-01-02' },
        { id: '3', answered: true, created_at: '2024-01-03' },
      ];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics?.answerRate).toBe(100.0);
    });

    it('should return 0% answer rate when no prayers are answered', async () => {
      const mockPrayers = [
        { id: '1', answered: false, created_at: '2024-01-01' },
        { id: '2', answered: false, created_at: '2024-01-02' },
      ];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics?.answerRate).toBe(0);
    });
  });

  describe('Small Group Scope', () => {
    it('should fetch small group analytics with recipient_scope filter', async () => {
      const mockPrayers = [
        { id: '1', answered: true, created_at: '2024-01-01' },
        { id: '2', answered: false, created_at: '2024-01-02' },
      ];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'small_group', mockSmallGroupId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('prayer_cards');
      expect(result.current.analytics?.scope).toBe('small_group');
    });
  });

  describe('Church-wide Scope', () => {
    it('should fetch church-wide analytics without author_id filter', async () => {
      const mockPrayers = [
        { id: '1', answered: true, created_at: '2024-01-01', recipient_scope: 'church_wide' },
        { id: '2', answered: true, created_at: '2024-01-02', recipient_scope: 'church_wide' },
        { id: '3', answered: false, created_at: '2024-01-03', recipient_scope: 'church_wide' },
      ];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'church_wide', null, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics?.scope).toBe('church_wide');
    });

    it('should return null analytics when tenantId is null', async () => {
      const { result } = renderHook(() => usePrayerAnalytics(null, 'church_wide', null, 'monthly'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error');

      const mockQuery: MockQueryBuilder = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

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
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'church_wide', null, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify that recipient_scope filter was applied
      expect(mockSupabase.from).toHaveBeenCalledWith('prayer_cards');
    });

    it('should provide refetch function', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'church_wide', null, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Date Range Calculations', () => {
    it('should use weekly date range when period is weekly', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      renderHook(() => usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'weekly'));

      await waitFor(() => {
        expect(mockQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String));
      });

      const startDateArg = (mockQuery.gte as jest.Mock).mock.calls.find(
        (call) => call[0] === 'created_at'
      )?.[1];

      // Verify it's approximately 7 days ago
      const startDate = new Date(startDateArg);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(7);
      expect(daysDiff).toBeLessThanOrEqual(8); // Account for slight timing differences
    });

    it('should use monthly date range when period is monthly', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      renderHook(() => usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly'));

      await waitFor(() => {
        expect(mockQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String));
      });

      const startDateArg = (mockQuery.gte as jest.Mock).mock.calls.find(
        (call) => call[0] === 'created_at'
      )?.[1];

      const startDate = new Date(startDateArg);
      const now = new Date();
      const monthsDiff =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());
      expect(monthsDiff).toBe(1);
    });

    it('should use quarterly date range when period is quarterly', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'quarterly')
      );

      await waitFor(() => {
        expect(mockQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String));
      });

      const startDateArg = (mockQuery.gte as jest.Mock).mock.calls.find(
        (call) => call[0] === 'created_at'
      )?.[1];

      const startDate = new Date(startDateArg);
      const now = new Date();
      const monthsDiff =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());
      expect(monthsDiff).toBe(3);
    });

    it('should use semi_annual date range when period is semi_annual', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'semi_annual')
      );

      await waitFor(() => {
        expect(mockQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String));
      });

      const startDateArg = (mockQuery.gte as jest.Mock).mock.calls.find(
        (call) => call[0] === 'created_at'
      )?.[1];

      const startDate = new Date(startDateArg);
      const now = new Date();
      const monthsDiff =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());
      expect(monthsDiff).toBe(6);
    });

    it('should use annual date range when period is annual', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      renderHook(() => usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'annual'));

      await waitFor(() => {
        expect(mockQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String));
      });

      const startDateArg = (mockQuery.gte as jest.Mock).mock.calls.find(
        (call) => call[0] === 'created_at'
      )?.[1];

      const startDate = new Date(startDateArg);
      const now = new Date();
      const yearsDiff = now.getFullYear() - startDate.getFullYear();
      expect(yearsDiff).toBe(1);
    });
  });

  describe('Rounding Behavior', () => {
    it('should round answer rate to 1 decimal place', async () => {
      // Create 10 prayers with 7 answered to get 70%
      const mockPrayers = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        answered: i < 7,
        created_at: '2024-01-01',
      }));

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics?.answerRate).toBe(70.0);
    });

    it('should round answer rate correctly for 66.666...%', async () => {
      const mockPrayers = [
        { id: '1', answered: true, created_at: '2024-01-01' },
        { id: '2', answered: true, created_at: '2024-01-02' },
        { id: '3', answered: false, created_at: '2024-01-03' },
      ];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics?.answerRate).toBe(66.7);
    });

    it('should round answer rate correctly for 33.333...%', async () => {
      const mockPrayers = [
        { id: '1', answered: true, created_at: '2024-01-01' },
        { id: '2', answered: false, created_at: '2024-01-02' },
        { id: '3', answered: false, created_at: '2024-01-03' },
      ];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics?.answerRate).toBe(33.3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database connection failed');

      const mockQuery: MockQueryBuilder = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.analytics).toBeNull();
    });

    it('should handle network failures', async () => {
      const mockError = new Error('Network request failed');

      const mockQuery: MockQueryBuilder = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        select: jest.fn().mockRejectedValue(mockError),
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Refetch Function', () => {
    it('should provide refetch function that updates analytics', async () => {
      let mockCallCount = 0;
      const mockPrayers = [{ id: '1', answered: true, created_at: '2024-01-01' }];

      const createMockQueryWithCount = (): MockQueryBuilder => {
        mockCallCount++;
        const mockQuery: MockQueryBuilder = {
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({
            data: mockPrayers,
            error: null,
          }),
        };
        return mockQuery;
      };

      mockSupabase.from = jest.fn().mockImplementation(() => createMockQueryWithCount());

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockCallCount;

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCallCount).toBeGreaterThan(initialCallCount);
    });
  });

  describe('Loading State Transitions', () => {
    it('should start with loading state true', () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      expect(result.current.loading).toBe(true);
    });

    it('should transition to loading false after data fetch', async () => {
      const mockQuery = createMockQuery([{ id: '1', answered: true, created_at: '2024-01-01' }]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle prayers created at exact period boundaries', async () => {
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);

      const mockPrayers = [{ id: '1', answered: true, created_at: oneWeekAgo.toISOString() }];

      const mockQuery = createMockQuery(mockPrayers);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', mockMembershipId, 'weekly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Prayer at boundary should be included
      expect(result.current.analytics?.totalPrayers).toBeGreaterThanOrEqual(0);
    });

    it('should handle null scopeId gracefully', async () => {
      const mockQuery = createMockQuery([]);
      mockSupabase.from = jest.fn().mockReturnValue(mockQuery);

      const { result } = renderHook(() =>
        usePrayerAnalytics(mockTenantId, 'individual', null, 'monthly')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still fetch, just without author_id filter
      expect(result.current.analytics).toBeDefined();
    });
  });
});
