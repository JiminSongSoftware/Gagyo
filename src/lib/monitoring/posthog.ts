/**
 * PostHog integration for product analytics.
 *
 * This module provides utilities for initializing PostHog and tracking events
 * with enriched context including tenant ID, user role, and locale.
 *
 * @module monitoring/posthog
 */

import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

import type {
  Environment,
  PostHogEventProperties,
  PostHogGroupProperties,
  PostHogUserProperties,
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
 * PostHog configuration options.
 */
export interface PostHogConfig {
  apiKey: string;
  host?: string;
  captureApplicationLifecycleEvents?: boolean;
  captureDeepLinks?: boolean;
  flushAt?: number;
  flushInterval?: number;
}

/**
 * Initialize PostHog with appropriate configuration.
 *
 * @param config - PostHog configuration options
 */
export function initPostHog(config: PostHogConfig): void {
  const {
    apiKey,
    host = 'https://app.posthog.com',
    captureApplicationLifecycleEvents = true,
    captureDeepLinks = true,
    flushAt = 20,
    flushInterval = 30000,
  } = config;

  // Skip initialization if API key is empty
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[PostHog] API key is empty, skipping initialization');
    return;
  }

  PostHog.init(apiKey, {
    host,
    captureApplicationLifecycleEvents,
    captureDeepLinks,
    flushAt,
    flushInterval,
    // Disable PostHog in development
    disableInDevelopment: getEnvironment() === 'development',
    // Record screen views
    recordScreenViews: true,
    // Record session
    recordSessions: getEnvironment() === 'production',
  });
}

/**
 * Track an event with properties.
 *
 * @param eventName - The name of the event to track
 * @param properties - Event properties
 */
export function trackEvent(
  eventName: string,
  properties: Partial<PostHogEventProperties> = {},
): void {
  // Enrich with base properties
  const enrichedProperties: PostHogEventProperties = {
    app_version: APP_VERSION,
    ...properties,
  } as PostHogEventProperties;

  PostHog.capture(eventName, enrichedProperties);
}

/**
 * Identify a user with properties.
 *
 * @param userId - User ID
 * @param properties - User properties
 */
export function identifyUser(userId: string, properties: PostHogUserProperties): void {
  PostHog.identify(userId, {
    ...properties,
    $set: properties,
  });
}

/**
 * Reset the user session (call on logout).
 */
export function resetUser(): void {
  PostHog.reset();
}

/**
 * Set a group (e.g., tenant) with properties.
 *
 * @param groupType - The type of group (e.g., 'tenant')
 * @param groupKey - The group identifier (e.g., tenant ID)
 * @param properties - Group properties
 */
export function setGroup(
  groupType: string,
  groupKey: string,
  properties: PostHogGroupProperties,
): void {
  PostHog.group(groupType, groupKey, {
    ...properties,
    $set: properties,
  });
}

/**
 * Track a screen view.
 *
 * @param screenName - Name of the screen
 * @param params - Screen parameters
 */
export function screen(screenName: string, params?: Record<string, unknown>): void {
  trackEvent('screen_viewed', {
    screen_name: screenName,
    params,
  } as PostHogEventProperties);
}

/**
 * Register super properties for all future events.
 *
 * @param properties - Properties to register
 */
export function register(properties: Record<string, unknown>): void {
  PostHog.register(properties);
}

/**
 * Alias a user ID to another ID (for cross-platform tracking).
 *
 * @param alias - The alias to set
 * @param userId - The user ID to alias
 */
export function alias(alias: string, userId: string): void {
  PostHog.alias(alias, userId);
}
