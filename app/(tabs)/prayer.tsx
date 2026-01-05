/**
 * Prayer Cards List Screen
 *
 * Displays a list of prayer cards with filtering and pagination.
 * Features:
 * - Three filter tabs: My Prayers, Received Prayers, All Prayers
 * - FlatList with pagination
 * - FAB for creating new prayer cards
 * - Navigation to detail screen
 * - i18n support
 */

import { useState, useCallback, useEffect } from 'react';
import { FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { XStack, YStack, Text as TamaguiText, Stack, useTheme, styled } from 'tamagui';
import { useTranslation } from '@/i18n';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { usePrayerCards } from '@/features/prayer/hooks/usePrayerCards';
import { useCreatePrayerCard } from '@/features/prayer/hooks/useCreatePrayerCard';
import {
  CreatePrayerCardModal,
  useCreatePrayerCardModal,
} from '@/features/prayer/components/CreatePrayerCardModal';
import { PrayerAnalyticsSheet } from '@/features/prayer/components/PrayerAnalyticsSheet';
import type { PrayerCardWithAuthor } from '@/types/database';

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const FilterTab = styled(Pressable, {
  name: 'FilterTab',
  flex: 1,
  paddingVertical: '$3',
  alignItems: 'center',
  borderBottomWidth: 2,
  borderBottomColor: '$transparent',
});

const PrayerCardItem = styled(Pressable, {
  name: 'PrayerCardItem',
  backgroundColor: '$background',
  borderRadius: '$3',
  padding: '$4',
  marginBottom: '$3',
  borderWidth: 1,
  borderColor: '$borderLight',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
});

const Avatar = styled(Stack, {
  name: 'Avatar',
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '$primaryLight',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '$3',
});

const FAB = styled(Pressable, {
  name: 'FAB',
  position: 'absolute',
  bottom: 80,
  right: 16,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '$primary',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
});

const FilterButton = styled(Pressable, {
  name: 'FilterButton',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$1',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$2',
  backgroundColor: '$backgroundTertiary',
  borderWidth: 1,
  borderColor: '$borderLight',
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type FilterKey = 'my_prayers' | 'received_prayers' | 'all_prayers';

const FILTERS: FilterKey[] = ['my_prayers', 'received_prayers', 'all_prayers'];

export default function PrayerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { user, tenantId, membershipId } = useRequireAuth();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all_prayers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { prayerCards, loading, hasMore, loadMore, refetch } = usePrayerCards(
    tenantId,
    membershipId,
    { scope: activeFilter }
  );

  const { createPrayerCard, creating } = useCreatePrayerCard(tenantId, membershipId);
  const { content, recipientScope, recipientIds, reset, isValid } = useCreatePrayerCardModal();

  // Reset form when modal closes
  useEffect(() => {
    if (!showCreateModal) {
      reset();
    }
  }, [showCreateModal, reset]);

  const handleCreate = useCallback(() => {
    if (!isValid) return;

    void (async () => {
      const prayerCardId = await createPrayerCard({
        content,
        recipientScope: recipientScope!,
        recipientIds,
      });

      if (prayerCardId) {
        setShowCreateModal(false);
        void refetch();
      }
    })();
  }, [content, recipientScope, recipientIds, isValid, createPrayerCard, refetch]);

  const handleCardPress = useCallback(
    (prayer: PrayerCardWithAuthor) => {
      router.push(`/prayer/${prayer.id}`);
    },
    [router]
  );

  const renderFilterTab = useCallback(
    (filterKey: FilterKey) => {
      const isActive = activeFilter === filterKey;
      return (
        <FilterTab
          key={filterKey}
          testID={`filter-${filterKey}`}
          onPress={() => setActiveFilter(filterKey)}
        >
          <TamaguiText
            fontSize="$sm"
            color={isActive ? '$primary' : '$color3'}
            fontWeight={isActive ? 'bold' : 'normal'}
            numberOfLines={1}
          >
            {t(`prayer.${filterKey}`)}
          </TamaguiText>
        </FilterTab>
      );
    },
    [activeFilter, t]
  );

  const renderPrayerCard = useCallback(
    ({ item }: { item: PrayerCardWithAuthor }) => {
      const formattedDate = new Date(item.created_at).toLocaleDateString();
      const initial = item.author.user.display_name?.[0]?.toUpperCase() ?? '?';

      return (
        <PrayerCardItem testID={`prayer-card-${item.id}`} onPress={() => handleCardPress(item)}>
          <XStack alignItems="flex-start" gap="$3">
            {/* Author Avatar */}
            <Avatar>
              <TamaguiText fontSize="$sm" color="white">
                {initial}
              </TamaguiText>
            </Avatar>

            {/* Content */}
            <YStack flex={1} gap="$1">
              <XStack alignItems="center" justifyContent="space-between">
                <TamaguiText
                  fontSize="$sm"
                  fontWeight="bold"
                  color="$color"
                  numberOfLines={1}
                  flex={1}
                >
                  {item.author.user.display_name || 'Unknown'}
                </TamaguiText>
                <TamaguiText fontSize="$xs" color="$color3">
                  {formattedDate}
                </TamaguiText>
              </XStack>

              <TamaguiText fontSize="$md" color="$color" numberOfLines={3} lineHeight="$4">
                {item.content}
              </TamaguiText>

              <XStack alignItems="center" gap="$2" marginTop="$1">
                {item.answered ? (
                  <Stack
                    backgroundColor="$successLight"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$1"
                  >
                    <TamaguiText fontSize="$xs" color="$success">
                      {t('prayer.answered')}
                    </TamaguiText>
                  </Stack>
                ) : (
                  <Stack
                    backgroundColor="$backgroundTertiary"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$1"
                  >
                    <TamaguiText fontSize="$xs" color="$color3">
                      {t('prayer.unanswered')}
                    </TamaguiText>
                  </Stack>
                )}
              </XStack>
            </YStack>
          </XStack>
        </PrayerCardItem>
      );
    },
    [t, handleCardPress]
  );

  const renderEmptyState = useCallback(() => {
    if (loading) return null;

    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
        testID="prayer-empty-state"
      >
        <TamaguiText fontSize="$lg" color="$color3" marginBottom="$2">
          {t('prayer.no_prayers')}
        </TamaguiText>
        <TamaguiText fontSize="$sm" color="$color3" textAlign="center">
          {t('prayer.start_praying')}
        </TamaguiText>
      </YStack>
    );
  }, [loading, t]);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;

    return (
      <YStack padding="$4" alignItems="center">
        <ActivityIndicator size="small" color={theme.primary?.val} />
      </YStack>
    );
  }, [hasMore, theme.primary?.val]);

  return (
    <Stack testID="prayer-screen" flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack
        padding="$4"
        borderBottomWidth={1}
        borderBottomColor="$borderLight"
        backgroundColor="$background"
      >
        <XStack alignItems="center" justifyContent="space-between" marginBottom="$4">
          <TamaguiText fontSize="$2xl" fontWeight="bold" color="$color">
            {t('prayer.prayer_cards')}
          </TamaguiText>

          <XStack gap="$2">
            {/* Analytics Button */}
            <FilterButton testID="analytics-button" onPress={() => setShowAnalytics(true)}>
              <TamaguiText fontSize="$sm" color="$color3">
                📊
              </TamaguiText>
            </FilterButton>
          </XStack>
        </XStack>

        {/* Filter Tabs */}
        <XStack borderBottomWidth={1} borderBottomColor="$borderLight">
          {FILTERS.map(renderFilterTab)}
        </XStack>
      </YStack>

      {/* Prayer List */}
      <FlatList
        testID="prayer-list"
        data={prayerCards}
        keyExtractor={(item) => item.id}
        renderItem={renderPrayerCard}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasMore) {
            void loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={loading && prayerCards.length > 0}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={theme.primary?.val}
          />
        }
        contentContainerStyle={{ padding: 16 }}
      />

      {/* FAB */}
      {tenantId && membershipId && (
        <FAB testID="create-prayer-fab" onPress={() => setShowCreateModal(true)}>
          <TamaguiText fontSize="$2xl" color="white">
            +
          </TamaguiText>
        </FAB>
      )}

      {/* Create Modal */}
      {tenantId && membershipId && (
        <CreatePrayerCardModal
          visible={showCreateModal}
          tenantId={tenantId}
          membershipId={membershipId}
          onSuccess={() => {
            void handleCreate();
          }}
          onClose={() => setShowCreateModal(false)}
          creating={creating}
        />
      )}

      {/* Analytics Sheet */}
      {tenantId && membershipId && (
        <PrayerAnalyticsSheet
          visible={showAnalytics}
          tenantId={tenantId}
          membershipId={membershipId}
          smallGroupId={user?.small_group_id ?? null}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </Stack>
  );
}
