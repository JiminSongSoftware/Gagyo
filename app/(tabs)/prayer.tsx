/**
 * Prayer Cards List Screen
 *
 * Displays a list of prayer cards with filtering:
 * - Filter tabs: 모두 | 목장 | 긴급
 * - Entity dropdown: Filter by specific small group or individual
 *
 * Based on Figma design:
 * https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=131-1418
 */

import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { XStack, YStack, Text as TamaguiText, Stack } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from '@/i18n';
import { usePrayerCardStore } from '@/stores/prayerCardStore';
import type { PrayerCardWithDetails } from '@/types/prayer';

// ============================================================================
// TYPES
// ============================================================================

type FilterTab = 'all' | 'my_small_group' | 'urgent';

// Filter tabs will be populated dynamically with translations

// ============================================================================
// FILTER TAB COMPONENT
// ============================================================================

interface FilterTabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function FilterTabButton({ label, isActive, onPress }: FilterTabProps) {
  return (
    <Pressable onPress={onPress} style={styles.filterTab}>
      <TamaguiText
        fontSize={14}
        color={isActive ? '#000000' : '#8e8e93'}
        fontWeight={isActive ? '600' : '400'}
      >
        {label}
      </TamaguiText>
      {isActive && (
        <Stack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          height={2}
          backgroundColor="#000000"
          borderRadius={1}
        />
      )}
    </Pressable>
  );
}

// ============================================================================
// PRAYER CARD ITEM COMPONENT
// ============================================================================

interface PrayerCardItemProps {
  item: PrayerCardWithDetails;
  onPress: (item: PrayerCardWithDetails) => void;
}

