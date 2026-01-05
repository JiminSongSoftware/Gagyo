/**
 * Push Notifications Feature
 *
 * Exports hooks and utilities for push notification functionality.
 *
 * @module features/notifications
 */

export { useDeviceToken } from './useDeviceToken';
export type { DeviceTokenState, DeviceTokenActions, UseDeviceTokenOptions } from './useDeviceToken';

export {
  useNotificationHandler,
  registerURLScheme,
  parseDeepLinkFromData,
} from './useNotificationHandler';
export type {
  NotificationType,
  NotificationData,
  ParsedNotification,
  NotificationHandlerState,
  NotificationHandlerActions,
  UseNotificationHandlerOptions,
} from './useNotificationHandler';
