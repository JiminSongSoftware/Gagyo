/**
 * Unit tests for useDeleteAccount hook.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDeleteAccount } from '../useDeleteAccount';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

// Mock global fetch
global.fetch = jest.fn();

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useDeleteAccount', () => {
  const mockUserId = 'user-123';
  const mockToken = 'mock-jwt-token';
  const mockSupabaseUrl = 'https://test.supabase.co';

  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variable
    process.env.EXPO_PUBLIC_SUPABASE_URL = mockSupabaseUrl;

    // Default auth mock - user is authenticated
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
      data: {
        session: { access_token: mockToken },
      },
      error: null,
    });

    // Default fetch mock - successful deletion
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Account deleted successfully',
        deleted_counts: {
          memberships: 2,
          device_tokens: 3,
          notifications: 10,
          profile_photo_deleted: true,
        },
      }),
    } as Response);
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useDeleteAccount());

    expect(result.current.deleting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(typeof result.current.deleteAccount).toBe('function');
  });

  it('should return null when user is not authenticated', async () => {
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response).toBeNull();
    expect(result.current.error?.message).toBe('User not authenticated');
  });

  it('should return null when no auth token is available', async () => {
    mockSupabase.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response).toBeNull();
    expect(result.current.error?.message).toBe('No auth token available');
  });

  it('should delete account successfully', async () => {
    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response).toEqual({
      success: true,
      message: 'Account deleted successfully',
      deleted_counts: {
        memberships: 2,
        device_tokens: 3,
        notifications: 10,
        profile_photo_deleted: true,
      },
    });

    expect(result.current.result).toEqual(response);
    expect(result.current.error).toBeNull();

    // Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      `${mockSupabaseUrl}/functions/v1/delete-user-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ user_id: mockUserId }),
      }
    );
  });

  it('should handle Edge Function errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    } as Response);

    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response).toBeNull();
    expect(result.current.error?.message).toContain('Failed to delete account');
    expect(result.current.error?.message).toContain('400');
  });

  it('should handle Edge Function returning success: false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: 'You can only delete your own account',
        deleted_counts: {
          memberships: 0,
          device_tokens: 0,
          notifications: 0,
          profile_photo_deleted: false,
        },
      }),
    } as Response);

    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response).toBeNull();
    expect(result.current.error?.message).toBe('You can only delete your own account');
  });

  it('should handle auth errors gracefully', async () => {
    const authError = new Error('Auth session expired');
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: authError,
    });

    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response).toBeNull();
    expect(result.current.error).toEqual(authError);
  });

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('Network request failed');
    mockFetch.mockRejectedValue(networkError);

    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response).toBeNull();
    expect(result.current.error?.message).toBe('Failed to delete account');
  });

  it('should set deleting state during deletion', async () => {
    let resolveFetch: (value: unknown) => void;
     
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockFetch.mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolveFetch!({
            ok: true,
            json: async () => ({
              success: true,
              message: 'Account deleted successfully',
              deleted_counts: {
                memberships: 0,
                device_tokens: 0,
                notifications: 0,
                profile_photo_deleted: false,
              },
            }),
          });
        }, 50);
        return fetchPromise;
      })
    );

    const { result } = renderHook(() => useDeleteAccount());

    expect(result.current.deleting).toBe(false);

    act(() => {
      void result.current.deleteAccount();
    });

    expect(result.current.deleting).toBe(true);

    await waitFor(() => {
      expect(result.current.deleting).toBe(false);
    });
  });

  it('should store deletion counts in result on success', async () => {
    const mockResponse = {
      success: true,
      message: 'Account deleted successfully',
      deleted_counts: {
        memberships: 5,
        device_tokens: 2,
        notifications: 25,
        profile_photo_deleted: true,
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useDeleteAccount());

    let response;
    await act(async () => {
      response = await result.current.deleteAccount();
    });

    expect(response?.deleted_counts.memberships).toBe(5);
    expect(response?.deleted_counts.device_tokens).toBe(2);
    expect(response?.deleted_counts.notifications).toBe(25);
    expect(response?.deleted_counts.profile_photo_deleted).toBe(true);
    expect(result.current.result).toEqual(mockResponse);
  });
});
