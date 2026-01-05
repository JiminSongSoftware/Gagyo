/**
 * Hook for managing Expo push notification device token.
 *
 * Handles the complete token lifecycle:
 * - Request permissions on first use
 * - Register token with backend (tenant-scoped)
 * - Detect and handle token rotation
 * - Revoke token on logout
 * - Platform-specific handling (iOS/Android)
 *
 * @example
 * ```tsx
 * function App() {
 *   const { activeTenantId, activeMembershipId } = useTenantContext();
 *   const { token, loading, error } = useDeviceToken(activeTenantId, activeMembershipId);
 *
 *   return <RootNavigation />;
 * }
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, AppStateStatus, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

type DeviceTokenPlatform = 'ios' | 'android';
type DeviceTokenStatus = 'idle' | 'requesting' | 'registering' | 'registered' | 'failed';

export interface DeviceTokenState {
  token: string | null;
  platform: DeviceTokenPlatform | null;
  loading: boolean;
  status: DeviceTokenStatus;
  error: Error | null;
  isRevoked: boolean;
}

export interface DeviceTokenActions {
  revokeToken: () => Promise<void>;
  refreshPermissions: () => Promise<boolean>;
  retryRegistration: () => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Maximum retry attempts for token registration
const MAX_RETRY_ATTEMPTS = 3;

// Retry delay in milliseconds (exponential backoff base)
const RETRY_DELAY_MS = 1000;

// Android notification channel configuration
const ANDROID_CHANNEL_ID = 'default';
const ANDROID_CHANNEL_CONFIG = {
  name: 'Default',
  description: 'Default notifications',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF231F70',
};

// ============================================================================
// DATABASE TYPES
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current platform as a DeviceTokenPlatform.
 * Returns 'android' for Android, 'ios' for iOS (including simulator).
 */
function getDevicePlatform(): DeviceTokenPlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

/**
 * Create Android notification channel (required for Android 13+).
 * Should be called before requesting permissions on Android.
 */
async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, ANDROID_CHANNEL_CONFIG);
  } catch (error) {
    console.error('Failed to create Android notification channel:', error);
  }
}

/**
 * Request notification permissions from the user.
 *
 * @returns True if permission is granted, false otherwise
 */
async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // First check if we already have permission
    const existingStatus = await Notifications.getPermissionsAsync();
    if (existingStatus.status === 'granted') {
      return true;
    }

    // Request permission
    const { status: grantedStatus } = await Notifications.requestPermissionsAsync();

    // On iOS, check the specific iOS status
    if (Platform.OS === 'ios') {
      const iosStatus = grantedStatus as unknown as { ios: { status: number } };
      return iosStatus.ios.status === 1; // iOSAuthorizationStatus.AUTHORIZED
    }

    return grantedStatus === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Get the Expo push token for the device.
 *
 * @param projectId - The Expo project ID (from app.config.js)
 * @returns The Expo push token or null if failed
 */
async function getExpoPushToken(projectId: string): Promise<string | null> {
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data;
  } catch (error) {
    console.error('Failed to get Expo push token:', error);
    return null;
  }
}

/**
 * Register device token with the backend.
 *
 * @param tenantId - The current tenant ID
 * @param membershipId - The current membership ID (user_id in device_tokens)
 * @param token - The Expo push token
 * @param platform - The device platform
 * @returns True if registration succeeded, false otherwise
 */
async function registerTokenWithBackend(
  tenantId: string,
  membershipId: string,
  token: string,
  platform: DeviceTokenPlatform
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .upsert({
        tenant_id: tenantId,
        user_id: membershipId,
        token,
        platform,
        last_used_at: new Date().toISOString(),
        revoked_at: null,
      } as Database['public']['Tables']['device_tokens']['Insert'])
      .select()
      .single();

    if (error) {
      console.error('Failed to register token with backend:', error);
      return false;
    }

    console.log('Device token registered successfully');
    return true;
  } catch {
    console.error('Exception during token registration');
    return false;
  }
}

/**
 * Sleep for a specified duration (for retry backoff).
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseDeviceTokenOptions {
  /**
   * Whether to automatically request permissions on mount.
   * Default: true
   */
  autoRequest?: boolean;

  /**
   * The Expo project ID for push notifications.
   * Defaults to process.env.EXPO_PUBLIC_PROJECT_ID
   */
  projectId?: string;
}

