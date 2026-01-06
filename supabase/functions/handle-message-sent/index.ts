/**
 * Handle Message Sent Edge Function
 *
 * Triggered when a new message is created. Sends push notifications
 * to conversation participants, with special handling for mentions
 * and event chat exclusions.
 *
 * Environment Variables:
 * - SEND_PUSH_NOTIFICATION_URL: URL of the send-push-notification function
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for authorization
 *
 * @see claude_docs/06_push_notifications.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createLogger } from '../_shared/logger.ts';

// Create logger instance
const log = createLogger('handle-message-sent');

// ============================================================================
// TYPES
// ============================================================================

interface MessageRow {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sender_id: string;
  parent_id: string | null;
  thread_id: string | null;
  content: string | null;
  content_type: 'text' | 'image' | 'prayer_card' | 'system';
  is_event_chat: boolean;
  created_at: string;
}

interface ConversationRow {
  id: string;
  tenant_id: string;
  type: 'direct' | 'small_group' | 'ministry' | 'church_wide';
  name: string | null;
  small_group_id: string | null;
  ministry_id: string | null;
}

interface ConversationParticipantRow {
  id: string;
  conversation_id: string;
  membership_id: string;
  last_read_at: string | null;
}

interface MembershipRow {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  user: {
    id: string;
    display_name: string | null;
    locale: 'en' | 'ko';
  };
}

interface EventChatExclusionRow {
  id: string;
  message_id: string;
  excluded_membership_id: string;
}

interface MentionRow {
  id: string;
  message_id: string;
  membership_id: string;
  membership: {
    user: {
      display_name: string | null;
      locale: 'en' | 'ko';
    };
  };
}

interface SendPushRequest {
  tenant_id: string;
  notification_type: 'new_message' | 'mention';
  recipients: {
    user_ids: string[];
    conversation_id?: string;
    exclude_user_ids?: string[];
  };
  payload: {
    title: string;
    body: string;
    data: Record<string, string>;
  };
  options?: {
    priority?: 'normal' | 'high';
    sound?: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SEND_PUSH_FUNCTION_URL =
  Deno.env.get('SEND_PUSH_NOTIFICATION_URL') ||
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MENTION_REGEX = /@(\w+(?:\s+\w+)*)/g;

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================================
// I18N MESSAGES
// ============================================================================

const i18n = {
  en: {
    new_message: '{senderName}',
    mention: 'Mentioned by {senderName}',
    attachment: '[Attachment]',
    prayer_card: '[Prayer Card]',
    system: '[System]',
  },
  ko: {
    new_message: '{senderName}',
    mention: '{senderName}님이 멘션함',
    attachment: '[첨부파일]',
    prayer_card: '[기도 카드]',
    system: '[시스템]',
  },
};

function getMessage(key: string, locale: 'en' | 'ko' = 'en'): string {
  return i18n[locale]?.[key] || i18n.en[key] || key;
}

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || '');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch message with sender information
 */
async function getMessageWithSender(messageId: string): Promise<MessageRow | null> {
  const { data, error } = await supabase
    .from('messages')
    .select(
      `
      *,
      sender:membership_id!messages_sender_id_fkey (
        user_id,
        user:users!memberships_user_id_fkey (
          id,
          display_name,
          locale
        )
      )
    `
    )
    .eq('id', messageId)
    .single();

  if (error) {
    log.error('failed_to_fetch_message', { message_id: messageId, error: error.message });
    return null;
  }

  return data as unknown as MessageRow | null;
}

/**
 * Fetch conversation details
 */
async function getConversation(conversationId: string): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    log.error('failed_to_fetch_conversation', {
      conversation_id: conversationId,
      error: error.message,
    });
    return null;
  }

  return data;
}

/**
 * Fetch conversation participants with their membership and user info
 */
async function getConversationParticipants(
  conversationId: string
): Promise<(ConversationParticipantRow & { membership: MembershipRow })[]> {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(
      `
      *,
      membership:membership_id (
        id,
        user_id,
        tenant_id,
        role,
        status,
        user:users!memberships_user_id_fkey (
          id,
          display_name,
          locale
        )
      )
    `
    )
    .eq('conversation_id', conversationId);

  if (error) {
    log.error('failed_to_fetch_participants', {
      conversation_id: conversationId,
      error: error.message,
    });
    return [];
  }

  return (data || []) as unknown as (ConversationParticipantRow & { membership: MembershipRow })[];
}

