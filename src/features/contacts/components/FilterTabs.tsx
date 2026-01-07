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

import enTranslations from '@/i18n/locales/en/common.json';
import koTranslations from '@/i18n/locales/ko/common.json';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text as TamaguiText, XStack } from 'tamagui';
import type { ContactFilterType } from '../types';

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
            >
              <XStack
                paddingHorizontal="$3"
                paddingVertical="$3"
                borderBottomWidth={isSelected ? 2 : 0}
                borderBottomColor="$color1"
                minWidth={60}
                alignItems="center"
                justifyContent="center"
              >
                <TamaguiText
                  fontSize={15}
                  fontWeight={isSelected ? '600' : '400'}
                  color={isSelected ? '$color1' : '$color2'}
                  allowFontScaling
                >
                  {getFilterLabel(filterKey, locale)}
                </TamaguiText>
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
});
