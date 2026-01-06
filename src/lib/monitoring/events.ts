/**
 * Event name constants for PostHog analytics.
 *
 * This module exports string constants for all tracked events to prevent typos
 * and enable autocomplete when tracking events.
 *
 * @module monitoring/events
 */

import type { PostHogEventName, PostHogEventPropertyMap } from './types';

/**
 * Auth event names.
 */
export const AUTH_EVENTS = {
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  TENANT_SWITCHED: 'tenant_switched',
} as const;

/**
 * Chat event names.
 */
export const CHAT_EVENTS = {
  MESSAGE_SENT: 'message_sent',
  CONVERSATION_OPENED: 'conversation_opened',
} as const;

/**
 * Prayer event names.
 */
export const PRAYER_EVENTS = {
  PRAYER_CARD_CREATED: 'prayer_card_created',
  PRAYER_ANSWERED: 'prayer_answered',
} as const;

/**
 * Pastoral journal event names.
 */
export const PASTORAL_EVENTS = {
  JOURNAL_SUBMITTED: 'journal_submitted',
  JOURNAL_REVIEWED: 'journal_reviewed',
} as const;

/**
 * Settings event names.
 */
export const SETTINGS_EVENTS = {
  LOCALE_CHANGED: 'locale_changed',
  NOTIFICATION_TOGGLED: 'notification_toggled',
} as const;

/**
 * Screen view event name.
 */
export const SCREEN_EVENTS = {
  SCREEN_VIEWED: 'screen_viewed',
} as const;

/**
 * All event constants combined for easy import.
 */
export const TRACKING_EVENTS = {
  ...AUTH_EVENTS,
  ...CHAT_EVENTS,
  ...PRAYER_EVENTS,
  ...PASTORAL_EVENTS,
  ...SETTINGS_EVENTS,
  ...SCREEN_EVENTS,
} as const;

/**
 * Type guard to check if a string is a valid event name.
 */
export function isValidEventName(eventName: string): eventName is PostHogEventName {
  return Object.values(TRACKING_EVENTS).includes(eventName as PostHogEventName);
}

/**
 * Get the type of properties expected for a given event name.
 */
export type EventProperties<T extends PostHogEventName> = PostHogEventPropertyMap[T];

/**
 * Helper to create a typed event object.
 */
export interface TypedEvent<T extends PostHogEventName> {
  eventName: T;
  properties: EventProperties<T>;
}

/**
 * Create a typed event object for tracking.
 */
export function createEvent<T extends PostHogEventName>(
  eventName: T,
  properties: EventProperties<T>,
): TypedEvent<T> {
  return { eventName, properties };
}
