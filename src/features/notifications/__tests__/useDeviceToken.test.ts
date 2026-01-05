/**
 * Unit tests for useDeviceToken hook
 *
 * Tests token registration, rotation, and invalidation flows
 * with mocked Expo Notifications API and Supabase client.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-require-imports */

// Set up React Native mock before importing React Native modules
import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useDeviceToken } from '../useDeviceToken';
import { supabase } from '@/lib/supabase';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(),
  },
  NativeModules: {},
  PermissionsAndroid: {},
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setNotificationHandler: jest.fn(),
  getInitialNotification: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useDeviceToken', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockToken = 'ExponentPushToken[test-token-123]';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for permission check - granted
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
      ios: { status: 1 }, // Notifications.IosAuthorizationStatus.AUTHORIZED
      android: {},
    });

    // Default mock for token retrieval
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: mockToken,
    });

    // Default Supabase mock
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'token-record-123', token: mockToken },
            error: null,
          }),
        }),
      }),
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'token-record-123', token: mockToken },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });
    mockSupabase.from = mockFrom;
  });

  // ============================================================================
  // TOKEN REGISTRATION FLOW
  // ============================================================================

  describe('Token Registration', () => {
    it('should request permissions and get token on mount', async () => {
      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      // Should start in loading state
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify permission check was called
      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();

      // If permission not granted, should request it
      expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: expect.any(String),
      });
    });

    it('should store token in database after getting it', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'not_determined',
        canAskAgain: true,
        ios: { status: 0 }, // NOT_DETERMINED
        android: {},
      });

      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        ios: { status: 1 },
        android: {},
      });

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify insert was called with correct data
      const mockInsert = mockSupabase.from('device_tokens').insert;
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          user_id: mockUserId,
          token: mockToken,
          platform: 'ios',
        })
      );
    });

    it('should handle permission denied gracefully', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        ios: { status: 2 }, // DENIED
        android: {},
      });

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, token should be null
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle token retrieval failure gracefully', async () => {
      mockNotifications.getExpoPushTokenAsync.mockRejectedValue(
        new Error('Failed to get push token')
      );

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have error but not crash
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBeTruthy();
    });

    it('should create Android notification channel before getting token', async () => {
      // Mock Platform.OS to return 'android'
      const ReactNative = require('react-native');
      ReactNative.Platform.OS = 'android';

      mockNotifications.setNotificationChannelAsync.mockResolvedValue({});

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify notification channel was created for Android
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          name: expect.any(String),
          importance: 4, // AndroidImportance.MAX
        })
      );

      // Reset Platform
      ReactNative.Platform.OS = 'ios';
    });
  });

  // ============================================================================
  // TOKEN ROTATION FLOW
  // ============================================================================

  describe('Token Rotation', () => {
    it('should detect token change on app launch and update', async () => {
      const oldToken = 'ExponentPushToken[old-token-123]';
      const newToken = 'ExponentPushToken[new-token-456]';

      // First call returns old token
      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: oldToken,
      });

      const { result, rerender } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.token).toBe(oldToken);
      });

      // Simulate app restart - now token has changed
      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: newToken,
      });

      // Mock upsert for token rotation
      const mockUpsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'token-record-updated', token: newToken },
            error: null,
          }),
        }),
      });
      mockSupabase.from('device_tokens').upsert = mockUpsert;

      // Rerender hook (simulating app restart)
      act(() => {
        rerender();
      });

      await waitFor(() => {
        expect(result.current.token).toBe(newToken);
      });

      // Verify upsert was called
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should handle token rotation update failure', async () => {
      const newToken = 'ExponentPushToken[rotation-fail-token]';

      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: newToken,
      });

      // Mock upsert failure
      const mockUpsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database connection failed'),
          }),
        }),
      });
      mockSupabase.from('device_tokens').upsert = mockUpsert;

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have error but not crash
      expect(result.current.error).toBeTruthy();
    });
  });

  // ============================================================================
  // TOKEN INVALIDATION FLOW
  // ============================================================================

  describe('Token Invalidation', () => {
    it('should mark token as revoked on logout', async () => {
      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock update for revocation
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });
      mockSupabase.from('device_tokens').update = mockUpdate;

      act(() => {
        void result.current.revokeToken();
      });

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });

      // Verify update was called with revoked_at
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          revoked_at: expect.any(Date),
        })
      );
    });

    it('should handle invalidation failure gracefully', async () => {
      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock update failure
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      mockSupabase.from('device_tokens').update = mockUpdate;

      act(() => {
        void result.current.revokeToken();
      });

      // Should not throw, error should be captured
      expect(result.current.error).toBeDefined();
    });
  });

  // ============================================================================
  // PLATFORM DIFFERENCES
  // ============================================================================

  describe('Platform Handling', () => {
    it('should handle iOS permissions correctly', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        ios: { status: 1 }, // AUTHORIZED
        android: {},
      });

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.token).toBe(mockToken);
    });

    it('should handle Android permissions correctly', async () => {
      // Mock Android platform
      const ReactNative = require('react-native');
      ReactNative.Platform.OS = 'android';

      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        ios: {},
        android: {},
      });

      mockNotifications.setNotificationChannelAsync.mockResolvedValue({});

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.token).toBe(mockToken);

      // Reset Platform
      ReactNative.Platform.OS = 'ios';
    });
  });

  // ============================================================================
  // RETRY LOGIC
  // ============================================================================

  describe('Retry Logic', () => {
    it('should retry token registration on transient failure', async () => {
      let attemptCount = 0;

      mockNotifications.getExpoPushTokenAsync.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve({ data: mockToken });
      });

      const { result } = renderHook(() => useDeviceToken(mockTenantId, mockUserId));

      // Should eventually succeed after retries
      await waitFor(
        () => {
          expect(result.current.token).toBe(mockToken);
        },
        { timeout: 10000 }
      );

      expect(attemptCount).toBe(3);
    });
  });
});

/**
 * ============================================================================
 * TESTING NOTES
 * ============================================================================
 *
 * Expo Notifications API Key Methods:
 * - getPermissionsAsync(): Check current permission status
 * - requestPermissionsAsync(): Request permission from user
 * - getExpoPushTokenAsync({ projectId }): Get Expo push token
 * - setNotificationChannelAsync(id, config): Create notification channel (Android)
 * - addNotificationReceivedListener(listener): Listen for incoming notifications
 * - getInitialNotification(): Get notification that launched the app
 *
 * Permission Status Values (iOS):
 * - 0: NOT_DETERMINED
 * - 1: AUTHORIZED
 * - 2: DENIED
 * - 3: PROVISIONAL
 * - 4: EPHEMERAL
 *
 * Permission Status Values (Android 13+):
 * - 1: DENIED
 * - 2: GRANTED
 */
