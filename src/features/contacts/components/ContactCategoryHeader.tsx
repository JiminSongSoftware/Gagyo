/**
 * ContactCategoryHeader component.
 *
 * Simple text-only section headers for categorized contact lists:
 * - 목장 (Small Groups)
 * - 초원 (Zones/Prairies)
 * - 그룹/팀 (Groups/Teams)
 * - 멤버 (Members)
 *
 * Figma specs: 12px font, #8E8E93 color, no icons.
 */

import { Stack, Text as TamaguiText, XStack } from 'tamagui';
import type { ContactCategory } from '../types';
import koTranslations from '@/i18n/locales/ko/common.json';
import enTranslations from '@/i18n/locales/en/common.json';

export interface ContactCategoryHeaderProps {
  category: ContactCategory;
  testID?: string;
  locale?: 'ko' | 'en';
}

/**
 * Get display name for contact category.
 */
function getCategoryName(
  category: ContactCategory,
  locale: 'ko' | 'en' = 'ko'
): string {
  const translations = locale === 'ko' ? koTranslations : enTranslations;
  const categoryMap: Record<ContactCategory, string> = {
    small_group: translations.contacts.categories.small_group,
    zone: translations.contacts.categories.zone,
    group_team: translations.contacts.categories.group_team,
    member: translations.contacts.categories.member,
  };
  return categoryMap[category] || category;
}

/**
 * Simple category header with text only (no icon).
 * Figma specs: 12px font, #8E8E93 color.
 */
export function ContactCategoryHeader({
  category,
  testID,
  locale = 'ko',
}: ContactCategoryHeaderProps) {
  const categoryName = getCategoryName(category, locale);

  return (
    <XStack
      paddingTop={8}
      paddingBottom={4}
      paddingHorizontal={16}
      alignItems="center"
      testID={testID ?? `contact-category-header-${category}`}
      style={styles.container}
    >
      {/* Category name only - no icon */}
      <TamaguiText
        fontSize={12}
        fontWeight="700"
        color="#8E8E93"
      >
        {categoryName}
      </TamaguiText>
    </XStack>
  );
}

const styles = {
  container: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#D1D1D6',
  } as const,
};
