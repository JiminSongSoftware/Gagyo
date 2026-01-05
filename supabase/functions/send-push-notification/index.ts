/**
 * Send Push Notification Edge Function
 *
 * Sends push notifications to Expo devices for specified recipients.
 * Handles batching, rate limiting, token cleanup, and logging.
 *
 * Environment Variables:
 * - EXPO_PROJECT_ID: Expo project ID for push notifications
 * - EXPO_ACCESS_TOKEN: Expo access token for API authentication
 *
 * @see claude_docs/06_push_notifications.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================================================
// TYPES
// ============================================================================

interface DeviceToken {
  id: string;
  tenant_id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  revoked_at: string | null;
}

interface Membership {
  id: string;
  user_id: string;
  tenant_id: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
}

interface SendPushRequest {
  tenant_id: string;
  notification_type: NotificationType;
  recipients: {
    user_ids: string[];
    conversation_id?: string;
    exclude_user_ids?: string[];
  };
  payload: NotificationPayload;
  options?: NotificationOptions;
}

type NotificationType =
  | 'new_message'
  | 'mention'
  | 'prayer_answered'
  | 'pastoral_journal_submitted'
  | 'pastoral_journal_forwarded'
  | 'pastoral_journal_confirmed';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string | number>;
}

interface NotificationOptions {
  priority?: 'normal' | 'high';
  sound?: 'default' | 'default_critical' | null;
  badge?: number | null;
}

interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, string | number>;
  sound?: string;
  priority?: 'normal' | 'high';
  badge?: number | null;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  message: string;
  details?: {
    error?: string;
    deviceNotRegistered?: boolean;
  };
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
}

interface RateLimitEntry {
  count: number;
  reset_at: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const EXPO_PROJECT_ID = Deno.env.get('EXPO_PROJECT_ID');
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BATCH_SIZE = 100;
const MAX_REQUESTS_PER_MINUTE = 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// In-memory rate limit tracking (for single-instance deployment)
// For multi-instance, use Redis or similar
const rateLimitMap = new Map<string, RateLimitEntry>();

// ============================================================================
// EXPO API CLIENT
// ============================================================================

class ExpoClient {
  private readonly baseUrl = 'https://exp.host/--/api/v2/push/send';

  async sendPushNotificationsAsync(messages: ExpoPushMessage[]): Promise<ExpoPushResponse> {
    if (messages.length === 0) {
      return { data: [] };
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
        'Expo-Project-ID': EXPO_PROJECT_ID || '',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkRateLimit(tenantId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(tenantId);

  if (!entry || now > entry.reset_at) {
    // Create or reset rate limit entry
    rateLimitMap.set(tenantId, {
      count: 1,
      reset_at: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    const retryAfter = Math.ceil((entry.reset_at - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get active device tokens for specified users in tenant
 */
