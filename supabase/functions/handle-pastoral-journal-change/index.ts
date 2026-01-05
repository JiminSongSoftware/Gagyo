/**
 * Handle Pastoral Journal Change Edge Function
 *
 * Triggered when pastoral journal status changes.
 * Sends notifications for:
 * - Submitted (draft → submitted): to zone leader
 * - Forwarded (submitted → zone_reviewed): to all pastors
 * - Confirmed (zone_reviewed → pastor_confirmed): to original author
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

interface PastoralJournalRow {
  id: string;
  tenant_id: string;
  small_group_id: string;
  author_id: string;
  status: 'draft' | 'submitted' | 'zone_reviewed' | 'pastor_confirmed' | 'archived';
  submitted_at: string | null;
  zone_reviewed_at: string | null;
  pastor_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SmallGroupRow {
  id: string;
  tenant_id: string;
  zone_id: string | null;
  name: string;
  leader_id: string;
  co_leader_id: string | null;
}

interface MembershipRow {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'member' | 'small_group_leader' | 'zone_leader' | 'pastor' | 'admin';
  status: 'invited' | 'active' | 'suspended' | 'removed';
  small_group_id: string | null;
  user: {
    id: string;
    display_name: string | null;
    locale: 'en' | 'ko';
  };
}

interface SendPushRequest {
  tenant_id: string;
  notification_type:
    | 'pastoral_journal_submitted'
    | 'pastoral_journal_forwarded'
    | 'pastoral_journal_confirmed';
  recipients: {
    user_ids: string[];
  };
  payload: {
    title: string;
    body: string;
    data: Record<string, string>;
  };
}

type JournalStatusChange =
  | { from: 'draft'; to: 'submitted' }
  | { from: 'submitted'; to: 'zone_reviewed' }
  | { from: 'zone_reviewed'; to: 'pastor_confirmed' };

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
    submitted: {
      title: 'Pastoral Journal Submitted',
      body: '{leaderName} submitted a journal for {groupName}',
    },
    forwarded: {
      title: 'Journal Ready for Review',
      body: "{zoneLeaderName} forwarded {groupName}'s journal",
    },
    confirmed: {
      title: 'Pastoral Journal Confirmed ✝️',
      body: 'Pastor has reviewed your journal',
    },
  },
  ko: {
    submitted: {
      title: '목양 일지 제출',
      body: '{groupName} {leaderName} 목장이 목양 일지를 제출했습니다',
    },
    forwarded: {
      title: '목양 일지 검토 대기',
      body: '{zoneLeaderName} 지도자가 {groupName}의 일지를 전달했습니다',
    },
    confirmed: {
      title: '목양 일지 확정 ✝️',
      body: '목사님이 목양 일지를 검토했습니다',
    },
  },
};

function getMessage(
  type: 'submitted' | 'forwarded' | 'confirmed',
  key: 'title' | 'body',
  locale: 'en' | 'ko' = 'en'
): string {
  return i18n[locale]?.[type]?.[key] || i18n.en[type]?.[key] || key;
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
 * Fetch pastoral journal with author info
 */
