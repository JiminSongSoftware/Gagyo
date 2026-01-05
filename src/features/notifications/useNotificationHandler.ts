/**
 * useNotificationHandler Hook
 *
 * Handles incoming push notifications and deep linking navigation.
 *
 * Features:
 * - Cold start notification handling (app launched from notification)
 * - Background/active app notification handling
 * - Tenant context switching before navigation
 * - Deep link parsing and navigation
 * - In-app notification banner for active app state
 *
 * @see claude_docs/06_push_notifications.md
 */

import { useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { useTenantStore } from '@/stores/tenantStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | 'new_message'
  | 'mention'
  | 'prayer_answered'
  | 'pastoral_journal_submitted'
  | 'pastoral_journal_forwarded'
  | 'pastoral_journal_confirmed';

export interface NotificationData {
  type?: NotificationType;
  conversation_id?: string;
  tenant_id?: string;
  message_id?: string;
  thread_id?: string;
  prayer_card_id?: string;
  journal_id?: string;
  small_group_id?: string;
}

export interface ParsedNotification {
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
}

export interface NotificationHandlerState {
  lastNotification: ParsedNotification | null;
  isProcessing: boolean;
}

export interface NotificationHandlerActions {
  handleNotificationResponse: (response: Notifications.NotificationResponse) => Promise<void>;
  processInitialNotification: () => Promise<void>;
}

export interface UseNotificationHandlerOptions {
  /**
   * Whether to show in-app banner when app is active
   * @default true
   */
  showInAppBanner?: boolean;

  /**
   * Custom banner component render function
   */
  renderBanner?: (notification: ParsedNotification) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse notification data from Expo notification response
 */
function parseNotification(
  response: Notifications.NotificationResponse
): ParsedNotification | null {
  const notification = response.notification.request.content;

  if (!notification.data) {
    return null;
  }

  const data = notification.data as NotificationData;

  return {
    type: data.type || 'new_message',
    title: notification.title || '',
    body: notification.body || '',
    data,
  };
}

/**
 * Build deep link URL for notification type
 */
function buildDeepLink(notification: ParsedNotification): string | null {
  const { type, data } = notification;

  switch (type) {
    case 'new_message':
    case 'mention':
      if (data.conversation_id) {
        const baseUrl = `/chat/${data.conversation_id}`;
        const params = new URLSearchParams();
        if (data.message_id) {
          params.append('messageId', data.message_id);
        }
        if (data.thread_id) {
          params.append('threadId', data.thread_id);
        }
        return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
      }
      return null;

    case 'prayer_answered':
      if (data.prayer_card_id) {
        return `/prayer/${data.prayer_card_id}`;
      }
      return null;

    case 'pastoral_journal_submitted':
    case 'pastoral_journal_forwarded':
    case 'pastoral_journal_confirmed':
      if (data.journal_id) {
        return `/pastoral/${data.journal_id}`;
      }
      return null;

    default:
      return null;
  }
}

/**
 * Verify user has active membership in tenant
 */
async function verifyTenantMembership(tenantId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return !error && !!data;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNotificationHandler(
  options: UseNotificationHandlerOptions = {}
): NotificationHandlerState & NotificationHandlerActions {
  const { showInAppBanner = true, renderBanner } = options;

  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();
  const { activeTenantId, setActiveTenantId } = useTenantStore();

  const lastNotificationRef = useRef<ParsedNotification | null>(null);
  const isProcessingRef = useRef(false);

  /**
   * Navigate to the deep link target with tenant context switching
   */
  const navigateToTarget = useCallback(
    async (notification: ParsedNotification) => {
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;

      try {
        const { data } = notification;

        // Check if tenant switch is needed
        if (data.tenant_id && data.tenant_id !== activeTenantId) {
          // Verify user has access to target tenant
          if (user) {
            const hasAccess = await verifyTenantMembership(data.tenant_id, user.id);

            if (hasAccess) {
              // Switch tenant context
              void setActiveTenantId(data.tenant_id);
            } else {
              console.warn(`User does not have access to tenant ${data.tenant_id}`);
              // Navigate to home and show error
              router.replace('/(tabs)');
              return;
            }
          }
        }

        // Build and navigate to deep link
        const deepLink = buildDeepLink(notification);

        if (deepLink) {
          // Check if we're in the same route to avoid unnecessary navigation
          const currentPath = `/${segments.join('/')}`;
          const targetPath = deepLink.split('?')[0];

          if (currentPath !== targetPath) {
            router.replace(deepLink);
          }
        }
      } catch {
        console.error('Error navigating to notification target');
      } finally {
        isProcessingRef.current = false;
      }
    },
    [activeTenantId, router, segments, user, setActiveTenantId]
  );

  /**
   * Handle notification response (user tapped notification)
   */
  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const notification = parseNotification(response);

      if (!notification) {
        return;
      }

      lastNotificationRef.current = notification;

      // Navigate to target
      await navigateToTarget(notification);
    },
    [navigateToTarget]
  );

  /**
   * Process initial notification (cold start from notification)
   */
  const processInitialNotification = useCallback(async () => {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();

      if (response) {
        await handleNotificationResponse(response);
      }
    } catch {
      console.error('Error processing initial notification');
    }
  }, [handleNotificationResponse]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Set up notification listener for background/active app notifications
   */
  useEffect(() => {
    let subscription: Notifications.Subscription;

    const setupListener = async () => {
      subscription = Notifications.addNotificationReceivedListener((notification) => {
        const parsed = parseNotification({ notification } as Notifications.NotificationResponse);

        if (!parsed) {
          return;
        }

        lastNotificationRef.current = parsed;

        // If app is active, show in-app banner
        if (showInAppBanner && notification.request.trigger.type === 'push') {
          if (renderBanner) {
            renderBanner(parsed);
          }
          // TODO: Show default in-app notification banner
          // This can be implemented with a Toast or custom banner component
        }
      });

      // Listen for notification response (tap)
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          void handleNotificationResponse(response);
        }
      );

      return () => {
        subscription?.remove();
        responseSubscription.remove();
      };
    };

    void setupListener();
  }, [showInAppBanner, renderBanner, handleNotificationResponse]);

  /**
   * Configure notification behavior for iOS
   */
  useEffect(() => {
    if (Platform.OS === 'ios') {
      void Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
        handleSuccess: () => ({}),
        handleError: () => ({}),
      });
    }
  }, []);

  return {
    lastNotification: lastNotificationRef.current,
    isProcessing: isProcessingRef.current,
    handleNotificationResponse,
    processInitialNotification,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Register URL scheme for deep linking
 * Call this once during app initialization
 */
export async function registerURLScheme(): Promise<void> {
  if (Platform.OS === 'ios') {
    // URL scheme is configured in app.config.js
    // No additional setup needed for iOS
    return;
  }

  // Android: Intent filters are configured in AndroidManifest.xml
  // No additional setup needed for Android
}

/**
 * Parse deep link URL from notification data
 * Utility for custom notification handling
 */
export function parseDeepLinkFromData(data: NotificationData): string | null {
  const notification: ParsedNotification = {
    type: data.type || 'new_message',
    title: '',
    body: '',
    data,
  };

  return buildDeepLink(notification);
}