function PrayerCardItem({ item, onPress }: PrayerCardItemProps) {
  const { t } = useTranslation();
  const initial = item.author.user.display_name?.[0]?.toUpperCase() ?? '?';
  const formattedDate = new Date(item.created_at).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(item)}
      testID={`prayer-card-${item.id}`}
    >
      <XStack alignItems="flex-start" gap={12}>
        {/* Author Avatar */}
        <Stack style={styles.avatar}>
          <TamaguiText fontSize={16} color="#687076" fontWeight="600">
            {initial}
          </TamaguiText>
        </Stack>

        {/* Content */}
        <YStack flex={1} gap={4}>
          <XStack alignItems="center" justifyContent="space-between">
            <TamaguiText
              fontSize={14}
              fontWeight="600"
              color="#11181C"
              numberOfLines={1}
              flex={1}
            >
              {item.author.user.display_name || t('prayer.unknown_author')}
            </TamaguiText>
            <TamaguiText fontSize={12} color="#9BA1A6">
              {formattedDate}
            </TamaguiText>
          </XStack>

          <TamaguiText
            fontSize={15}
            color="#363b4b"
            numberOfLines={3}
            lineHeight={22}
          >
            {item.content}
          </TamaguiText>

          <XStack alignItems="center" gap={8} marginTop={4}>
            {item.isUrgent && (
              <Stack style={styles.urgentBadge}>
                <TamaguiText fontSize={11} color="#ef4444">
                  {t('prayer.urgent_badge')}
                </TamaguiText>
              </Stack>
            )}

            {item.answered ? (
              <Stack style={styles.answeredBadge}>
                <XStack alignItems="center" gap={4}>
                  <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                  <TamaguiText fontSize={11} color="#10b981">
                    {t('prayer.answered')}
                  </TamaguiText>
                </XStack>
              </Stack>
            ) : (
              <Stack style={styles.pendingBadge}>
                <TamaguiText fontSize={11} color="#687076">
                  {t('prayer.praying')}
                </TamaguiText>
              </Stack>
            )}

            {item.responseCount > 0 && (
              <TamaguiText fontSize={11} color="#9BA1A6">
                {t('prayer.response_count', { count: item.responseCount })}
              </TamaguiText>
            )}
          </XStack>
        </YStack>
      </XStack>
    </Pressable>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function PrayerScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Store state
  const filteredPrayerCards = usePrayerCardStore((state) => state.filteredPrayerCards);
  const viewScope = usePrayerCardStore((state) => state.viewScope);
  const entityFilter = usePrayerCardStore((state) => state.entityFilter);
  const setViewScope = usePrayerCardStore((state) => state.setViewScope);
  const setEntityFilter = usePrayerCardStore((state) => state.setEntityFilter);
  const selectPrayerCard = usePrayerCardStore((state) => state.selectPrayerCard);
  const getRecipientPickerItems = usePrayerCardStore((state) => state.getRecipientPickerItems);

  // Local state for dropdown
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);

  // Get available entities for dropdown
  const smallGroups = getRecipientPickerItems().filter((item) => item.type === 'small_group');
  const individuals = getRecipientPickerItems().filter((item) => item.type === 'membership');

  // Get current filter label for dropdown button
  const getEntityFilterLabel = () => {
    if (!entityFilter) return t('prayer.filter_all_entities');
    const [type, id] = entityFilter.split(':');
    const items = type === 'small_group' ? smallGroups : individuals;
    const item = items.find((i) => i.id === id);
    return item?.name || t('prayer.filter_all_entities');
  };

  // Filter tabs definition with translations
  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('prayer.filter_all') },
    { key: 'my_small_group', label: t('prayer.filter_small_group') },
    { key: 'urgent', label: t('prayer.filter_urgent') },
  ];

  const handleFilterTabPress = useCallback((tab: FilterTab) => {
    setViewScope(tab);
    // Reset entity filter when switching main tabs
    setEntityFilter(null);
    setShowEntityDropdown(false);
  }, [setViewScope, setEntityFilter]);

  const handleEntitySelect = useCallback((filter: string | null) => {
    setEntityFilter(filter as any);
    setShowEntityDropdown(false);
  }, [setEntityFilter]);

  const handleCardPress = useCallback((item: PrayerCardWithDetails) => {
    selectPrayerCard(item.id);
    router.push(`/prayer/${item.id}`);
  }, [selectPrayerCard, router]);

  const renderEmptyState = useCallback(() => (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding={24}
      testID="prayer-empty-state"
    >
      <TamaguiText fontSize={24} marginBottom={8} color="#9BA1A6">
        🙏
      </TamaguiText>
      <TamaguiText fontSize={16} color="#687076" marginBottom={4}>
        {t('prayer.empty_state_title')}
      </TamaguiText>
      <TamaguiText fontSize={13} color="#9BA1A6" textAlign="center">
        {t('prayer.empty_state_description')}
      </TamaguiText>
    </YStack>
  ), [t]);

  const renderHeader = useCallback(() => (
    <Stack paddingHorizontal={16} paddingTop={12} paddingBottom={8}>
      {/* Filter Tabs Row */}
      <XStack alignItems="center" gap={24} marginBottom={12}>
        {filterTabs.map((tab) => (
          <FilterTabButton
            key={tab.key}
            label={tab.label}
            isActive={viewScope === tab.key}
            onPress={() => handleFilterTabPress(tab.key)}
          />
        ))}
      </XStack>

      {/* Entity Filter Dropdown - shown for my_small_group tab */}
      {(viewScope === 'my_small_group' || viewScope === 'all') && (
        <Pressable
          onPress={() => setShowEntityDropdown(!showEntityDropdown)}
          style={styles.dropdownButton}
        >
          <XStack alignItems="center" justifyContent="space-between" flex={1}>
            <Text style={styles.dropdownButtonText}>
              {getEntityFilterLabel()}
            </Text>
            <Ionicons
              name={showEntityDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#8e8e93"
            />
          </XStack>
        </Pressable>
      )}
    </Stack>
  ), [
    viewScope,
    handleFilterTabPress,
    filterTabs,
    showEntityDropdown,
    getEntityFilterLabel,
  ]);

  const keyExtractor = useCallback((item: PrayerCardWithDetails) => item.id, []);

  const renderItem = useCallback(({ item }: { item: PrayerCardWithDetails }) => (
    <PrayerCardItem item={item} onPress={handleCardPress} />
  ), [handleCardPress]);

  return (
    <Stack testID="prayer-screen" flex={1} backgroundColor="#ffffff">
      {/* Header */}
      <Stack paddingHorizontal={16} paddingTop={12} paddingBottom={8}>
        <XStack alignItems="center" justifyContent="space-between" marginBottom={4}>
          <TamaguiText fontSize={28} fontWeight="700" color="#11181C">
            {t('prayer.prayer_cards')}
          </TamaguiText>
        </XStack>
      </Stack>

      {/* Prayer List */}
      <FlatList<PrayerCardWithDetails>
        testID="prayer-list"
        data={filteredPrayerCards}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          filteredPrayerCards.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/prayer/compose')}
        testID="create-prayer-fab"
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>

      {/* Entity Dropdown Modal */}
      <Modal
        visible={showEntityDropdown}
        transparent
        animationType="none"
        onRequestClose={() => setShowEntityDropdown(false)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowEntityDropdown(false)}
        >
          <Pressable style={styles.dropdownContent} onPress={(e) => e.stopPropagation()}>
            {/* Header with close button */}
            <XStack alignItems="center" justifyContent="space-between" marginBottom={16}>
              <Text style={styles.dropdownTitle}>
                {viewScope === 'my_small_group'
                  ? t('prayer.select_small_group')
                  : t('prayer.select_individual')}
              </Text>
              <Pressable onPress={() => setShowEntityDropdown(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#8e8e93" />
              </Pressable>
            </XStack>

            <ScrollView style={{ maxHeight: 400 }}>
              {/* "All" option to clear filter */}
              <Pressable
                style={styles.dropdownItem}
                onPress={() => handleEntitySelect(null)}
              >
                <Text style={styles.dropdownItemText}>
                  {t('prayer.filter_all_entities')}
                </Text>
                {!entityFilter && (
                  <Ionicons name="checkmark" size={20} color="#000000" />
                )}
              </Pressable>

              {/* Small groups option */}
              {viewScope === 'all' && (
                <>
                  <Text style={styles.dropdownSectionTitle}>
                    {t('prayer.small_groups')}
                  </Text>
                  {smallGroups.map((group) => (
                    <Pressable
                      key={group.id}
                      style={styles.dropdownItem}
                      onPress={() => handleEntitySelect(`small_group:${group.id}`)}
                    >
                      <Text style={styles.dropdownItemText}>
                        {group.name}
                      </Text>
                      {entityFilter === `small_group:${group.id}` && (
                        <Ionicons name="checkmark" size={20} color="#000000" />
                      )}
                    </Pressable>
                  ))}
                </>
              )}

              {/* Individuals option */}
              {viewScope === 'all' && (
                <>
                  <Text style={styles.dropdownSectionTitle}>
                    {t('prayer.individuals')}
                  </Text>
                  {individuals.map((person) => (
                    <Pressable
                      key={person.id}
                      style={styles.dropdownItem}
                      onPress={() => handleEntitySelect(`individual:${person.id}`)}
                    >
                      <Text style={styles.dropdownItemText}>
                        {person.name}
                      </Text>
                      {entityFilter === `individual:${person.id}` && (
                        <Ionicons name="checkmark" size={20} color="#000000" />
                      )}
                    </Pressable>
                  ))}
                </>
              )}

              {/* For my_small_group tab, show only groups */}
              {viewScope === 'my_small_group' && (
                <>
                  {smallGroups.map((group) => (
                    <Pressable
                      key={group.id}
                      style={styles.dropdownItem}
                      onPress={() => handleEntitySelect(`small_group:${group.id}`)}
                    >
                      <Text style={styles.dropdownItemText}>
                        {group.name}
                      </Text>
                      {entityFilter === `small_group:${group.id}` && (
                        <Ionicons name="checkmark" size={20} color="#000000" />
                      )}
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Stack>
  );
}

// ============================================================================
// ADDITIONAL STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    position: 'relative',
  },
  urgentBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  answeredBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#11181C',
    fontWeight: '500',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#11181C',
    flexShrink: 1,
  },
  dropdownSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9BA1A6',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
  },
});