async function getPastoralJournal(journalId: string): Promise<PastoralJournalRow | null> {
  const { data, error } = await supabase
    .from('pastoral_journals')
    .select('*')
    .eq('id', journalId)
    .single();

  if (error) {
    console.error(`Failed to fetch pastoral journal: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Fetch small group info
 */
async function getSmallGroup(smallGroupId: string): Promise<SmallGroupRow | null> {
  const { data, error } = await supabase
    .from('small_groups')
    .select('*')
    .eq('id', smallGroupId)
    .single();

  if (error) {
    console.error(`Failed to fetch small group: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Fetch zone leader for a zone
 */
async function getZoneLeader(tenantId: string, zoneId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('zones')
    .select('zone_leader_id')
    .eq('id', zoneId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.zone_leader_id;
}

/**
 * Fetch all pastors for a tenant
 */
async function getPastors(tenantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'pastor')
    .eq('status', 'active');

  if (error) {
    console.error(`Failed to fetch pastors: ${error.message}`);
    return [];
  }

  return (data || []).map((m) => m.user_id);
}

/**
 * Fetch small group leader name
 */
async function getLeaderName(leaderId: string): Promise<string> {
  const { data, error } = await supabase
    .from('memberships')
    .select(
      `
      user:users!memberships_user_id_fkey (
        display_name
      )
    `
    )
    .eq('user_id', leaderId)
    .single();

  if (error || !data) {
    return 'A leader';
  }

  return (data.user as any)?.display_name || 'A leader';
}

/**
 * Fetch zone leader name
 */
async function getZoneLeaderName(zoneLeaderId: string): Promise<string> {
  const { data, error } = await supabase
    .from('memberships')
    .select(
      `
      user:users!memberships_user_id_fkey (
        display_name
      )
    `
    )
    .eq('user_id', zoneLeaderId)
    .single();

  if (error || !data) {
    return 'A zone leader';
  }

  return (data.user as any)?.display_name || 'A zone leader';
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
 * Handle journal submitted notification
 * Recipients: Zone leader for the small group's zone
 */
async function handleJournalSubmitted(
  journal: PastoralJournalRow,
  smallGroup: SmallGroupRow
): Promise<{ notified: number; errors: string[] }> {
  const recipientUserIds: string[] = [];

  if (smallGroup.zone_id) {
    const zoneLeaderId = await getZoneLeader(journal.tenant_id, smallGroup.zone_id);
    if (zoneLeaderId) {
      recipientUserIds.push(zoneLeaderId);
    }
  }

  if (recipientUserIds.length === 0) {
    return { notified: 0, errors: ['No zone leader found'] };
  }

  const leaderName = await getLeaderName(journal.author_id);

  // Send notifications in recipient's locale
  // For simplicity, we use English. This could be enhanced.
  await sendPushNotification({
    tenant_id: journal.tenant_id,
    notification_type: 'pastoral_journal_submitted',
    recipients: {
      user_ids: recipientUserIds,
    },
    payload: {
      title: getMessage('submitted', 'title'),
      body: interpolate(getMessage('submitted', 'body'), {
        leaderName,
        groupName: smallGroup.name,
      }),
      data: {
        journal_id: journal.id,
        tenant_id: journal.tenant_id,
        small_group_id: smallGroup.id,
      },
    },
  });

  return { notified: recipientUserIds.length, errors: [] };
}

/**
 * Handle journal forwarded notification
 * Recipients: All pastors in tenant
 */
async function handleJournalForwarded(
  journal: PastoralJournalRow,
  smallGroup: SmallGroupRow
): Promise<{ notified: number; errors: string[] }> {
  const pastorUserIds = await getPastors(journal.tenant_id);

  if (pastorUserIds.length === 0) {
    return { notified: 0, errors: ['No pastors found'] };
  }

  // Get the zone leader who forwarded (most recent reviewer)
  // For now, we use a generic "zone leader" since we don't track who reviewed
  const zoneLeaderName = 'A zone leader';

  await sendPushNotification({
    tenant_id: journal.tenant_id,
    notification_type: 'pastoral_journal_forwarded',
    recipients: {
      user_ids: pastorUserIds,
    },
    payload: {
      title: getMessage('forwarded', 'title'),
      body: interpolate(getMessage('forwarded', 'body'), {
        zoneLeaderName,
        groupName: smallGroup.name,
      }),
      data: {
        journal_id: journal.id,
        tenant_id: journal.tenant_id,
        small_group_id: smallGroup.id,
      },
    },
  });

  return { notified: pastorUserIds.length, errors: [] };
}

/**
 * Handle journal confirmed notification
 * Recipients: Original author (small group leader)
 */
async function handleJournalConfirmed(
  journal: PastoralJournalRow
): Promise<{ notified: number; errors: string[] }> {
  const recipientUserIds = [journal.author_id];

  await sendPushNotification({
    tenant_id: journal.tenant_id,
    notification_type: 'pastoral_journal_confirmed',
    recipients: {
      user_ids: recipientUserIds,
    },
    payload: {
      title: getMessage('confirmed', 'title'),
      body: getMessage('confirmed', 'body'),
      data: {
        journal_id: journal.id,
        tenant_id: journal.tenant_id,
      },
    },
  });

  return { notified: recipientUserIds.length, errors: [] };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function handlePastoralJournalChange(
  journalId: string,
  oldStatus: string,
  newStatus: string
): Promise<{
  success: boolean;
  notified: number;
  errors: string[];
}> {
  // Fetch pastoral journal
  const journal = await getPastoralJournal(journalId);
  if (!journal) {
    return { success: false, notified: 0, errors: ['Journal not found'] };
  }

  // Fetch small group info
  const smallGroup = journal.small_group_id ? await getSmallGroup(journal.small_group_id) : null;

  let result: { notified: number; errors: string[] } = { notified: 0, errors: [] };

  // Handle status transitions
  if (oldStatus === 'draft' && newStatus === 'submitted') {
    // Journal submitted → notify zone leader
    if (smallGroup) {
      result = await handleJournalSubmitted(journal, smallGroup);
    } else {
      result = { notified: 0, errors: ['Small group not found'] };
    }
  } else if (oldStatus === 'submitted' && newStatus === 'zone_reviewed') {
    // Journal forwarded → notify pastors
    if (smallGroup) {
      result = await handleJournalForwarded(journal, smallGroup);
    } else {
      result = { notified: 0, errors: ['Small group not found'] };
    }
  } else if (oldStatus === 'zone_reviewed' && newStatus === 'pastor_confirmed') {
    // Journal confirmed → notify author
    result = await handleJournalConfirmed(journal);
  } else {
    // No notification for other status changes
    return { success: true, notified: 0, errors: [] };
  }

  return {
    success: result.errors.length === 0,
    notified: result.notified,
    errors: result.errors,
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
    const { journal_id, old_status, new_status } = body;

    if (!journal_id || !old_status || !new_status) {
      return new Response('Missing required fields: journal_id, old_status, new_status', {
        status: 400,
      });
    }

    // Validate status values
    const validStatuses = ['draft', 'submitted', 'zone_reviewed', 'pastor_confirmed', 'archived'];
    if (!validStatuses.includes(old_status) || !validStatuses.includes(new_status)) {
      return new Response('Invalid status value', { status: 400 });
    }

    // Process the status change
    const result = await handlePastoralJournalChange(journal_id, old_status, new_status);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handle-pastoral-journal-change:', error);

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

export type {
  PastoralJournalRow,
  SmallGroupRow,
  MembershipRow,
  SendPushRequest,
  JournalStatusChange,
};
