/**
 * ContactCategoryHeader component.
 *
 * Displays simple section headers for categorized contact lists:
 * - 목장 (Small Groups)
 * - 초원 (Zones/Prairies)
 * - 그룹/팀 (Groups/Teams)
 * - 멤버 (Members)
 */

import { YStack } from 'tamagui';
import { Text as TamaguiText } from 'tamagui';
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
 * Simple category header - just text with spacing, no heavy styling.
 */
export function ContactCategoryHeader({
  category,
  testID,
  locale = 'ko',
}: ContactCategoryHeaderProps) {
  const categoryName = getCategoryName(category, locale);

  return (
    <YStack paddingTop="$4" paddingBottom="$2" paddingHorizontal="$4" testID={testID ?? `contact-category-header-${category}`}>
      <TamaguiText
        fontSize={14}
        fontWeight="500"
        color="#6d6d73"
      >
        {categoryName}
      </TamaguiText>
    </YStack>
  );
}
