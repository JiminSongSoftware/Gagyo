/**
 * FilterTabs component.
 *
 * Horizontal scrollable filter tabs for contact categories:
 * - 모두 (All)
 * - 목장 (Small Groups)
 * - 초원 (Zones/Prairies)
 * - 그룹/팀 (Groups/Teams)
 * - 멤버 (Members)
 * - 외부 (External)
 */

import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text as TamaguiText, XStack } from 'tamagui';
import type { ContactFilterType } from '../types';
import koTranslations from '@/i18n/locales/ko/common.json';
import enTranslations from '@/i18n/locales/en/common.json';

export interface FilterTabsProps {
  selectedFilter: ContactFilterType;
  onFilterChange: (filter: ContactFilterType) => void;
  testID?: string;
  locale?: 'ko' | 'en';
}

/**
 * Get filter label for a filter type.
 */
function getFilterLabel(filter: ContactFilterType, locale: 'ko' | 'en' = 'ko'): string {
  const translations = locale === 'ko' ? koTranslations : enTranslations;
  const filterMap: Record<ContactFilterType, string> = {
    all: translations.contacts.filters.all,
    small_group: translations.contacts.filters.small_group,
    zone: translations.contacts.filters.zone,
    group_team: translations.contacts.filters.group_team,
    member: translations.contacts.filters.member,
    external: translations.contacts.filters.external,
  };
  return filterMap[filter] || filter;
}

/**
 * Filter tab configuration.
 */
const FILTER_TABS: ContactFilterType[] = [
  'all',
  'small_group',
  'zone',
  'group_team',
  'member',
  'external',
];

/**
 * FilterTabs component.
 */
export function FilterTabs({
  selectedFilter,
  onFilterChange,
  testID,
  locale = 'ko',
}: FilterTabsProps) {
  const handlePress = useCallback(
    (filter: ContactFilterType) => {
      onFilterChange(filter);
    },
    [onFilterChange]
  );

  return (
    <XStack testID={testID ?? 'contact-filter-tabs'}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollView}
      >
        {FILTER_TABS.map((filterKey) => {
          const isSelected = selectedFilter === filterKey;

          return (
            <Pressable
              key={filterKey}
              onPress={() => handlePress(filterKey)}
              testID={`filter-tab-${filterKey}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              style={styles.tab}
            >
              <XStack
                paddingHorizontal="$3"
                paddingVertical="$3"
                alignItems="center"
                justifyContent="center"
                minWidth={60}
                position="relative"
              >
                <TamaguiText
                  fontSize={15}
                  fontWeight={isSelected ? '600' : '400'}
                  color={isSelected ? '#000000' : '#6d6d73'}
                  allowFontScaling
                >
                  {getFilterLabel(filterKey, locale)}
                </TamaguiText>
                {/* Underline indicator for selected tab */}
                {isSelected && (
                  <View style={styles.underline} />
                )}
              </XStack>
            </Pressable>
          );
        })}
      </ScrollView>
    </XStack>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 0,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#000000',
    borderRadius: 1,
  },
});
