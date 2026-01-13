/**
 * FilterTabs component.
 *
 * Left-aligned, smaller pill-style filter tabs for contact categories:
 * - 모두 (All)
 * - 그룹/팀 (Groups/Teams)
 * - 멤버 (Members)
 * - 외부 (External)
 *
 * Note: '목장' (Small Groups) and '초원' (Zones) appear in the list, not as filters.
 * Design matches Figma specs: 34px height, 15px border-radius, left-aligned.
 */

import enTranslations from '@/i18n/locales/en/common.json';
import koTranslations from '@/i18n/locales/ko/common.json';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text as TamaguiText } from 'tamagui';
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
 * Filter tab configuration - simplified.
 * Small groups and zones appear prominently in the list instead.
 */
const FILTER_TABS: ContactFilterType[] = [
  'all',
  'group_team',
  'member',
  'external',
];

/**
 * FilterTabs component with smaller, left-aligned pill design.
 * Figma specs: 34px height, 15px border-radius, gap 10px, left-aligned.
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
    <View style={styles.container} testID={testID ?? 'contact-filter-tabs'}>
      {FILTER_TABS.map((filterKey) => {
        const isSelected = selectedFilter === filterKey;

        return (
          <Pressable
            key={filterKey}
            onPress={() => handlePress(filterKey)}
            testID={`filter-tab-${filterKey}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <TamaguiText
              style={[
                styles.chipText,
                isSelected ? styles.chipTextActive : styles.chipTextInactive,
              ]}
            >
              {getFilterLabel(filterKey, locale)}
            </TamaguiText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: '#F5F5F7',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#AEAEB2',
    backgroundColor: 'transparent',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: '#888888',
  },
});