export function useDeviceToken(
  tenantId: string | null,
  membershipId: string | null,
  options: UseDeviceTokenOptions = {}
): DeviceTokenState & DeviceTokenActions {
  const { autoRequest = true, projectId: projectIdOption } = options;

  // Translation hook available for future i18n

  const [state, setState] = useState<DeviceTokenState>({
    token: null,
    platform: null,
    loading: false,
    status: 'idle',
    error: null,
    isRevoked: false,
  });

  const retryCountRef = useRef(0);
  const registrationInProgressRef = useRef(false);

  /**
   * Update a subset of the state.
   */
  const updateState = useCallback((updates: Partial<DeviceTokenState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Perform the complete token registration flow.
   */
  const registerToken = useCallback(async () => {
    // Guard against concurrent registrations
    if (registrationInProgressRef.current) {
      return;
    }

    // Validate prerequisites
    if (!tenantId || !membershipId) {
      console.log('Skipping token registration: missing tenant or membership');
      return;
    }

    registrationInProgressRef.current = true;
    updateState({ loading: true, status: 'requesting', error: null });

    try {
      // Step 1: Ensure Android notification channel exists
      await ensureAndroidNotificationChannel();

      // Step 2: Request notification permissions
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        updateState({
          loading: false,
          status: 'failed',
          error: new Error('Notification permission denied'),
        });
        return;
      }

      updateState({ status: 'registering' });

      // Step 3: Get Expo push token
      const projectId = projectIdOption || process.env.EXPO_PUBLIC_PROJECT_ID || '';
      const token = await getExpoPushToken(projectId);
      if (!token) {
        throw new Error('Failed to get Expo push token');
      }

      // Step 4: Register token with backend
      const platform = getDevicePlatform();
      const registered = await registerTokenWithBackend(tenantId, membershipId, token, platform);

      if (registered) {
        updateState({
          token,
          platform,
          loading: false,
          status: 'registered',
          error: null,
          isRevoked: false,
        });
        retryCountRef.current = 0; // Reset retry count on success
      } else {
        throw new Error('Backend token registration failed');
      }
    } catch (error) {
      const err = error as Error;

      // Implement retry logic with exponential backoff
      if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        retryCountRef.current++;
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCountRef.current - 1);

        console.log(
          `Token registration failed, retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})`
        );

        await sleep(delay);
        return registerToken(); // Recursive retry
      }

      // Max retries reached, give up
      updateState({
        loading: false,
        status: 'failed',
        error: err,
      });
    } finally {
      registrationInProgressRef.current = false;
    }
  }, [tenantId, membershipId, projectIdOption, updateState]);

  /**
   * Revoke the current token (mark as revoked in backend).
   * Called on logout or tenant switch.
   */
  const revokeToken = useCallback(async () => {
    if (!state.token || !tenantId || !membershipId) {
      return;
    }

    try {
      const { error } = await supabase
        .from('device_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('user_id', membershipId)
        .eq('token', state.token);

      if (error) {
        console.error('Failed to revoke token:', error);
        throw error;
      }

      updateState({
        token: null,
        status: 'idle',
        isRevoked: true,
      });

      console.log('Device token revoked successfully');
    } catch (error) {
      console.error('Exception during token revocation:', error);
      updateState({ error: error as Error });
    }
  }, [state.token, tenantId, membershipId, updateState]);

  /**
   * Refresh notification permissions.
   * Returns true if permission is granted after refresh.
   */
  const refreshPermissions = useCallback(async (): Promise<boolean> => {
    const hasPermission = await requestNotificationPermissions();

    if (hasPermission && tenantId && membershipId) {
      // If we have a token but permission was refreshed, re-register
      if (state.token) {
        await registerToken();
      } else {
        // If no token yet, start registration
        await registerToken();
      }
    }

    return hasPermission;
  }, [state.token, tenantId, membershipId, registerToken]);

  /**
   * Manually retry token registration.
   */
  const retryRegistration = useCallback(async () => {
    retryCountRef.current = 0;
    await registerToken();
  }, [registerToken]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Main effect: Register token when tenant and membership are available.
   */
  useEffect(() => {
    if (!autoRequest) {
      return;
    }

    if (!tenantId || !membershipId) {
      updateState({ token: null, status: 'idle' });
      return;
    }

    // Start registration
    void registerToken();
  }, [tenantId, membershipId, autoRequest, registerToken, updateState]);

  /**
   * Handle app state changes (foreground/background).
   * Re-check token when app comes to foreground.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && tenantId && membershipId) {
        // Check if token needs refresh
        void (async () => {
          try {
            const projectId = projectIdOption || process.env.EXPO_PUBLIC_PROJECT_ID || '';
            const currentToken = await getExpoPushToken(projectId);

            // If token changed, re-register
            if (currentToken && currentToken !== state.token) {
              console.log('Device token changed, re-registering');
              await registerToken();
            }
          } catch (error) {
            console.error('Failed to check token on app foreground:', error);
          }
        })();
      }
    });

    return () => subscription.remove();
  }, [tenantId, membershipId, state.token, projectIdOption, registerToken]);

  return {
    ...state,
    revokeToken,
    refreshPermissions,
    retryRegistration,
  };
}