async function getDeviceTokens(tenantId: string, userIds: string[]): Promise<DeviceToken[]> {
  const { data, error } = await supabase
    .from('device_tokens')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('user_id', userIds)
    .is('revoked_at', null)
    .gte('last_used_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

  if (error) {
    throw new Error(`Failed to fetch device tokens: ${error.message}`);
  }

  return data || [];
}

/**
 * Get active membership IDs for users in tenant
 */
async function getActiveMembershipIds(tenantId: string, userIds: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('user_id', userIds)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to fetch memberships: ${error.message}`);
  }

  return (data || []).map((m) => m.id);
}

/**
 * Get event chat exclusions for a conversation
 */
async function getEventChatExclusions(conversationId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_chat_exclusions')
    .select('excluded_membership_id')
    .in('message_id', select(`id`).from('messages').eq('conversation_id', conversationId));

  if (error) {
    // If table doesn't exist or query fails, return empty array
    return [];
  }

  return (data || []).map((e) => e.excluded_membership_id);
}

/**
 * Delete a device token (called when Expo reports it as invalid)
 */
async function deleteInvalidToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('device_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token);

  if (error) {
    console.error(`Failed to revoke token ${token}: ${error.message}`);
  }
}

/**
 * Log push notification attempt
 */
async function logPushNotification(
  tenantId: string,
  notificationType: string,
  recipientCount: number,
  sentCount: number,
  failedCount: number,
  errorSummary: Record<string, unknown> | null
): Promise<void> {
  const { error } = await supabase.from('push_notification_logs').insert({
    tenant_id: tenantId,
    notification_type: notificationType,
    recipient_count: recipientCount,
    sent_count: sentCount,
    failed_count: failedCount,
    error_summary: errorSummary as Json | null,
  });

  if (error) {
    console.error(`Failed to log push notification: ${error.message}`);
  }
}

/**
 * Build Expo push message from payload and token
 */
function buildExpoMessage(
  token: string,
  payload: NotificationPayload,
  options: NotificationOptions = {}
): ExpoPushMessage {
  const message: ExpoPushMessage = {
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    sound: options.sound ?? 'default',
    priority: options.priority ?? 'normal',
    badge: options.badge ?? null,
  };

  // Critical mentions get higher priority
  if (options.priority === 'high') {
    message.priority = 'high';
  }

  return message;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function handleSendPush(request: SendPushRequest): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const { tenant_id, notification_type, recipients, payload, options = {} } = request;

  // Check rate limit
  const rateLimit = checkRateLimit(tenant_id);
  if (!rateLimit.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`);
  }

  // Validate notification type
  const validTypes: NotificationType[] = [
    'new_message',
    'mention',
    'prayer_answered',
    'pastoral_journal_submitted',
    'pastoral_journal_forwarded',
    'pastoral_journal_confirmed',
  ];

  if (!validTypes.includes(notification_type)) {
    throw new Error(`Invalid notification_type: ${notification_type}`);
  }

  // Get active membership IDs for recipient users
  const activeMembershipIds = await getActiveMembershipIds(tenant_id, recipients.user_ids);

  let targetMembershipIds = activeMembershipIds;

  // Apply exclusions for event chat
  if (recipients.conversation_id) {
    const excludedMembershipIds = await getEventChatExclusions(recipients.conversation_id);
    targetMembershipIds = activeMembershipIds.filter((id) => !excludedMembershipIds.includes(id));
  }

  // Apply explicit exclusions
  if (recipients.exclude_user_ids && recipients.exclude_user_ids.length > 0) {
    const excludeMembershipIds = await getActiveMembershipIds(
      tenant_id,
      recipients.exclude_user_ids
    );
    targetMembershipIds = targetMembershipIds.filter((id) => !excludeMembershipIds.includes(id));
  }

  if (targetMembershipIds.length === 0) {
    return { success: true, sent: 0, failed: 0, errors: [] };
  }

  // Get device tokens for target memberships
  const tokens = await getDeviceTokens(tenant_id, recipients.user_ids);
  const validTokens = tokens.filter((t) => targetMembershipIds.some((id) => id === t.user_id));

  if (validTokens.length === 0) {
    return { success: true, sent: 0, failed: 0, errors: [] };
  }

  // Build Expo messages
  const messages = validTokens.map((token) => buildExpoMessage(token.token, payload, options));

  // Send in batches
  const expoClient = new ExpoClient();
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      const response = await expoClient.sendPushNotificationsAsync(batch);

      for (let j = 0; j < response.data.length; j++) {
        const ticket = response.data[j];

        if (ticket.status === 'ok') {
          sentCount++;
        } else if (ticket.status === 'error') {
          failedCount++;
          const errorMsg = ticket.details?.error || ticket.message;
          errors.push(errorMsg);

          // Mark device tokens as revoked if Expo reports them invalid
          if (
            ticket.details?.deviceNotRegistered ||
            errorMsg === 'DeviceNotRegistered' ||
            errorMsg.includes('invalid')
          ) {
            const tokenIdx = i + j;
            if (messages[tokenIdx]) {
              invalidTokens.push(messages[tokenIdx].to as string);
            }
          }
        }
      }
    } catch (error) {
      const batchError = error instanceof Error ? error.message : String(error);
      errors.push(batchError);
      failedCount += batch.length;
    }
  }

  // Clean up invalid tokens
  for (const token of invalidTokens) {
    await deleteInvalidToken(token);
  }

  // Log the push notification attempt
  await logPushNotification(
    tenant_id,
    notification_type,
    validTokens.length,
    sentCount,
    failedCount,
    errors.length > 0 ? { errors, invalidTokens } : null
  );

  return {
    success: failedCount === 0,
    sent: sentCount,
    failed: failedCount,
    errors,
  };
}

// ============================================================================
// SERVE HANDLER
// ============================================================================

serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response('Invalid authorization token', { status: 401 });
    }

    // Parse request body
    const body: SendPushRequest = await req.json();

    // Validate required fields
    if (!body.tenant_id || !body.notification_type || !body.recipients || !body.payload) {
      return new Response(
        'Missing required fields: tenant_id, notification_type, recipients, payload',
        { status: 400 }
      );
    }

    if (!Array.isArray(body.recipients.user_ids) || body.recipients.user_ids.length === 0) {
      return new Response('recipients.user_ids must be a non-empty array', { status: 400 });
    }

    // Process the push notification
    const result = await handleSendPush(body);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 207, // 207 for partial success
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-push-notification:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const status = errorMessage.includes('Rate limit exceeded') ? 429 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// TYPE EXPORTS FOR TESTING
// ============================================================================

export type {
  DeviceToken,
  Membership,
  SendPushRequest,
  NotificationType,
  NotificationPayload,
  NotificationOptions,
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushResponse,
  RateLimitEntry,
};