/**
 * Fetch mentions for a message
 */
async function getMessageMentions(messageId: string): Promise<MentionRow[]> {
  const { data, error } = await supabase
    .from('mentions')
    .select(
      `
      *,
      membership:membership_id (
        user:users!memberships_user_id_fkey (
          display_name,
          locale
        )
      )
    `
    )
    .eq('message_id', messageId);

  if (error) {
    log.error('failed_to_fetch_mentions', { message_id: messageId, error: error.message });
    return [];
  }

  return (data || []) as MentionRow[];
}

/**
 * Fetch event chat exclusions for a conversation's messages
 */
async function getEventChatExclusions(conversationId: string): Promise<EventChatExclusionRow[]> {
  const { data, error } = await supabase
    .from('event_chat_exclusions')
    .select('*')
    .in('message_id', supabase.from('messages').select('id').eq('conversation_id', conversationId));

  if (error) {
    log.error('failed_to_fetch_exclusions', {
      conversation_id: conversationId,
      error: error.message,
    });
    return [];
  }

  return (data || []) as EventChatExclusionRow[];
}

/**
 * Detect mentions in message content
 */
function detectMentions(content: string | null): string[] {
  if (!content) return [];

  const mentions: string[] = [];
  const matches = content.matchAll(MENTION_REGEX);

  for (const match of matches) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Build notification content based on message type and locale
 */
function buildNotificationContent(
  message: MessageRow,
  senderName: string,
  locale: 'en' | 'ko' = 'en',
  isMention = false
): { title: string; body: string } {
  let body = '';

  // Handle content type
  switch (message.content_type) {
    case 'image':
      body = getMessage('attachment', locale);
      break;
    case 'prayer_card':
      body = getMessage('prayer_card', locale);
      break;
    case 'system':
      body = getMessage('system', locale);
      break;
    case 'text':
    default:
      // Truncate text content to 100 characters
      body = message.content?.slice(0, 100) || '';
      if (message.content && message.content.length > 100) {
        body += '...';
      }
      break;
  }

  // Build title
  let title: string;
  if (isMention) {
    title = interpolate(getMessage('mention', locale), { senderName });
  } else {
    title = senderName;
  }

  return { title, body };
}

/**
 * Send push notification via send-push-notification function
 */
async function sendPushNotification(request: SendPushRequest): Promise<Response> {
  return await fetch(SEND_PUSH_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(request),
  });
}

/**
 * Check if a participant should receive a notification
 */
