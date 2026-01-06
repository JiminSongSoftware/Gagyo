/**
 * Unit tests for useUpdateProfile hook.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUpdateProfile } from '../useUpdateProfile';
import { supabase } from '@/lib/supabase';
import * as i18n from '@/i18n';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock i18n
jest.mock('@/i18n', () => ({
  changeLocale: jest.fn(),
}));

const mockSupabase = supabase as {
  auth: {
    getUser: jest.Mock;
  };
  from: jest.Mock;
};
const mockChangeLocale = i18n.changeLocale as jest.Mock;
const mockGetUser = mockSupabase.auth.getUser;
const mockFrom = mockSupabase.from;

describe('useUpdateProfile', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default auth mock - user is authenticated
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useUpdateProfile());

    expect(result.current.updating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.updateProfile).toBe('function');
  });

  it('should return false when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ displayName: 'Test' });
    });

    expect(success).toBe(false);
    expect(result.current.error?.message).toBe('User not authenticated');
  });

  it('should return true when no changes are provided', async () => {
    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({});
    });

    expect(success).toBe(true);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should update display name successfully', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ displayName: 'John Doe' });
    });

    expect(success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(updateMock).toHaveBeenCalledWith({ display_name: 'John Doe' });
  });

  it('should update locale and sync with i18n', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ locale: 'ko' });
    });

    expect(success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ locale: 'ko' });
    expect(mockChangeLocale).toHaveBeenCalledWith('ko');
  });

  it('should update notification preferences', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useUpdateProfile());

    const notificationPreferences = {
      messages: true,
      prayers: false,
      journals: true,
      system: false,
    };

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ notificationPreferences });
    });

    expect(success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      notification_preferences: notificationPreferences,
    });
  });

  it('should update multiple fields at once', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({
        displayName: 'Jane Doe',
        locale: 'en',
        notificationPreferences: {
          messages: true,
          prayers: true,
          journals: false,
          system: true,
        },
      });
    });

    expect(success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      display_name: 'Jane Doe',
      locale: 'en',
      notification_preferences: {
        messages: true,
        prayers: true,
        journals: false,
        system: true,
      },
    });
  });

  it('should handle update errors gracefully', async () => {
    const mockError = new Error('Database error');

    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: mockError,
      }),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ displayName: 'Test' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should handle auth errors gracefully', async () => {
    const authError = new Error('Auth session expired');

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: authError,
    });

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ displayName: 'Test' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toEqual(authError);
  });

  it('should set updating state during update', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 50);
          })
      ),
    });
    mockFrom.mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useUpdateProfile());

    expect(result.current.updating).toBe(false);

    act(() => {
      void result.current.updateProfile({ displayName: 'Test' });
    });

    expect(result.current.updating).toBe(true);

    await waitFor(() => {
      expect(result.current.updating).toBe(false);
    });
  });
});
