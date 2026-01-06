/**
 * Sentry integration for error tracking and monitoring.
 *
 * This module provides utilities for initializing Sentry and capturing errors
 * with enriched context including tenant ID, user role, and locale.
 *
 * @module monitoring/sentry
 */

import * as Sentry from '@sentry/react-native';
import {
  configureScope as sentryConfigureScope,
  setContext as sentrySetContext,
  type Breadcrumb,
  type BreadcrumbHint,
  type Scope,
} from '@sentry/react-native';
import Constants from 'expo-constants';
import Platform from 'react-native/Platform';

import type {
  BreadcrumbData,
  Environment,
  SentryContextTags,
  SentryErrorContext,
  SentrySeverity,
  SentryUserContext,
} from './types';

/**
 * Default app version from Constants, falls back to 'unknown'.
 */
const APP_VERSION = Constants.expoConfig?.version || 'unknown';

/**
 * Get the environment from environment variable or default to development.
 */
function getEnvironment(): Environment {
  return (process.env.EXPO_PUBLIC_ENV as Environment) || 'development';
}

/**
 * Get the release version (app version).
 */
function getRelease(): string {
  return APP_VERSION;
}

/**
 * Get the distribution ID (EAS build ID if available).
 */
function getDist(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.buildId;
}

/**
 * Initialize Sentry with appropriate configuration.
 *
 * @param config - Sentry configuration options
 */
export function initSentry(config: {
  dsn: string;
  environment?: Environment;
  release?: string;
  dist?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}): void {
  const { dsn, environment, release, dist, sampleRate, tracesSampleRate } = config;

  // Skip initialization if DSN is empty
  if (!dsn || dsn.trim() === '') {
    console.warn('[Sentry] DSN is empty, skipping initialization');
    return;
  }

  // Determine appropriate sample rates based on environment
  const env = environment || getEnvironment();
  const defaultSampleRate = 1.0; // Capture all errors
  const defaultTracesSampleRate = env === 'development' ? 1.0 : env === 'preview' ? 0.5 : 0.25;

  Sentry.init({
    dsn,
    environment: env,
    release: release || getRelease(),
    dist: dist || getDist(),
    sampleRate: sampleRate ?? defaultSampleRate,
    tracesSampleRate: tracesSampleRate ?? defaultTracesSampleRate,
    enableAutoPerformanceTracking: env !== 'development',
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    attachThreads: true,
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (env === 'development') {
        console.warn('[Sentry]', event, hint);
        return null; // Don't send to Sentry in development
      }

      // Filter out specific error types
      if (event.exception) {
        // Example: filter out network errors from offline state
        const errorMessage = hint.originalException?.toString();
        if (errorMessage?.includes('Network request failed')) {
          // Optionally suppress network errors
          // return null;
        }
      }

      return event;
    },
    // Integrations
    integrations: (defaultIntegrations) => {
      // Filter out integrations if needed
      return defaultIntegrations;
    },
  });
}

/**
 * Capture an exception with context.
 *
 * @param error - The error to capture
 * @param context - Additional context data
 * @param level - Severity level (default: 'error')
 * @returns Sentry event ID or undefined
 */
export function captureError(
  error: unknown,
  context: SentryErrorContext = {},
  level: SentrySeverity = SentrySeverity.ERROR
): string | undefined {
  if (!error) {
    console.warn('[Sentry] Attempted to capture null/undefined error');
    return undefined;
  }

  const eventId = Sentry.captureException(error, {
    level,
    tags: {
      ...context,
      tenant_id: context.tenant_id,
      user_role: context.user_role,
      locale: context.locale,
    },
    contexts: {
      custom: context,
    },
  });

  return eventId;
}

/**
 * Capture a message with context.
 *
 * @param message - The message to capture
 * @param context - Additional context data
 * @param level - Severity level (default: 'info')
 * @returns Sentry event ID or undefined
 */
export function captureMessage(
  message: string,
  context: SentryErrorContext = {},
  level: SentrySeverity = SentrySeverity.INFO
): string | undefined {
  const eventId = Sentry.captureMessage(message, {
    level,
    tags: {
      ...context,
      tenant_id: context.tenant_id,
      user_role: context.user_role,
      locale: context.locale,
    },
  });

  return eventId;
}

/**
 * Set the user context for Sentry events.
 *
 * @param userId - User ID
 * @param context - User context data
 */
export function setUserContext(userId: string, context: Partial<SentryUserContext> = {}): void {
  const user: SentryUserContext = {
    id: userId,
    ...context,
  };

  Sentry.setUser(user);

  // Also set tags for quick filtering
  setTags({
    tenant_id: context.tenant_id,
    user_role: context.role,
    locale: context.locale,
  });
}

/**
 * Clear the current user context.
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Set tags for filtering events in Sentry.
 *
 * @param tags - Tags to set
 */
export function setTags(tags: Partial<SentryContextTags>): void {
  Sentry.setTag('tenant_id', tags.tenant_id);
  Sentry.setTag('user_role', tags.user_role);
  Sentry.setTag('locale', tags.locale);
  Sentry.setTag('app_version', APP_VERSION);
  Sentry.setTag('environment', getEnvironment());
  Sentry.setTag('platform', Platform.OS);
}

/**
 * Add a breadcrumb for tracking user actions leading to errors.
 *
 * @param breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb: BreadcrumbData): void {
  const crumb: Breadcrumb = {
    category: breadcrumb.category || 'default',
    message: breadcrumb.message,
    level: breadcrumb.level || SentrySeverity.INFO,
    data: breadcrumb.data,
  };

  if (breadcrumb.type) {
    crumb.type = breadcrumb.type as BreadcrumbHint['type'];
  }

  Sentry.addBreadcrumb(crumb);
}

/**
 * Set context data for the current scope.
 *
 * @param key - Context key
 * @param context - Context data
 */
export function setContext(key: string, context: Record<string, unknown>): void {
  sentrySetContext(key, context);
}

/**
 * Configure the Sentry scope with a callback.
 *
 * @param callback - Scope configuration callback
 */
export function configureScope(callback: (scope: Scope) => void): void {
  sentryConfigureScope(callback);
}

/**
 * Set a group in Sentry (e.g., for tenant-level grouping).
 *
 * @param type - Group type (e.g., 'tenant')
 * @param id - Group identifier (e.g., tenant ID)
 * @param properties - Group properties
 */
export function setGroup(type: string, id: string, _properties: Record<string, unknown>): void {
  sentryConfigureScope((scope: Scope) => {
    scope.setTag(type, id);
  });
}
