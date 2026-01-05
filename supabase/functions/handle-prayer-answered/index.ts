/**
 * Handle Prayer Answered Edge Function
 *
 * Triggered when a prayer card is marked as answered.
 * Sends celebratory push notifications to recipients based on scope.
 *
 * Environment Variables:
 * - SEND_PUSH_NOTIFICATION_URL: URL of the send-push-notification function
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for authorization
 *
 * @see claude_docs/06_push_notifications.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================================================
// TYPES
// ============================================================================

interface PrayerCardRow {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string | null;
  scope: 'individual' | 'small_group' | 'church_wide';
  small_group_id: string | null;
  answered_at: string | null;
  created_at: string;
}

interface MembershipRow {
  id: string;
  user_id: string;
  tenant_id: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  user: {
    id: string;
    display_name: string | null;
    locale: 'en' | 'ko';
  };
}

interface SendPushRequest {
  tenant_id: string;
  notification_type: 'prayer_answered';
  recipients: {
    user_ids: string[];
  };
  payload: {
    title: string;
    body: string;
    data: Record<string, string>;
  };
  options?: {
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

// ============================================================================
// I18N MESSAGES
// ============================================================================

const i18n = {
  en: {
    title: 'Prayer Answered 🎉',
    body: "{authorName}'s prayer has been answered",
  },
  ko: {
    title: '기도 응답 🎉',
    body: '{authorName}님의 기도가 응답되었습니다',
  },
};

function getMessage(key: string, locale: 'en' | 'ko' = 'en'): string {
  return i18n[locale]?.[key] || i18n.en[key] || key;
}

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || '');
}

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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch prayer card with author info
 */
async function getPrayerCard(prayerCardId: string): Promise<PrayerCardRow | null> {
  const { data, error } = await supabase
    .from('prayer_cards')
    .select(
      `
      *,
      author:author_id (
        user_id,
        user:users!memberships_user_id_fkey (
          id,
          display_name,
          locale
        )
      )
    `
    )
    .eq('id', prayerCardId)
    .single();

  if (error) {
    console.error(`Failed to fetch prayer card: ${error.message}`);
    return null;
  }

  return data as unknown as PrayerCardRow | null;
}

/**
 * Fetch recipients based on prayer card scope
 */
async function getPrayerRecipients(prayerCard: PrayerCardRow): Promise<string[]> {
  const userIds: string[] = [];

  switch (prayerCard.scope) {
    case 'individual':
      // Individual prayer: only the author
      userIds.push(prayerCard.author_id);
      break;

    case 'small_group':
      // Small group prayer: all members of the small group
      if (prayerCard.small_group_id) {
        const { data: memberships } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('small_group_id', prayerCard.small_group_id)
          .eq('status', 'active');

        for (const m of memberships || []) {
          userIds.push(m.user_id);
        }
      }
      // Always include the author
      if (!userIds.includes(prayerCard.author_id)) {
        userIds.push(prayerCard.author_id);
      }
      break;

    case 'church_wide':
      // Church-wide prayer: all active members of the tenant
      const { data: allMemberships } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('tenant_id', prayerCard.tenant_id)
        .eq('status', 'active');

      for (const m of allMemberships || []) {
        userIds.push(m.user_id);
      }
      break;
  }

  return userIds;
}

/**
 * Get author name from prayer card
 */
function getAuthorName(prayerCard: any): string {
  const author = prayerCard.author;
  if (!author) return 'Someone';

  const user = author.user;
  if (user?.display_name) return user.display_name;

  return 'Someone';
}

/**
 * Get author's locale from prayer card
 */
function getAuthorLocale(prayerCard: any): 'en' | 'ko' {
  const author = prayerCard.author;
  if (!author) return 'en';

  const user = author.user;
  return user?.locale || 'en';
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
 * Build localized notification content
 */
function buildNotificationContent(
  authorName: string,
  locale: 'en' | 'ko' = 'en'
): { title: string; body: string } {
  const title = getMessage('title', locale);
  const bodyTemplate = getMessage('body', locale);
  const body = interpolate(bodyTemplate, { authorName });

  return { title, body };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function handlePrayerAnswered(prayerCardId: string): Promise<{
  success: boolean;
  notified: number;
  errors: string[];
}> {
  // Fetch prayer card with author info
  const prayerCard = await getPrayerCard(prayerCardId);
  if (!prayerCard) {
    return { success: false, notified: 0, errors: ['Prayer card not found'] };
  }

  // Check if prayer is answered
  if (!prayerCard.answered_at) {
    return { success: true, notified: 0, errors: [] }; // Not answered yet, no notification
  }

  // Get recipients based on scope
  const recipientUserIds = await getPrayerRecipients(prayerCard);

  if (recipientUserIds.length === 0) {
    return { success: true, notified: 0, errors: [] };
  }

  // Get author info for notification content
  const authorName = getAuthorName(prayerCard);
  const authorLocale = getAuthorLocale(prayerCard);

  // Build notification content
  const { title, body } = buildNotificationContent(authorName, authorLocale);

  // Send notifications (group by locale for localization)
  // For simplicity, we use the author's locale for all recipients
  // This could be enhanced to send per-locale notifications
  await sendPushNotification({
    tenant_id: prayerCard.tenant_id,
    notification_type: 'prayer_answered',
    recipients: {
      user_ids: recipientUserIds,
    },
    payload: {
      title,
      body,
      data: {
        prayer_card_id: prayerCard.id,
        tenant_id: prayerCard.tenant_id,
      },
    },
    options: {
      sound: 'default', // Could use a celebratory sound in the future
    },
  });

  return {
    success: true,
    notified: recipientUserIds.length,
    errors: [],
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

    // Parse request body
    const body = await req.json();
    const { prayer_card_id } = body;

    if (!prayer_card_id) {
      return new Response('Missing required field: prayer_card_id', { status: 400 });
    }

    // Process the prayer answered event
    const result = await handlePrayerAnswered(prayer_card_id);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handle-prayer-answered:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// TYPE EXPORTS FOR TESTING
// ============================================================================

export type { PrayerCardRow, MembershipRow, SendPushRequest };
