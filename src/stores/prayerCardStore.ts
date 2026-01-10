/**
 * Prayer Card Store
 *
 * Manages prayer card state with mock data for development.
 * Will be connected to Supabase when backend is ready.
 */

import { create } from 'zustand';
import type {
  PrayerCardWithDetails,
  PrayerCardViewScope,
  PrayerCardEntityFilter,
  PrayerCardComposeData,
  PrayerTimerState,
  PrayerMusicState,
  MockAuthor,
  MockRecipient,
  PrayerCardResponse,
} from '@/types/prayer';
import { shouldAutoConvert, convertJournalToPrayerCards } from '@/lib/journalToPrayerConverter';
import type { PastoralJournal } from '@/types/database';

/**
 * Current user mock ID (will be replaced with actual auth).
 */
const CURRENT_USER_ID = 'user-current';

/**
 * Mock authors for development.
 */
const MOCK_AUTHORS: Record<string, MockAuthor> = {
  'user-1': {
    id: 'user-1',
    user: {
      id: 'user-1',
      display_name: '조영구 목사',
      photo_url: null,
    },
  },
  'user-2': {
    id: 'user-2',
    user: {
      id: 'user-2',
      display_name: 'SAEHONG PARK',
      photo_url: null,
    },
  },
  'user-3': {
    id: 'user-3',
    user: {
      id: 'user-3',
      display_name: '김민지',
      photo_url: null,
    },
  },
  'user-4': {
    id: 'user-4',
    user: {
      id: 'user-4',
      display_name: '이철수',
      photo_url: null,
    },
  },
  [CURRENT_USER_ID]: {
    id: CURRENT_USER_ID,
    user: {
      id: CURRENT_USER_ID,
      display_name: '나',
      photo_url: null,
    },
  },
};

/**
 * Mock prayer card responses.
 */
const MOCK_RESPONSES: PrayerCardResponse[] = [
  {
    id: 'resp-1',
    prayerCardId: 'pc-1',
    authorId: 'user-2',
    authorName: 'SAEHONG PARK',
    authorPhotoUrl: null,
    content: '감사하게도 주님께서 응답해주셨어요! 면접에서 합격했습니다.',
    createdAt: '2025-01-08T10:30:00Z',
  },
  {
    id: 'resp-2',
    prayerCardId: 'pc-3',
    authorId: 'user-1',
    authorName: '조영구 목사',
    authorPhotoUrl: null,
    content: '하나님이 들으시고 응답하셨습니다. 함께 기도해주셔서 감사합니다.',
    createdAt: '2025-01-07T15:20:00Z',
  },
];

/**
 * Mock prayer card recipients.
 */
const MOCK_RECIPIENTS: MockRecipient[] = [
  // For individual prayer cards
  {
    id: 'rec-1',
    prayer_card_id: 'pc-1',
    recipient_membership_id: 'user-2',
    recipient_small_group_id: null,
    created_at: '2025-01-05T10:00:00Z',
  },
  {
    id: 'rec-2',
    prayer_card_id: 'pc-1',
    recipient_membership_id: 'user-3',
    recipient_small_group_id: null,
    created_at: '2025-01-05T10:00:00Z',
  },
  {
    id: 'rec-3',
    prayer_card_id: 'pc-2',
    recipient_membership_id: 'user-1',
    recipient_small_group_id: null,
    created_at: '2025-01-06T09:00:00Z',
  },
  // For small group prayer cards
  {
    id: 'rec-4',
    prayer_card_id: 'pc-3',
    recipient_membership_id: null,
    recipient_small_group_id: 'sg-1',
    created_at: '2025-01-07T08:00:00Z',
  },
  {
    id: 'rec-5',
    prayer_card_id: 'pc-4',
    recipient_membership_id: null,
    recipient_small_group_id: 'sg-2',
    created_at: '2025-01-08T12:00:00Z',
  },
  // For church wide prayer cards
  // Church wide has no specific recipients in the table (scope indicates all)
];

/**
 * Mock prayer cards data.
 */
