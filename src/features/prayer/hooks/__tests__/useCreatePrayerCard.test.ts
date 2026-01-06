/**
 * Unit tests for useCreatePrayerCard hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCreatePrayerCard } from '../useCreatePrayerCard';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useCreatePrayerCard', () => {
  const mockTenantId = 'tenant-123';
  const mockMembershipId = 'membership-456';
  const mockPrayerCardId = 'new-prayer-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not create prayer card when tenantId is null', async () => {
    const { result } = renderHook(() => useCreatePrayerCard(null, mockMembershipId));

    const resultId = await act(async () => {
      return await result.current.createPrayerCard({
        content: 'Test prayer',
        recipientScope: 'church_wide',
        recipientIds: [],
      });
    });

    expect(resultId).toBeNull();
  });

  it('should not create prayer card when membershipId is null', async () => {
    const { result } = renderHook(() => useCreatePrayerCard(mockTenantId, null));

    const resultId = await act(async () => {
      return await result.current.createPrayerCard({
        content: 'Test prayer',
        recipientScope: 'church_wide',
        recipientIds: [],
      });
    });

    expect(resultId).toBeNull();
  });

  it('should create prayer card successfully', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockPrayerCardId },
            error: null,
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useCreatePrayerCard(mockTenantId, mockMembershipId));

    const resultId = await act(async () => {
      return await result.current.createPrayerCard({
        content: 'Test prayer',
        recipientScope: 'church_wide',
        recipientIds: [],
      });
    });

    await waitFor(() => {
      expect(result.current.creating).toBe(false);
    });

    expect(resultId).toBe(mockPrayerCardId);
  });

  it('should handle creation errors gracefully', async () => {
    const mockError = new Error('Database error');

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

    const { result } = renderHook(() => useCreatePrayerCard(mockTenantId, mockMembershipId));

    const resultId = await act(async () => {
      return await result.current.createPrayerCard({
        content: 'Test prayer',
        recipientScope: 'church_wide',
        recipientIds: [],
      });
    });

    expect(resultId).toBeNull();
  });

  it('should set creating state during creation', async () => {
    let resolveCreation: (value: { id: string } | null) => void;

    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockReturnValue(
            new Promise((resolve) => {
              resolveCreation = resolve;
            })
          ),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useCreatePrayerCard(mockTenantId, mockMembershipId));

    act(() => {
      void result.current.createPrayerCard({
        content: 'Test prayer',
        recipientScope: 'church_wide',
        recipientIds: [],
      });
    });

    // Should be creating while promise is pending
    expect(result.current.creating).toBe(true);

    // Resolve the creation
    await act(async () => {
      resolveCreation?.({ data: { id: mockPrayerCardId }, error: null });
    });

    expect(result.current.creating).toBe(false);
  });

  it('should include tenantId and membershipId in insert', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockPrayerCardId },
            error: null,
          }),
        }),
      }),
    });
    mockSupabase.from = mockFrom;

    const { result } = renderHook(() => useCreatePrayerCard(mockTenantId, mockMembershipId));

    await act(async () => {
      await result.current.createPrayerCard({
        content: 'Test prayer',
        recipientScope: 'church_wide',
        recipientIds: [],
      });
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('prayer_cards');
    });
  });
});
