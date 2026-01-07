/**
 * Pastoral Journal List Component
 *
 * Displays pastoral journals with role-based sections and filtering.
 *
 * Features:
 * - Role-based sections (leaders see their group's, zone leaders see zone, pastors see all)
 * - Filter tabs (my journals, submitted journals, all journals)
 * - Pull-to-refresh
 * - Pagination with load more
 * - Empty states with contextual messages
 * - i18n support
 */

import { ActivityIndicator, FlatList as RNFlatList, Pressable, RefreshControl } from 'react-native';
import { Stack, Text as TamaguiText, XStack, YStack, styled, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';
import {
  usePastoralJournals,
  type PastoralJournalsFilter,
  type PastoralJournalWithRelations,
} from '../hooks/usePastoralJournals';
import type { Database, Membership } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface PastoralJournalListProps {
  /**
   * The tenant ID for fetching journals.
   */
  tenantId: string | null;

  /**
   * The current user's membership ID.
   */
  membershipId: string | null;

  /**
   * The current user's membership with role and group info.
   */
  membership: Membership | null;

  /**
   * Callback when a journal is pressed.
   */
  onJournalPress: (journal: PastoralJournalWithRelations) => void;

  /**
   * Current filter scope.
   */
  filter?: PastoralJournalsFilter;

  /**
   * Callback when filter changes.
   */
  onFilterChange?: (filter: PastoralJournalsFilter) => void;
}

type JournalStatus = Database['public']['Tables']['pastoral_journals']['Row']['status'];

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const JournalCard = styled(Stack, {
  name: 'JournalCard',
  backgroundColor: '$background',
  borderRadius: '$3',
  padding: '$4',
  marginBottom: '$3',
  borderWidth: 1,
  borderColor: '$borderLight',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
});

const StatusBadge = styled(Stack, {
  name: 'StatusBadge',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
});

const FilterTab = styled(Pressable, {
  name: 'FilterTab',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$2',
  borderBottomWidth: 2,
  borderBottomColor: 'transparent',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: JournalStatus): string {
  switch (status) {
    case 'draft':
      return '#9CA3AF'; // gray
    case 'submitted':
      return '#3B82F6'; // blue
    case 'zone_reviewed':
      return '#F59E0B'; // amber
    case 'pastor_confirmed':
      return '#10B981'; // green
    default:
      return '#9CA3AF';
  }
}

function getStatusLabel(status: JournalStatus, t: (key: string) => string): string {
  switch (status) {
    case 'draft':
      return t('pastoral.status_draft');
    case 'submitted':
      return t('pastoral.status_submitted');
    case 'zone_reviewed':
      return t('pastoral.status_zone_reviewed');
    case 'pastor_confirmed':
      return t('pastoral.status_pastor_confirmed');
    default:
      return status;
  }
}

function formatWeekDate(weekStartDate: string): string {
  const date = new Date(weekStartDate);
  const endDate = new Date(date);
  endDate.setDate(date.getDate() + 6);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return `${formatDate(date)} - ${formatDate(endDate)}`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface JournalCardProps {
  journal: PastoralJournalWithRelations;
  onPress: (journal: PastoralJournalWithRelations) => void;
}

function JournalCardItem({ journal, onPress }: JournalCardProps) {
  const { t } = useTranslation();

  const content = journal.content as {
    attendance?: {
      present: number;
      absent: number;
      newVisitors: number;
    };
  } | null;

  return (
    <Pressable
      testID={`journal-card-${journal.id}`}
      onPress={() => onPress(journal)}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
    >
      <JournalCard>
        {/* Header: Week and Status */}
        <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
          <YStack flex={1}>
            <TamaguiText testID="journal-week-date" fontSize="$lg" fontWeight="bold" color="$color">
              {t('pastoral.week_of', { date: formatWeekDate(journal.week_start_date) })}
            </TamaguiText>
            {journal.small_group && (
              <TamaguiText
                testID="journal-group-name"
                fontSize="$sm"
                color="$color3"
                marginTop="$1"
              >
                {journal.small_group.name}
              </TamaguiText>
            )}
          </YStack>
          <StatusBadge
            testID={`journal-status-badge`}
            backgroundColor={getStatusColor(journal.status) + '20'}
          >
            <TamaguiText
              testID={`status-${journal.status}`}
              fontSize="$xs"
              fontWeight="600"
              color={getStatusColor(journal.status)}
            >
              {getStatusLabel(journal.status, t)}
            </TamaguiText>
          </StatusBadge>
        </XStack>

        {/* Attendance Summary */}
        {content?.attendance && (
          <XStack gap="$3" marginBottom="$3">
            <XStack alignItems="center" gap="$1">
              <TamaguiText fontSize="$sm" color="$color3">
                {t('pastoral.present')}:
              </TamaguiText>
              <TamaguiText fontSize="$sm" fontWeight="600" color="$color">
                {content.attendance.present}
              </TamaguiText>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <TamaguiText fontSize="$sm" color="$color3">
                {t('pastoral.absent')}:
              </TamaguiText>
              <TamaguiText fontSize="$sm" fontWeight="600" color="$color">
                {content.attendance.absent}
              </TamaguiText>
            </XStack>
            {content.attendance.newVisitors > 0 && (
              <XStack alignItems="center" gap="$1">
                <TamaguiText fontSize="$sm" color="$color3">
                  {t('pastoral.new')}:
                </TamaguiText>
                <TamaguiText fontSize="$sm" fontWeight="600" color="$primary">
                  +{content.attendance.newVisitors}
                </TamaguiText>
              </XStack>
            )}
          </XStack>
        )}

        {/* Footer: Author and Date */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$2">
            <TamaguiText testID="journal-author-name" fontSize="$xs" color="$color3">
              {journal.author?.user?.display_name || t('pastoral.unknown_author')}
            </TamaguiText>
          </XStack>
          <TamaguiText fontSize="$xs" color="$color3">
            {new Date(journal.created_at).toLocaleDateString()}
          </TamaguiText>
        </XStack>
      </JournalCard>
    </Pressable>
  );
}

interface FilterTabsProps {
  currentFilter: PastoralJournalsFilter;
  membership: Membership | null;
  onFilterChange: (filter: PastoralJournalsFilter) => void;
}

function FilterTabs({ currentFilter, membership, onFilterChange }: FilterTabsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const filters: { key: PastoralJournalsFilter['scope']; label: string }[] = [];

  // All users can see their own journals
  filters.push({ key: 'my_journals', label: t('pastoral.filter_my_journals') });

  // Zone leaders and pastors can see submitted journals
  if (
    membership?.role === 'zone_leader' ||
    membership?.role === 'pastor' ||
    membership?.role === 'admin'
  ) {
    filters.push({ key: 'submitted_journals', label: t('pastoral.filter_submitted') });
  }

  // Pastors and admins can see all journals
  if (membership?.role === 'pastor' || membership?.role === 'admin') {
    filters.push({ key: 'all_journals', label: t('pastoral.filter_all_journals') });
  }

  return (
    <XStack borderBottomWidth={1} borderBottomColor="$borderLight" backgroundColor="$background">
      {filters.map((filter) => {
        const isSelected = currentFilter.scope === filter.key;
        return (
          <FilterTab
            key={filter.key}
            testID={`filter-${filter.key}`}
            onPress={() => onFilterChange({ scope: filter.key })}
            style={{
              borderBottomColor: isSelected ? theme.primary?.val : 'transparent',
            }}
          >
            <TamaguiText
              fontSize="$sm"
              fontWeight={isSelected ? '600' : '400'}
              color={isSelected ? '$primary' : '$color3'}
            >
              {filter.label}
            </TamaguiText>
          </FilterTab>
        );
      })}
    </XStack>
  );
}

interface EmptyStateProps {
  filter: PastoralJournalsFilter['scope'];
  membership: Membership | null;
}

function EmptyState({ filter, membership }: EmptyStateProps) {
  const { t } = useTranslation();

  const getEmptyMessage = (): string => {
    switch (filter) {
      case 'my_journals':
        if (membership?.role === 'small_group_leader' || membership?.role === 'co_leader') {
          return t('pastoral.empty_no_journals_leader');
        }
        return t('pastoral.empty_no_journals');
      case 'submitted_journals':
        return t('pastoral.empty_no_submitted');
      case 'all_journals':
        return t('pastoral.empty_no_journals_all');
      default:
        return t('pastoral.empty_no_journals');
    }
  };

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
      <TamaguiText fontSize={24} color="$color4">
        📝
      </TamaguiText>
      <TamaguiText fontSize="$lg" fontWeight="600" color="$color3" textAlign="center">
        {getEmptyMessage()}
      </TamaguiText>
      {(membership?.role === 'small_group_leader' || membership?.role === 'co_leader') && (
        <TamaguiText fontSize="$sm" color="$color3" textAlign="center">
          {t('pastoral.empty_create_first')}
        </TamaguiText>
      )}
    </YStack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PastoralJournalList({
  tenantId,
  membershipId,
  membership,
  onJournalPress,
  filter,
  onFilterChange,
}: PastoralJournalListProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const { journals, loading, error, hasMore, loadMore, refetch } = usePastoralJournals(
    tenantId,
    membershipId,
    membership,
    filter
  );

  const isInitialLoad = loading && journals.length === 0;

  const handleEndReached = () => {
    if (hasMore && !loading) {
      void loadMore();
    }
  };

  const renderItem = ({ item }: { item: PastoralJournalWithRelations }) => (
    <JournalCardItem journal={item} onPress={onJournalPress} />
  );

  const ListFooterComponent = () => {
    if (!loading) return null;
    return (
      <YStack padding="$4" alignItems="center">
        <ActivityIndicator color={theme.primary?.val} />
      </YStack>
    );
  };

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
        <TamaguiText fontSize={24} color="$color4">
          ⚠️
        </TamaguiText>
        <TamaguiText fontSize="$lg" fontWeight="600" color="$color">
          {t('pastoral.error_loading')}
        </TamaguiText>
        <TamaguiText fontSize="$sm" color="$color3">
          {error.message}
        </TamaguiText>
      </YStack>
    );
  }

  if (!isInitialLoad && journals.length === 0) {
    return <EmptyState filter={filter?.scope || 'my_journals'} membership={membership} />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Filter Tabs */}
      {onFilterChange && membership && (
        <FilterTabs
          currentFilter={filter || { scope: 'my_journals' }}
          membership={membership}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Journal List */}
      <RNFlatList
        testID="pastoral-journal-list"
        data={journals}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={
          isInitialLoad ? null : (
            <EmptyState filter={filter?.scope || 'my_journals'} membership={membership} />
          )
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.2}
        refreshControl={
          <RefreshControl
            tintColor={theme.primary?.val}
            refreshing={loading && journals.length > 0}
            onRefresh={() => void refetch()}
          />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100, // Space for FAB
        }}
        scrollEventThrottle={16}
      />
    </YStack>
  );
}

PastoralJournalList.displayName = 'PastoralJournalList';
