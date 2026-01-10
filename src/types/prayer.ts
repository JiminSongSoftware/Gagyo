/**
 * Prayer Card feature types.
 *
 * These types extend the database types with UI-specific properties
 * for the Prayer Card and Pastoral Journal features.
 */

import type { PrayerCard, PrayerCardRecipient, PrayerCardRecipientScope, PastoralJournal } from './database';

/**
 * View scope filter for Prayer Card List.
 * - all: See all prayer cards visible to user
 * - my_small_group: Only from my small group (목장)
 * - urgent: Filter for urgent/ emergency prayers
 */
export type PrayerCardViewScope = 'all' | 'my_small_group' | 'urgent';

/**
 * Entity filter for specific small group or individual.
 * Format: 'small_group:{id}' or 'individual:{id}' or null for no filter
 */
export type PrayerCardEntityFilter = `small_group:${string}` | `individual:${string}` | null;

/**
 * Prayer card status for display.
 */
export type PrayerCardStatus = 'pending' | 'answered';

/**
 * Prayer card response (응답).
 * When someone marks a prayer as "answered", they can optionally add a response.
 */
export interface PrayerCardResponse {
  id: string;
  prayerCardId: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  content: string; // Testimony of how the prayer was answered
  createdAt: string;
}

/**
 * Extended prayer card with UI-specific data.
 */
export interface PrayerCardWithDetails extends PrayerCard {
  author: {
    id: string;
    user: {
      id: string;
      display_name: string | null;
      photo_url: string | null;
    };
  };
  recipients: PrayerCardRecipient[];
  responses: PrayerCardResponse[];
  responseCount: number;
  isUrgent: boolean; // Computed from content/tags
  status: PrayerCardStatus; // 'pending' if !answered, else 'answered'
}

/**
 * Recipient for the compose picker.
 */
export interface RecipientPickerItem {
  id: string;
  type: 'membership' | 'small_group';
  name: string;
  photoUrl: string | null;
  smallGroupId?: string; // For individual members
}

/**
 * Filter state for Prayer Card List.
 */
export interface PrayerCardFilterState {
  scope: PrayerCardViewScope;
}

/**
 * Pastoral journal content structure.
 * Follows the JSON schema from the database.
 */
export interface PastoralJournalContent {
  attendance: {
    total: number;
    new_visitors: number;
    absentees: string[];
  };
  prayerRequests: {
    praises: string[];
    requests: string[];
  };
  notes: string;
}

/**
 * Extended pastoral journal with related data.
 */
export interface PastoralJournalWithDetails extends PastoralJournal {
  author: {
    id: string;
    user: {
      id: string;
      display_name: string | null;
    };
  };
  smallGroup: {
    id: string;
    name: string;
  };
  comments: Array<{
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
  }>;
  content: PastoralJournalContent | null;
}

/**
 * Prayer card compose form data.
 */
export interface PrayerCardComposeData {
  content: string;
  recipientScope: PrayerCardRecipientScope;
  recipientMembershipIds: string[];
  recipientSmallGroupIds: string[];
  isUrgent: boolean;
}

/**
 * Timer state for prayer detail screen.
 */
export interface PrayerTimerState {
  isRunning: boolean;
  elapsedSeconds: number;
  startedAt: number | null;
}

/**
 * Music state for prayer detail screen.
 */
export interface PrayerMusicState {
  isPlaying: boolean;
  volume: number;
}

/**
 * Mock author for development.
 */
export interface MockAuthor {
  id: string;
  user: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
  };
}

/**
 * Mock recipient for development.
 */
export interface MockRecipient {
  id: string;
  prayer_card_id: string;
  recipient_membership_id: string | null;
  recipient_small_group_id: string | null;
  created_at: string;
}