function shouldNotifyParticipant(
  participantId: string,
  senderMembershipId: string,
  excludedMembershipIds: Set<string>,
  participantUserIds?: Set<string>
): boolean {
  // Don't notify sender
  if (participantId === senderMembershipId) {
    return false;
  }

  // Check event chat exclusions
  if (excludedMembershipIds.has(participantId)) {
    return false;
  }

  // Check user-level exclusions (for mentions)
  if (participantUserIds) {
    const participantUserId = participantUserIds.has(participantId);
    if (participantUserId) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function handleMessageSent(messageId: string): Promise<{
  success: boolean;
  notified: number;
  errors: string[];
}> {
  // Fetch message with sender info
  const message = await getMessageWithSender(messageId);
  if (!message) {
    return { success: false, notified: 0, errors: ['Message not found'] };
  }

  // Fetch conversation details
  const conversation = await getConversation(message.conversation_id);
  if (!conversation) {
    return { success: false, notified: 0, errors: ['Conversation not found'] };
  }

  // Fetch participants
  const participants = await getConversationParticipants(message.conversation_id);
  const activeParticipants = participants.filter((p) => p.membership.status === 'active');

  if (activeParticipants.length === 0) {
    return { success: true, notified: 0, errors: [] };
  }

  // Fetch mentions for this message
  const mentions = await getMessageMentions(messageId);

  // Fetch event chat exclusions if this is event chat
  let excludedMembershipIds = new Set<string>();
  if (message.is_event_chat) {
    const exclusions = await getEventChatExclusions(message.conversation_id);
    excludedMembershipIds = new Set(exclusions.map((e) => e.excluded_membership_id));
  }

  const senderMembership = activeParticipants.find(
    (p) => p.membership.user_id === message.sender_id
  );
  const senderMembershipId = senderMembership?.id || '';
  const senderName = senderMembership?.membership.user?.display_name || 'Someone';
  const senderLocale = senderMembership?.membership.user?.locale || 'en';

  // Build notification data (common to all notifications)
  const notificationData: Record<string, string> = {
    conversation_id: message.conversation_id,
    tenant_id: message.tenant_id,
    message_id: message.id,
  };

  // Add thread_id if present
  if (message.thread_id) {
    notificationData.thread_id = message.thread_id;
  }

  // Send mention notifications (higher priority)
  if (mentions.length > 0) {
    const mentionedUserIds = new Set(
      mentions.map((m) => m.membership.user?.display_name || '').filter(Boolean)
    );

    const mentionRecipients = activeParticipants.filter(
      (p) =>
        mentionedUserIds.has(p.membership.user?.display_name || '') &&
        shouldNotifyParticipant(p.id, senderMembershipId, excludedMembershipIds)
    );

    for (const recipient of mentionRecipients) {
      const locale = recipient.membership.user?.locale || 'en';
      const { title, body } = buildNotificationContent(message, senderName, locale, true);

      await sendPushNotification({
        tenant_id: message.tenant_id,
        notification_type: 'mention',
        recipients: {
          user_ids: [recipient.membership.user_id],
          conversation_id: message.conversation_id,
        },
        payload: {
          title,
          body,
          data: notificationData,
        },
        options: {
          priority: 'high',
          sound: 'default',
        },
      });
    }
  }

  // Send regular message notifications (excluding mentioned users who already got notified)
  const mentionedMembershipIds = new Set(mentions.map((m) => m.membership_id));
  const regularRecipients = activeParticipants.filter(
    (p) =>
      !mentionedMembershipIds.has(p.id) &&
      shouldNotifyParticipant(p.id, senderMembershipId, excludedMembershipIds)
  );

  if (regularRecipients.length > 0) {
    // Group by locale to send localized notifications
    const recipientsByLocale = new Map<'en' | 'ko', typeof regularRecipients>();

    for (const recipient of regularRecipients) {
      const locale = recipient.membership.user?.locale || 'en';
      if (!recipientsByLocale.has(locale)) {
        recipientsByLocale.set(locale, []);
      }
      recipientsByLocale.get(locale)!.push(recipient);
    }

    for (const [locale, recipients] of recipientsByLocale) {
      const { title, body } = buildNotificationContent(message, senderName, locale, false);

      await sendPushNotification({
        tenant_id: message.tenant_id,
        notification_type: 'new_message',
        recipients: {
          user_ids: recipients.map((r) => r.membership.user_id),
          conversation_id: message.conversation_id,
        },
        payload: {
          title,
          body,
          data: notificationData,
        },
      });
    }
  }

  return {
    success: true,
    notified: mentions.length + regularRecipients.length,
    errors: [],
  };
}

// ============================================================================
// SERVE HANDLER
// ============================================================================

serve(async (req) => {
  // Generate request tracking
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

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
    // Parse request body early for logging
    const body = await req.json();
    const { message_id } = body;

    // Log function start
    log.info('function_started', {
      request_id: requestId,
      message_id,
      function_name: 'handle-message-sent',
      input_size: JSON.stringify(body).length,
    });

    // Verify Authorization header (service role only)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== SERVICE_ROLE_KEY) {
      // Verify using Supabase auth
      const { error } = await supabase.auth.getUser(token);
      if (error) {
        return new Response('Invalid authorization token', { status: 401 });
      }
    }

    if (!message_id) {
      return new Response('Missing required field: message_id', { status: 400 });
    }

    // Process the message
    const result = await handleMessageSent(message_id);

    // Log function completion
    log.info('function_completed', {
      request_id: requestId,
      duration_ms: Math.round(performance.now() - startTime),
      result: 'success',
      notified_count: result.notified,
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    log.error('error_occurred', {
      request_id: requestId,
      error: errorMessage,
      stack: errorStack,
      duration_ms: Math.round(performance.now() - startTime),
    });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// TYPE EXPORTS FOR TESTING
// ============================================================================

export type {
  MessageRow,
  ConversationRow,
  ConversationParticipantRow,
  MembershipRow,
  EventChatExclusionRow,
  MentionRow,
  SendPushRequest,
};
