/**
 * Pastoral Journal to Prayer Card Converter
 *
 * Handles automatic conversion of pastoral journals to prayer cards
 * when a journal is confirmed and contains prayer request content.
 *
 * Workflow:
 * 1. Journal status becomes 'pastor_confirmed'
 * 2. Check if journal.content.prayer_requests exists and has items
 * 3. Create prayer card(s) for each prayer request
 * 4. Scope is automatically set to 'small_group' (for the group's prayer)
 */

import type { PastoralJournal, PrayerCard } from '@/types/database';
import { canConvertToPrayerCard } from './guards';

/**
 * Prayer request content structure from pastoral journal.
 */
export interface PrayerRequestContent {
  title: string;
  content: string;
  is_urgent?: boolean;
}

/**
 * Pastoral journal content structure.
 */
export interface PastoralJournalContent {
  attendance?: {
    adults: number;
    kids: number;
    newcomers: number;
  };
  sermon_notes?: string;
  prayer_requests?: PrayerRequestContent[];
  testimonies?: string[];
  next_week_plan?: string;
}

/**
 * Result of a journal to prayer card conversion.
 */
export interface ConversionResult {
  success: boolean;
  prayerCardId?: string;
  prayerCardsCreated?: number;
  reason?: string;
}

/**
 * Extract prayer request content from a pastoral journal.
 */
export function extractPrayerRequests(
  journal: PastoralJournal
): PrayerRequestContent[] {
  if (!journal.content) return [];

  try {
    const content = typeof journal.content === 'string'
      ? JSON.parse(journal.content)
      : journal.content;

    const journalContent = content as PastoralJournalContent;
    return journalContent.prayer_requests ?? [];
  } catch {
    return [];
  }
}

/**
 * Determine if a journal should auto-convert to prayer cards.
 */
export function shouldAutoConvert(journal: PastoralJournal): boolean {
  // Only confirmed journals can be converted
  if (journal.status !== 'pastor_confirmed') {
    return false;
  }

  // Check if there are prayer requests
  const prayerRequests = extractPrayerRequests(journal);
  return prayerRequests.length > 0;
}

/**
 * Build prayer card content from prayer request data.
 */
export function buildPrayerCardContent(
  prayerRequest: PrayerRequestContent,
  smallGroupName: string
): string {
  const { title, content } = prayerRequest;

  // Format: "[목장이름] 제목\n\n내용"
  return `[${smallGroupName}] ${title}\n\n${content}`;
}

/**
 * Create a prayer card from a pastoral journal prayer request.
 *
 * This is a client-side utility for creating prayer card objects
 * that can be sent to the database via Supabase.
 */
export function createPrayerCardFromJournal(
  journal: PastoralJournal,
  prayerRequest: PrayerRequestContent,
  authorId: string,
  smallGroupName: string
): Omit<PrayerCard, 'id' | 'created_at' | 'updated_at'> {
  return {
    tenant_id: journal.tenant_id,
    author_id: authorId,
    content: buildPrayerCardContent(prayerRequest, smallGroupName),
    recipient_scope: 'small_group',
    answered: false,
    answered_at: null,
  };
}

/**
 * Convert all prayer requests from a journal to prayer cards.
 *
 * Returns an array of prayer card objects ready to be inserted.
 */
export function convertJournalToPrayerCards(
  journal: PastoralJournal,
  authorId: string,
  smallGroupName: string
): Omit<PrayerCard, 'id' | 'created_at' | 'updated_at'>[] {
  const prayerRequests = extractPrayerRequests(journal);

  return prayerRequests.map((request) =>
    createPrayerCardFromJournal(journal, request, authorId, smallGroupName)
  );
}

/**
 * Check conversion permission and return detailed result.
 */
export function checkJournalConversionPermission(
  userRole: string,
  journal: PastoralJournal,
  isAuthor: boolean
): ConversionResult {
  // First check status
  if (journal.status !== 'pastor_confirmed') {
    return {
      success: false,
      reason: `Journal must be confirmed before conversion. Current status: ${journal.status}`,
    };
  }

  // Check for prayer requests
  const prayerRequests = extractPrayerRequests(journal);
  if (prayerRequests.length === 0) {
    return {
      success: false,
      reason: 'Journal contains no prayer requests to convert',
    };
  }

  // Check role-based permission (using guards)
  const permission = canConvertToPrayerCard(
    userRole as any,
    journal,
    isAuthor
  );

  if (!permission.allowed) {
    return {
      success: false,
      reason: permission.reason || 'Permission denied',
    };
  }

  return {
    success: true,
    prayerCardsCreated: prayerRequests.length,
  };
}

/**
 * Get a summary of prayer requests that would be created.
 */
export function getPrayerRequestSummary(journal: PastoralJournal): string {
  const prayerRequests = extractPrayerRequests(journal);

  if (prayerRequests.length === 0) {
    return 'No prayer requests';
  }

  const titles = prayerRequests.map((req, i) => `${i + 1}. ${req.title}`);
  return `${prayerRequests.length} prayer request(s):\n${titles.join('\n')}`;
}

/**
 * Mock function to simulate database insertion.
 * In production, this would call Supabase to create the prayer cards.
 *
 * @todo Replace with actual Supabase mutation when backend is ready.
 */
export async function insertPrayerCardsFromJournal(
  journal: PastoralJournal,
  authorId: string,
  smallGroupName: string
): Promise<ConversionResult> {
  // Permission check
  // const permission = checkJournalConversionPermission(...);
  // if (!permission.success) return permission;

  const prayerCards = convertJournalToPrayerCards(
    journal,
    authorId,
    smallGroupName
  );

  // TODO: Replace with actual Supabase insert
  // const { data, error } = await supabase
  //   .from('prayer_cards')
  //   .insert(prayerCards)
  //   .select();

  // For now, return success mock result
  return {
    success: true,
    prayerCardsCreated: prayerCards.length,
  };
}

/**
 * Helper: Get urgent flag from prayer request.
 */
export function isPrayerUrgent(prayerRequest: PrayerRequestContent): boolean {
  return prayerRequest.is_urgent === true;
}

/**
 * Helper: Format prayer card content with urgent marker if needed.
 */
export function formatPrayerCardContent(
  prayerRequest: PrayerRequestContent,
  smallGroupName: string
): string {
  const { title, content, is_urgent } = prayerRequest;
  const urgentPrefix = is_urgent ? '[긴급] ' : '';

  return `[${smallGroupName}] ${urgentPrefix}${title}\n\n${content}`;
}
