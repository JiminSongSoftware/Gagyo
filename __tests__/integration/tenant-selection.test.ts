/**
 * Integration tests for Tenant Selection.
 *
 * Tests the integration between Supabase queries, the useMemberships hook,
 * and the tenant selection screen.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemberships } from '@/hooks/useMemberships';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Create a wrapper with QueryClient for React Query support
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('Tenant Selection Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch user memberships from Supabase', async () => {
    const mockMemberships = [
      {
        id: 'membership-1',
        user_id: 'user-123',
        tenant_id: 'tenant-1',
        role: 'member',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tenant: {
          id: 'tenant-1',
          name: 'Test Church 1',
          slug: 'test-church-1',
          settings: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    ];

    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMemberships,
        error: null,
      }),
    };

    const mockSelect = jest.fn().mockReturnValue(mockQuery);
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMemberships('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.from).toHaveBeenCalledWith('memberships');
    expect(mockSelect).toHaveBeenCalledWith('*, tenant:tenants(*)');
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
    expect(result.current.memberships).toEqual(mockMemberships);
  });

  it('should only return active memberships', async () => {
    const mockMemberships = [
      {
        id: 'membership-1',
        user_id: 'user-123',
        tenant_id: 'tenant-1',
        role: 'member',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tenant: {
          id: 'tenant-1',
          name: 'Test Church',
          slug: 'test-church',
          settings: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
      {
        id: 'membership-2',
        user_id: 'user-123',
        tenant_id: 'tenant-2',
        role: 'admin',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        tenant: {
          id: 'tenant-2',
          name: 'Another Church',
          slug: 'another-church',
          settings: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    ];

    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMemberships,
        error: null,
      }),
    };

    const mockSelect = jest.fn().mockReturnValue(mockQuery);
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMemberships('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.memberships).toHaveLength(2);
    result.current.memberships.forEach((membership) => {
      expect(membership.status).toBe('active');
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    const mockSelect = jest.fn().mockReturnValue(mockQuery);
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useMemberships('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.memberships).toEqual([]);
  });

  it('should return empty array when userId is undefined', async () => {
    const { result } = renderHook(() => useMemberships(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.memberships).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
