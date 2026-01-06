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

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockChangeLocale = i18n.changeLocale as jest.MockedFunction<
  typeof i18n.changeLocale
>;

describe('useUpdateProfile', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default auth mock - user is authenticated
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
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
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
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
    const fromMock = jest.fn().mockReturnValue({ update: updateMock });
    mockSupabase.from = fromMock;

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ displayName: 'John Doe' });
    });

    expect(success).toBe(true);
    expect(fromMock).toHaveBeenCalledWith('users');
    expect(updateMock).toHaveBeenCalledWith(
      { display_name: 'John Doe' },
      { __query: { key: 'id', value: mockUserId } }
    );
  });

  it('should update locale and sync with i18n', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    const fromMock = jest.fn().mockReturnValue({ update: updateMock });
    mockSupabase.from = fromMock;

    const { result } = renderHook(() => useUpdateProfile());

    let success;
    await act(async () => {
      success = await result.current.updateProfile({ locale: 'ko' });
    });

    expect(success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      { locale: 'ko' },
      { __query: { key: 'id', value: mockUserId } }
    );
    expect(mockChangeLocale).toHaveBeenCalledWith('ko');
  });

  it('should update notification preferences', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    const fromMock = jest.fn().mockReturnValue({ update: updateMock });
    mockSupabase.from = fromMock;

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
    expect(updateMock).toHaveBeenCalledWith(
      { notification_preferences: notificationPreferences },
      { __query: { key: 'id', value: mockUserId } }
    );
  });

  it('should update multiple fields at once', async () => {
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    });
    const fromMock = jest.fn().mockReturnValue({ update: updateMock });
    mockSupabase.from = fromMock;

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
    expect(updateMock).toHaveBeenCalledWith(
      {
        display_name: 'Jane Doe',
        locale: 'en',
        notification_preferences: {
          messages: true,
          prayers: true,
          journals: false,
          system: true,
        },
      },
      { __query: { key: 'id', value: mockUserId } }
    );
  });

  it('should handle update errors gracefully', async () => {
    const mockError = new Error('Database error');

    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: mockError,
      }),
    });
    const fromMock = jest.fn().mockReturnValue({ update: updateMock });
    mockSupabase.from = fromMock;

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

    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
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
    let resolveUpdate: (value: unknown) => void;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        error: null,
      }),
    });
    const fromMock = jest.fn().mockReturnValue({
      update: jest.fn().mockImplementation(() => {
        (updateMock as jest.Mock).mockReturnValue({
          eq: jest.fn().mockResolvedValueOnce(
            new Promise((r) => {
              setTimeout(() => r({ error: null }), 50);
            })
          ),
        });
        return updateMock;
      }),
    });
    mockSupabase.from = fromMock as unknown as typeof mockSupabase.from;

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