const MOCK_PRAYER_CARDS: PrayerCardWithDetails[] = [
  {
    id: 'pc-1',
    tenant_id: 'tenant-1',
    author_id: 'user-2',
    content:
      '[긴급] 내일 있는 면접을 위해 기도 부탁드립니다. 평소에 준비한 만큼 잘 나타낼 수 있도록, 그리고 하나님의 때를 잘 분별할 수 있도록 기도해 주세요.',
    recipient_scope: 'individual',
    answered: true,
    answered_at: '2025-01-08T10:30:00Z',
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-08T10:30:00Z',
    author: MOCK_AUTHORS['user-2'],
    recipients: [MOCK_RECIPIENTS[0], MOCK_RECIPIENTS[1]],
    responses: [MOCK_RESPONSES[0]],
    responseCount: 1,
    isUrgent: true,
    status: 'answered',
  },
  {
    id: 'pc-2',
    tenant_id: 'tenant-1',
    author_id: CURRENT_USER_ID,
    content:
      '어머니의 건강이 위중합니다. 하나님의 자비와 긍휼를 구합니다. 병원에서도 최선을 다하고 있지만, 궁극적인 치유는 하나님께 있습니다.',
    recipient_scope: 'individual',
    answered: false,
    answered_at: null,
    created_at: '2025-01-06T09:00:00Z',
    updated_at: '2025-01-06T09:00:00Z',
    author: MOCK_AUTHORS[CURRENT_USER_ID],
    recipients: [MOCK_RECIPIENTS[2]],
    responses: [],
    responseCount: 0,
    isUrgent: true,
    status: 'pending',
  },
  {
    id: 'pc-3',
    tenant_id: 'tenant-1',
    author_id: 'user-3',
    content:
      '모로코 목장의 새로운 시작을 위해 기도해 주세요. 이번 달 새로운 식구들이 3분이나 오게 되었습니다. 그들이 우리 공동체에 잘 정착하고, 예수님을 더 깊이 알게 되도록 기도 부탁드립니다.',
    recipient_scope: 'small_group',
    answered: true,
    answered_at: '2025-01-07T15:20:00Z',
    created_at: '2025-01-07T08:00:00Z',
    updated_at: '2025-01-07T15:20:00Z',
    author: MOCK_AUTHORS['user-3'],
    recipients: [MOCK_RECIPIENTS[3]],
    responses: [MOCK_RESPONSES[1]],
    responseCount: 1,
    isUrgent: false,
    status: 'answered',
  },
  {
    id: 'pc-4',
    tenant_id: 'tenant-1',
    author_id: 'user-4',
    content:
      '알래스카 목장의 청년들이 이번 주 수양회를 갑니다. 안전한 다녀오고, 영적으로 큰 은혜를 받고 돌아올 수 있도록 기도해 주세요.',
    recipient_scope: 'small_group',
    answered: false,
    answered_at: null,
    created_at: '2025-01-08T12:00:00Z',
    updated_at: '2025-01-08T12:00:00Z',
    author: MOCK_AUTHORS['user-4'],
    recipients: [MOCK_RECIPIENTS[4]],
    responses: [],
    responseCount: 0,
    isUrgent: false,
    status: 'pending',
  },
  {
    id: 'pc-5',
    tenant_id: 'tenant-1',
    author_id: 'user-1',
    content:
      '교회 건축을 위해 기도해 주세요. 현재 공사가 순조롭게 진행되고 있습니다. 하지만 예산 부분과 허가 문제로 기도가 필요합니다. 하나님의 공급과 지혜를 구합니다.',
    recipient_scope: 'church_wide',
    answered: false,
    answered_at: null,
    created_at: '2025-01-04T07:00:00Z',
    updated_at: '2025-01-04T07:00:00Z',
    author: MOCK_AUTHORS['user-1'],
    recipients: [],
    responses: [],
    responseCount: 0,
    isUrgent: false,
    status: 'pending',
  },
  {
    id: 'pc-6',
    tenant_id: 'tenant-1',
    author_id: CURRENT_USER_ID,
    content:
      '이번 주 주일 설교 말씀을 잘 선포할 수 있도록, 그리고 듣는 모든 분들의 마음에 감동이 있도록 기도해 주세요.',
    recipient_scope: 'church_wide',
    answered: false,
    answered_at: null,
    created_at: '2025-01-09T06:00:00Z',
    updated_at: '2025-01-09T06:00:00Z',
    author: MOCK_AUTHORS[CURRENT_USER_ID],
    recipients: [],
    responses: [],
    responseCount: 0,
    isUrgent: false,
    status: 'pending',
  },
];

/**
 * Mock recipient picker items.
 */
const MOCK_RECIPIENT_PICKER_ITEMS = [
  { id: 'user-1', type: 'membership' as const, name: '조영구 목사', photoUrl: null },
  { id: 'user-2', type: 'membership' as const, name: 'SAEHONG PARK', photoUrl: null },
  { id: 'user-3', type: 'membership' as const, name: '김민지', photoUrl: null },
  { id: 'user-4', type: 'membership' as const, name: '이철수', photoUrl: null },
  { id: 'sg-1', type: 'small_group' as const, name: '모로코 목장', photoUrl: null },
  { id: 'sg-2', type: 'small_group' as const, name: '알래스카 목장', photoUrl: null },
  { id: 'sg-3', type: 'small_group' as const, name: '캐스트로 초원', photoUrl: null },
  { id: 'sg-4', type: 'small_group' as const, name: '요하네스 초원', photoUrl: null },
];

