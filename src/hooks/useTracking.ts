/**
 * React hook for event tracking with automatic context injection.
 *
 * This hook provides memoized tracking functions that automatically inject
 * current tenant, user, and locale context into all events.
 *
 * @module hooks/useTracking
 */

import { useCallback, useContext, useMemo } from 'react';

import { useTenantStore } from '@/stores/tenantStore';
import { useAuth } from '@/hooks/useAuth';

import * as tracking from '@/lib/monitoring/tracking';
import * as PostHogModule from '@/lib/monitoring/posthog';
import type { PostHogEventProperties, PostHogUserProperties, PostHogGroupProperties } from '@/lib/monitoring/types';
import type { Role, Locale } from '@/types/database';
import Constants from 'expo-constants';

/**
 * Hook return type with tracking functions.
 */
export interface UseTrackingReturn {
  /** Track an event with automatic context injection */
  trackEvent: <T extends string>(
    eventName: T,
    properties?: Omit<PostHogEventProperties, 'tenant_id' | 'user_role' | 'locale' | 'app_version'>,
  ) => void;
  /** Track an error with automatic context injection */
  trackError: (
    error: unknown,
    context?: Record<string, unknown>,
    level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal',
  ) => void;
  /** Track screen navigation */
  trackNavigation: (
    screenName: string,
    params?: Record<string, unknown>,
    fromScreen?: string,
  ) => void;
  /** Track an API call */
  trackApiCall: (options: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    status: number;
    duration_ms: number;
    success: boolean;
    error_code?: string;
  }) => void;
  /** Track user sign in */
  trackSignIn: () => void;
  /** Track user sign out */
  trackSignOut: () => void;
  /** Identify user in analytics */
  identifyUser: (userId: string, properties?: PostHogUserProperties) => void;
  /** Set tenant group */
  setTenantGroup: (
    tenantId: string,
    properties?: Omit<PostHogGroupProperties, 'created_at'>,
  ) => void;
}

/**
 * React hook for event tracking with automatic context injection.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackEvent } = useTracking();
 *
 *   const handlePress = () => {
 *     trackEvent('message_sent', { conversation_type: 'direct' });
 *   };
 *
 *   return <Button onPress={handlePress} />;
 * }
 * ```
 */
export function useTracking(): UseTrackingReturn {
  const { user } = useAuth();
  const { activeTenant, activeMembership } = useTenantStore();

  // Get current context values
  const tenantId = activeTenant?.id;
  const userRole = activeMembership?.role;
  const locale = user?.locale || 'en';
  const appVersion = Constants.expoConfig?.version || 'unknown';

  // Update tracking context when dependencies change
  useCallback(() => {
    if (tenantId) {
      tracking.setTrackingContext({
        tenant_id: tenantId,
        user_role: userRole,
        locale,
        app_version: appVersion,
      });
    }
  }, [tenantId, userRole, locale, appVersion]);

  // Memoized tracking functions
  const trackEventCallback = useCallback(
    <T extends string>(
      eventName: T,
      properties?: Omit<PostHogEventProperties, 'tenant_id' | 'user_role' | 'locale' | 'app_version'>,
    ) => {
      const enrichedProperties = {
        tenant_id: tenantId,
        user_role: userRole,
        locale,
        app_version: appVersion,
        ...properties,
      } as PostHogEventProperties;

      tracking.trackEvent(eventName, enrichedProperties);
    },
    [tenantId, userRole, locale, appVersion],
  );

  const trackErrorCallback = useCallback(
    (error: unknown, context?: Record<string, unknown>, level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal') => {
      const enrichedContext = {
        tenant_id: tenantId,
        user_role: userRole,
        locale,
        ...context,
      };

      tracking.trackError(error, enrichedContext, level);
    },
    [tenantId, userRole, locale],
  );

  const trackNavigationCallback = useCallback(
    (screenName: string, params?: Record<string, unknown>, fromScreen?: string) => {
      tracking.trackNavigation(screenName, params, fromScreen);
    },
    [],
  );

  const trackApiCallCallback = useCallback((options: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    status: number;
    duration_ms: number;
    success: boolean;
    error_code?: string;
  }) => {
    tracking.trackApiCall(options);
  }, []);

  const trackSignInCallback = useCallback(() => {
    if (tenantId) {
      tracking.trackSignIn('email', tenantId);
    }
  }, [tenantId]);

  const trackSignOutCallback = useCallback(() => {
    if (tenantId) {
      tracking.trackSignOut(tenantId);
    }
    tracking.clearTrackingContext();
  }, [tenantId]);

  const identifyUserCallback = useCallback((userId: string, properties?: PostHogUserProperties) => {
    const enrichedProperties: PostHogUserProperties = {
      tenant_count: 0, // Will be overridden by properties
      primary_role: 'member',
      locale,
      created_at: user?.created_at || new Date().toISOString(),
      email: user?.email,
      display_name: user?.display_name,
      ...properties,
    };

    // Call identify from PostHog module directly
    PostHogModule.identifyUser(userId, enrichedProperties);
  }, [locale, user?.created_at, user?.email, user?.display_name]);

  const setTenantGroupCallback = useCallback(
    (
      tenantIdParam: string,
      properties?: Omit<PostHogGroupProperties, 'created_at'>,
    ) => {
      const groupProperties: PostHogGroupProperties = {
        name: '',
        member_count: 0,
        created_at: activeTenant?.created_at || new Date().toISOString(),
        ...properties,
      };

      tracking.setGroup('tenant', tenantIdParam, groupProperties);
    },
    [activeTenant?.created_at],
  );

  return useMemo(
    () => ({
      trackEvent: trackEventCallback,
      trackError: trackErrorCallback,
      trackNavigation: trackNavigationCallback,
      trackApiCall: trackApiCallCallback,
      trackSignIn: trackSignInCallback,
      trackSignOut: trackSignOutCallback,
      identifyUser: identifyUserCallback,
      setTenantGroup: setTenantGroupCallback,
    }),
    [
      trackEventCallback,
      trackErrorCallback,
      trackNavigationCallback,
      trackApiCallCallback,
      trackSignInCallback,
      trackSignOutCallback,
      identifyUserCallback,
      setTenantGroupCallback,
    ],
  );
}
