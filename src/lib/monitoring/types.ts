/**
 * Monitoring and observability type definitions.
 *
 * This module defines TypeScript types for Sentry error tracking and PostHog analytics.
 * All event names and properties are type-safe to prevent typos and ensure consistency.
 *
 * @module monitoring/types
 */

import type { Role, Locale, ConversationType } from '@/types/database';

/**
 * Environment names for the application.
 */
export type Environment = 'development' | 'preview' | 'production';

/**
 * Sentry error categories for grouping and filtering errors.
 */
export enum SentryErrorCategory {
  AUTH = 'auth',
  NETWORK = 'network',
  DATABASE = 'database',
  PUSH = 'push',
  REALTIME = 'realtime',
  UI = 'ui',
}

/**
 * Sentry severity levels for error classification.
 */
export enum SentrySeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Context tags attached to all Sentry events for filtering and grouping.
 */
export interface SentryContextTags {
  tenant_id?: string;
  user_role?: Role;
  locale?: Locale;
  app_version: string;
  environment: Environment;
}

/**
 * User context for Sentry error tracking.
 */
export interface SentryUserContext {
  id: string;
  tenant_id?: string;
  role?: Role;
  locale?: Locale;
  email?: string;
  username?: string;
}

/**
 * Additional context data for Sentry errors.
 */
export interface SentryErrorContext {
  tenant_id?: string;
  user_role?: Role;
  locale?: Locale;
  [key: string]: unknown;
}

/**
 * Breadcrumb categories for tracking user actions leading to errors.
 */
export enum BreadcrumbCategory {
  NAVIGATION = 'navigation',
  USER = 'user',
  HTTP = 'http',
  STATE = 'state',
}

/**
 * Breadcrumb types for Sentry.
 */
export enum BreadcrumbType {
  DEFAULT = 'default',
  NAVIGATION = 'navigation',
  HTTP = 'http',
  USER = 'user',
}

/**
 * Breadcrumb data structure.
 */
export interface BreadcrumbData {
  category?: BreadcrumbCategory;
  type?: BreadcrumbType;
  level?: SentrySeverity;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * PostHog event name constants (string literal union type).
 * These are the only valid event names that can be tracked in PostHog.
 */
export type PostHogEventName =
  // Auth events
  | 'user_signed_in'
  | 'user_signed_out'
  | 'tenant_switched'
  // Chat events
  | 'message_sent'
  | 'conversation_opened'
  // Prayer events
  | 'prayer_card_created'
  | 'prayer_answered'
  // Pastoral events
  | 'journal_submitted'
  | 'journal_reviewed'
  // Settings events
  | 'locale_changed'
  | 'notification_toggled'
  // Screen view events
  | 'screen_viewed';

/**
 * Base properties included in all PostHog events.
 */
export interface PostHogBaseProperties {
  tenant_id?: string;
  locale?: Locale;
  app_version: string;
}

/**
 * Properties for authentication-related events.
 */
export interface PostHogAuthProperties extends PostHogBaseProperties {
  method?: 'email' | 'magic_link' | 'sso';
  tenant_id?: string;
}

/**
 * Properties for tenant switch events.
 */
export interface PostHogTenantSwitchProperties extends PostHogBaseProperties {
  from_tenant?: string;
  to_tenant?: string;
  tenant_name?: string;
}

/**
 * Properties for chat-related events.
 */
export interface PostHogChatProperties extends PostHogBaseProperties {
  conversation_type?: ConversationType;
  has_attachment?: boolean;
  is_event_chat?: boolean;
  message_count?: number;
  conversation_id?: string;
}

/**
 * Properties for prayer-related events.
 */
export interface PostHogPrayerProperties extends PostHogBaseProperties {
  recipient_scope?: 'individual' | 'small_group' | 'church_wide';
  has_attachment?: boolean;
  days_since_created?: number;
  prayer_card_id?: string;
}

/**
 * Properties for pastoral journal events.
 */
export interface PostHogPastoralProperties extends PostHogBaseProperties {
  week_number?: number;
  content_length?: number;
  reviewer_role?: Role;
  days_since_submitted?: number;
  journal_id?: string;
}

/**
 * Properties for settings-related events.
 */
export interface PostHogSettingsProperties extends PostHogBaseProperties {
  from_locale?: Locale;
  to_locale?: Locale;
  type?: string;
  enabled?: boolean;
}

/**
 * Properties for screen view events.
 */
export interface PostHogScreenProperties extends PostHogBaseProperties {
  screen_name: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Union type for all PostHog event properties.
 */
export type PostHogEventProperties =
  | PostHogAuthProperties
  | PostHogTenantSwitchProperties
  | PostHogChatProperties
  | PostHogPrayerProperties
  | PostHogPastoralProperties
  | PostHogSettingsProperties
  | PostHogScreenProperties;

/**
 * User properties for PostHog user identification.
 */
export interface PostHogUserProperties {
  tenant_count: number;
  primary_role: Role;
  locale: Locale;
  created_at: string; // ISO timestamp
  email?: string;
  display_name?: string;
}

/**
 * Group properties for PostHog group analytics (tenants).
 */
export interface PostHogGroupProperties {
  name: string;
  member_count: number;
  created_at: string; // ISO timestamp
}

/**
 * Event property mapping for type-safe event tracking.
 */
export interface PostHogEventPropertyMap {
  user_signed_in: PostHogAuthProperties;
  user_signed_out: PostHogBaseProperties;
  tenant_switched: PostHogTenantSwitchProperties;
  message_sent: PostHogChatProperties;
  conversation_opened: PostHogChatProperties;
  prayer_card_created: PostHogPrayerProperties;
  prayer_answered: PostHogPrayerProperties;
  journal_submitted: PostHogPastoralProperties;
  journal_reviewed: PostHogPastoralProperties;
  locale_changed: PostHogSettingsProperties;
  notification_toggled: PostHogSettingsProperties;
  screen_viewed: PostHogScreenProperties;
}

/**
 * API call tracking properties.
 */
export interface ApiCallTrackingOptions {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  status: number;
  duration_ms: number;
  success: boolean;
  error_code?: string;
}

/**
 * Navigation tracking properties.
 */
export interface NavigationTrackingOptions {
  screen_name: string;
  params?: Record<string, unknown>;
  from_screen?: string;
}

/**
 * Monitoring configuration options.
 */
export interface MonitoringConfig {
  sentryDsn: string;
  sentryEnvironment: Environment;
  postHogApiKey: string;
  postHogHost?: string;
  appVersion: string;
  release?: string;
  dist?: string;
  enabled: boolean;
  sampleRate: number;
  tracesSampleRate: number;
}