/**
 * Prayer Card Store State.
 */
export interface PrayerCardState {
  // Data
  prayerCards: PrayerCardWithDetails[];
  filteredPrayerCards: PrayerCardWithDetails[];

  // Filter state
  viewScope: PrayerCardViewScope;
  entityFilter: PrayerCardEntityFilter; // New: specific entity filter

  // Detail screen state
  selectedPrayerCard: PrayerCardWithDetails | null;
  timer: PrayerTimerState;
  music: PrayerMusicState;

  // Compose state
  composeData: PrayerCardComposeData | null;

  // Actions
  setViewScope: (scope: PrayerCardViewScope) => void;
  setEntityFilter: (filter: PrayerCardEntityFilter) => void; // New
  filterPrayerCards: () => void;
  selectPrayerCard: (id: string) => void;
  clearSelectedPrayerCard: () => void;

  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;

  // Music actions
  toggleMusic: () => void;
  setMusicVolume: (volume: number) => void;

  // Prayer card actions
  markAsAnswered: (prayerCardId: string, responseContent?: string) => void;

  // Compose actions
  startComposing: () => void;
  updateComposeData: (data: Partial<PrayerCardComposeData>) => void;
  submitPrayerCard: () => string; // Returns new prayer card ID
  cancelComposing: () => void;

  // Recipients
  getRecipientPickerItems: () => {
    id: string;
    type: 'membership' | 'small_group';
    name: string;
    photoUrl: string | null;
  }[];

  // Journal to prayer card conversion
  convertPastoralJournalToPrayerCards: (
    journal: PastoralJournal,
    smallGroupName: string
  ) => string[]; // Returns IDs of created prayer cards
}

/**
 * Helper to check if content has urgent marker.
 */
function isContentUrgent(content: string): boolean {
  const urgentMarkers = ['[긴급]', '[긴급기도]', '긴급기도'];
  return urgentMarkers.some((marker) => content.includes(marker));
}

/**
 * Prayer Card Store.
 *
 * Manages prayer card state with mock data for development.
 */
