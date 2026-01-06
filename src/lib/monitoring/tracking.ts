/**
 * Unified tracking utilities combining Sentry and PostHog.
 *
 * This module provides a single interface for tracking events, errors, and
 * navigation that automatically enriches data with context and sends to
 * both Sentry (for error tracking) and PostHog (for analytics).
 *
 * @module monitoring/tracking
 */

import * as Sentry from './sentry';
import * as PostHog from './posthog';
import type { ApiCallTrackingOptions, NavigationTrackingOptions } from './types';

/**
 * Current tracking context (tenant, user, locale, etc.).
 */
let trackingContext: {
  tenant_id?: string;
  user_role?: string;
  locale?: string;
  app_version?: string;
} | null = null;

/**
 * Get the current tracking context.
 */
export function getTrackingContext() {
  return trackingContext;
}

/**
 * Set the tracking context for all future events.
 *
 * @param context - Context to set (null to clear)
 */
export function setTrackingContext(
  context: {
    tenant_id?: string;
    user_role?: string;
    locale?: string;
    app_version?: string;
  } | null,
): void {
  if (context === null) {
    trackingContext = null;
  } else if (trackingContext === null) {
    trackingContext = { ...context };
  } else {
    // Merge with existing context
    trackingContext = { ...trackingContext, ...context };
  }
}

/**
 * Enrich properties with current tracking context.
 */
function enrichProperties<T extends Record<string, unknown>>(properties: T): T {
  if (!trackingContext) {
    return properties;
  }

  return {
    ...trackingContext,
    ...properties,
  } as T;
}

/**
 * Track an event in both PostHog and Sentry.
 *
 * @param eventName - The name of the event
 * @param properties - Event properties (will be enriched with context)
 */
export function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
): void {
  const enriched = enrichProperties(properties);

  // Track in PostHog
  PostHog.trackEvent(eventName, enriched);

  // Add breadcrumb in Sentry
  Sentry.addBreadcrumb({
    category: 'user',
    type: 'user',
    message: eventName,
    level: 'info',
    data: enriched,
  });
}

/**
 * Track an error in Sentry with context.
 *
 * @param error - The error to capture
 * @param context - Additional context
 * @param level - Severity level
 */
export function trackError(
  error: unknown,
  context: Record<string, unknown> = {},
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'error',
): void {
  const enriched = enrichProperties(context);

  // Capture in Sentry
  Sentry.captureError(error, enriched, level as 'debug' | 'info' | 'warning' | 'error' | 'fatal');

  // Add error breadcrumb
  Sentry.addBreadcrumb({
    category: 'error',
    message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    level: 'error',
    data: enriched,
  });
}

/**
 * Track a screen navigation.
 *
 * @param screenName - Name of the screen
 * @param params - Screen parameters
 * @param fromScreen - Previous screen name (optional)
 */
export function trackNavigation(
  screenName: string,
  params?: Record<string, unknown>,
  fromScreen?: string,
): void {
  const properties: Record<string, unknown> = {
    screen_name: screenName,
    ...(params && { params }),
  };

  const enriched = enrichProperties(properties);

  // Track in PostHog
  PostHog.screen(screenName, params as Record<string, unknown>);

  // Add navigation breadcrumb in Sentry
  Sentry.addBreadcrumb({
    category: 'navigation',
    type: 'navigation',
    message: fromScreen
      ? `Navigated from ${fromScreen} to ${screenName}`
      : `Navigated to ${screenName}`,
    level: 'info',
    data: {
      from: fromScreen,
      to: screenName,
      ...(params && { params }),
    },
  });
}

/**
 * Track an API call.
 *
 * @param options - API call tracking options
 */
export function trackApiCall(options: ApiCallTrackingOptions): void {
  const { endpoint, method, status, duration_ms, success, error_code } = options;

  const level = success ? 'info' : 'error';
  const message = `${method} ${endpoint} - ${status}`;

  // Add HTTP breadcrumb in Sentry
  Sentry.addBreadcrumb({
    category: 'http',
    type: 'http',
    message,
    level: level as 'info' | 'error' | 'warning',
    data: {
      endpoint,
      method,
      status,
      duration_ms,
      ...(error_code && { error_code }),
    },
  });

  // If the call failed, also capture as an error
  if (!success) {
    const error = new Error(`API Error: ${method} ${endpoint} - ${status}`);
    Sentry.captureError(error, {
      endpoint,
      method,
      status,
      error_code,
      duration_ms,
    }, 'warning');
  }
}

/**
 * Track a user sign in.
 *
 * @param method - Sign in method
 * @param tenantId - Tenant ID
 */
export function trackSignIn(method: string, tenantId: string): void {
  trackEvent('user_signed_in', { method, tenant_id: tenantId });
}

/**
 * Track a user sign out.
 *
 * @param tenantId - Tenant ID
 */
export function trackSignOut(tenantId: string): void {
  trackEvent('user_signed_out', { tenant_id: tenantId });
}

/**
 * Track a tenant switch.
 *
 * @param fromTenant - Previous tenant ID
 * @param toTenant - New tenant ID
 * @param tenantName - New tenant name
 */
export function trackTenantSwitch(fromTenant: string, toTenant: string, tenantName?: string): void {
  trackEvent('tenant_switched', {
    from_tenant: fromTenant,
    to_tenant,
    tenant_name: tenantName,
  });
  setTrackingContext({ tenant_id: toTenant });
}

/**
 * Clear tracking context (call on logout).
 */
export function clearTrackingContext(): void {
  trackingContext = null;
  Sentry.clearUserContext();
  PostHog.resetUser();
}