export const usePrayerCardStore = create<PrayerCardState>((set, get) => ({
  // Initial state
  prayerCards: MOCK_PRAYER_CARDS,
  filteredPrayerCards: MOCK_PRAYER_CARDS,
  viewScope: 'all',
  entityFilter: null,
  selectedPrayerCard: null,
  timer: {
    isRunning: false,
    elapsedSeconds: 0,
    startedAt: null,
  },
  music: {
    isPlaying: false,
    volume: 0.5,
  },
  composeData: null,

  setViewScope: (scope) => {
    set({ viewScope: scope });
    get().filterPrayerCards();
  },

  setEntityFilter: (filter) => {
    set({ entityFilter: filter });
    get().filterPrayerCards();
  },

  filterPrayerCards: () => {
    const { prayerCards, viewScope, entityFilter } = get();
    let filtered = [...prayerCards];

    // First apply view scope filter
    switch (viewScope) {
      case 'my_small_group':
        // Filter by small_group scope
        filtered = filtered.filter((card) => card.recipient_scope === 'small_group');
        break;
      case 'urgent':
        // Filter by urgent marker
        filtered = filtered.filter((card) => card.isUrgent);
        break;
      case 'all':
      default:
        // Show all
        break;
    }

    // Then apply entity filter if set
    if (entityFilter) {
      const [filterType, filterId] = entityFilter.split(':') as [
        'small_group' | 'individual',
        string,
      ];

      if (filterType === 'small_group') {
        // Filter cards sent to this specific small group
        filtered = filtered.filter(
          (card) =>
            card.recipient_scope === 'small_group' &&
            card.recipients.some((r) => r.recipient_small_group_id === filterId)
        );
      } else if (filterType === 'individual') {
        // Filter cards sent to this specific person
        filtered = filtered.filter(
          (card) =>
            card.recipient_scope === 'individual' &&
            card.recipients.some((r) => r.recipient_membership_id === filterId)
        );
      }
    }

    // Sort: answered cards at bottom, newest first
    filtered.sort((a, b) => {
      if (a.answered === b.answered) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.answered ? 1 : -1;
    });

    set({ filteredPrayerCards: filtered });
  },

  selectPrayerCard: (id) => {
    const card = get().prayerCards.find((c) => c.id === id) ?? null;
    set({ selectedPrayerCard: card });
  },

  clearSelectedPrayerCard: () => {
    set({ selectedPrayerCard: null });
  },

  // Timer actions
  startTimer: () => {
    const { timer } = get();
    set({
      timer: {
        ...timer,
        isRunning: true,
        startedAt: timer.startedAt ?? Date.now(),
      },
    });
  },

  pauseTimer: () => {
    const { timer } = get();
    set({
      timer: {
        ...timer,
        isRunning: false,
      },
    });
  },

  resetTimer: () => {
    set({
      timer: {
        isRunning: false,
        elapsedSeconds: 0,
        startedAt: null,
      },
    });
  },

  tickTimer: () => {
    const { timer } = get();
    if (!timer.isRunning) return;

    const elapsed = timer.startedAt
      ? Math.floor((Date.now() - timer.startedAt) / 1000)
      : timer.elapsedSeconds + 1;

    set({
      timer: {
        ...timer,
        elapsedSeconds: elapsed,
      },
    });
  },

  // Music actions
  toggleMusic: () => {
    set((state) => ({
      music: {
        ...state.music,
        isPlaying: !state.music.isPlaying,
      },
    }));
  },

  setMusicVolume: (volume) => {
    set((state) => ({
      music: {
        ...state.music,
        volume: Math.max(0, Math.min(1, volume)),
      },
    }));
  },

  // Prayer card actions
  markAsAnswered: (prayerCardId, responseContent) => {
    set((state) => {
      const updated = state.prayerCards.map((card) => {
        if (card.id === prayerCardId) {
          const newResponse: PrayerCardResponse | null = responseContent
            ? {
                id: `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                prayerCardId,
                authorId: CURRENT_USER_ID,
                authorName: '나',
                authorPhotoUrl: null,
                content: responseContent,
                createdAt: new Date().toISOString(),
              }
            : null;

          return {
            ...card,
            answered: true,
            answered_at: new Date().toISOString(),
            status: 'answered' as const,
            responses: newResponse ? [...card.responses, newResponse] : card.responses,
            responseCount: newResponse ? card.responseCount + 1 : card.responseCount,
          };
        }
        return card;
      });

      // Update selected card if it's the same one
      const selectedCard =
        state.selectedPrayerCard?.id === prayerCardId
          ? (updated.find((c) => c.id === prayerCardId) ?? null)
          : state.selectedPrayerCard;

      // Refilter to update sorted order
      const filtered = [...updated];
      filtered.sort((a, b) => {
        if (a.answered === b.answered) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.answered ? 1 : -1;
      });

      return {
        prayerCards: updated,
        filteredPrayerCards: filtered,
        selectedPrayerCard: selectedCard,
      };
    });
  },

  // Compose actions
  startComposing: () => {
    set({
      composeData: {
        content: '',
        recipientScope: 'small_group',
        recipientMembershipIds: [],
        recipientSmallGroupIds: [],
        isUrgent: false,
      },
    });
  },

  updateComposeData: (data) => {
    set((state) => ({
      composeData: state.composeData ? { ...state.composeData, ...data } : null,
    }));
  },

  submitPrayerCard: () => {
    const { composeData, prayerCards } = get();
    if (!composeData) return '';

    const newCard: PrayerCardWithDetails = {
      id: `pc-${Date.now()}`,
      tenant_id: 'tenant-1',
      author_id: CURRENT_USER_ID,
      content: composeData.isUrgent ? '[긴급] ' + composeData.content : composeData.content,
      recipient_scope: composeData.recipientScope,
      answered: false,
      answered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: MOCK_AUTHORS[CURRENT_USER_ID],
      recipients: [],
      responses: [],
      responseCount: 0,
      isUrgent: composeData.isUrgent,
      status: 'pending',
    };

    const updated = [newCard, ...prayerCards];
    set({
      prayerCards: updated,
      composeData: null,
    });

    // Refilter
    get().filterPrayerCards();

    return newCard.id;
  },

  cancelComposing: () => {
    set({ composeData: null });
  },

  getRecipientPickerItems: () => {
    return MOCK_RECIPIENT_PICKER_ITEMS;
  },

  // Journal to prayer card conversion
  convertPastoralJournalToPrayerCards: (journal, smallGroupName) => {
    // Check if journal should be converted
    if (!shouldAutoConvert(journal)) {
      return [];
    }

    // Get author ID from journal
    const authorId = journal.author_id;

    // Convert journal to prayer cards
    const prayerCardData = convertJournalToPrayerCards(journal, authorId, smallGroupName);

    // Create full prayer card objects with mock data
    const newCards: PrayerCardWithDetails[] = prayerCardData.map((data) => ({
      ...data,
      id: `pc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: MOCK_AUTHORS[authorId] || MOCK_AUTHORS[CURRENT_USER_ID],
      recipients: [],
      responses: [],
      responseCount: 0,
      isUrgent: isContentUrgent(data.content),
      status: 'pending' as const,
    }));

    // Add to store
    set((state) => {
      const updated = [...newCards, ...state.prayerCards];
      return {
        prayerCards: updated,
      };
    });

    // Refilter
    get().filterPrayerCards();

    // Return IDs of created cards
    return newCards.map((card) => card.id);
  },
}));
