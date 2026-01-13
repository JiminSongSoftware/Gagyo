/**
 * ContactsScreen component.
 *
 * Simple contacts directory with:
 * - Header with community name and collapsible search
 * - Filter tabs (모두, 목장, 초원, 그룹/팀, 멤버, 외부)
 * - Categorized contact list
 *
 * Based on Figma design:
 * https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=128-1255
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, Platform, Keyboard, KeyboardEvent } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { XStack, YStack, Stack } from 'tamagui';
import { Text as TamaguiText } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useTenantContext } from '@/hooks/useTenantContext';
import { SafeScreen } from '@/components/SafeScreen';
import { ContactCategoryHeader } from './components/ContactCategoryHeader';
import { ContactListItem } from './components/ContactListItem';
import { FilterTabs } from './components/FilterTabs';
import type { Contact, ContactSection, ContactCategory, ContactFilterType } from './types';

// Mock data for development - replace with actual data from Supabase
const MOCK_CONTACTS: Contact[] = [
  // Small Groups (목장) - only 모로코 목장
  {
    id: 'sg-1',
    category: 'small_group',
    name: '모로코 목장',
    smallGroupId: 'sg-1',
    memberCount: 7,
  },
  // Zones (초원) - only 캐스트로 초원
  {
    id: 'zone-1',
    category: 'zone',
    name: '캐스트로 초원',
    zoneId: 'zone-1',
    memberCount: 9,
  },
  // Groups/Teams (그룹/팀)
  {
    id: 'team-1',
    category: 'group_team',
    name: '문서출판팀',
    type: 'team',
    memberCount: 5,
  },
  {
    id: 'team-2',
    category: 'group_team',
    name: '제직회',
    type: 'committee',
    memberCount: 15,
  },
  {
    id: 'team-3',
    category: 'group_team',
    name: '찬양팀',
    type: 'ministry',
    memberCount: 12,
  },
  // Members (멤버)
  {
    id: 'member-1',
    category: 'member',
    name: '조영구 목사',
    membershipId: 'member-1',
    userId: 'user-1',
    displayName: '조영구 목사',
    role: '목사',
    smallGroupName: '캐스트로 초원',
  },
  {
    id: 'member-2',
    category: 'member',
    name: 'SAEHONG PARK',
    membershipId: 'member-2',
    userId: 'user-2',
    displayName: 'SAEHONG PARK',
    role: '성도',
    smallGroupName: '모로코 목장',
  },
  {
    id: 'member-3',
    category: 'member',
    name: '이지훈 목자',
    membershipId: 'member-3',
    userId: 'user-3',
    displayName: '이지훈 목자',
    role: '목자',
    smallGroupName: '모로코 목장',
  },
];

export interface ContactsScreenProps {
  testID?: string;
  communityName?: string;
}

/**
 * Group contacts by category.
 */
function groupContactsByCategory(contacts: Contact[]): ContactSection[] {
  const grouped: Record<string, Contact[]> = {
    small_group: [],
    zone: [],
    group_team: [],
    member: [],
  };

  // Sort contacts by category
  for (const contact of contacts) {
    grouped[contact.category]?.push(contact);
  }

  const sections: ContactSection[] = [];

  // Define category order
  const categoryOrder: ContactCategory[] = ['small_group', 'zone', 'group_team', 'member'];

  for (const category of categoryOrder) {
    const categoryContacts = grouped[category];
    if (categoryContacts && categoryContacts.length > 0) {
      sections.push({
        category,
        title: category,
        data: categoryContacts,
      });
    }
  }

  return sections;
}

/**
 * Filter contacts by search query and category filter.
 */
function filterContacts(
  contacts: Contact[],
  searchQuery: string,
  filterType: ContactFilterType
): Contact[] {
  let filtered = contacts;

  // Apply category filter
  if (filterType !== 'all') {
    filtered = filtered.filter((contact) => contact.category === filterType);
  }

  // Apply search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((contact) =>
      contact.name.toLowerCase().includes(query)
    );
  }

  return filtered;
}

/**
 * Search icon component.
 * Matches the native tab bar search icon.
 */
function SearchIcon({ color = '#40434d', size = 20 }: { color?: string; size?: number }) {
  return Platform.select({
    ios: (
      <View style={[styles.searchIcon, { width: size, height: size }]}>
        {/* SF Symbol magnifyingglass */}
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 21L15.5 15.5M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    ),
    android: <Ionicons name="search" size={size} color={color} />,
  });
}

/**
 * Clear button (X) icon for search input.
 */
function ClearIcon({ onPress }: { onPress: () => void }) {
  return Platform.select({
    ios: (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
      >
        <View style={styles.clearButtonCircle}>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path
              d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
              stroke="#8E8E93"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </Pressable>
    ),
    android: (
      <Pressable onPress={onPress} hitSlop={8}>
        <Ionicons name="close-circle" size={20} color="#8E8E93" />
      </Pressable>
    ),
  });
}

/**
 * Church/Community icon component for header.
 * Uses pistos-logo.svg from assets.
 */
function ChurchIcon() {
  return (
    <View style={styles.churchIcon}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <G clipPath="url(#clip0_38_822)">
          <G clipPath="url(#clip1_38_822)">
            <Path d="M18.0158 3.11331L13.2982 4.53014L9.18207 8.04075V12.4802L10.8602 16.2427L15.2296 17.4076L20.1056 15.6444L22.7177 10.2132V1.90112L18.0158 3.11331Z" fill="#9CCA6B"/>
            <Path d="M9.18207 12.6848L9.48287 7.33235L8.04223 6.70264L1.70978 5.41174L2.04223 10.5596L3.51453 14.2276L5.57258 16.1167L8.39052 16.8566L10.1478 15.8649L9.18207 12.6848Z" fill="#88BE51"/>
            <Path d="M10.0528 23.4213C10.0211 22.0832 10.1636 20.7765 10.496 19.4856C10.6544 18.8717 10.8602 18.2577 11.0976 17.6595C12.3641 18.4781 13.7889 18.8717 15.2137 18.8717C17.4934 18.8717 19.7573 17.8484 21.2454 15.9121C25.4248 10.5123 23.5726 0.515747 23.5726 0.515747C23.5726 0.515747 13.8206 1.27139 9.48285 6.35627C6.18997 4.60883 1.86808 4.45141 0.474935 4.45141C0.189975 4.45141 0.0158325 4.45141 0.0158325 4.45141C0.0158325 4.46715 -0.474933 12.3542 3.24538 16.1482C4.40106 17.3289 5.93668 17.9271 7.4723 17.9271C7.9314 17.9271 8.3905 17.8799 8.83377 17.7697C8.70713 18.1632 8.58048 18.5411 8.48549 18.9346C8.08971 20.4459 7.91557 21.973 7.96306 23.5157L10.0528 23.437V23.4213ZM7.4723 15.8491C6.42744 15.8491 5.46174 15.4398 4.73351 14.6999C3.53034 13.4877 2.70713 11.3939 2.31135 8.68618C2.20053 7.93053 2.1372 7.22211 2.12137 6.60815C2.97625 6.67112 4.02111 6.79706 5.11346 7.01746C6.36412 7.28508 7.45647 7.64716 8.35884 8.1037C7.91557 9.04826 7.6781 10.0558 7.64644 11.0633C7.31399 10.6855 7.09235 10.4336 7.06069 10.4021C6.88655 10.1975 6.63325 10.0715 6.34829 10.0558C5.77837 10.0243 5.2876 10.4651 5.25594 11.0318C5.24011 11.3152 5.33509 11.5828 5.52507 11.7875C6.66491 13.0626 7.91557 14.5424 8.73879 15.6444C8.34301 15.7861 7.91557 15.8491 7.48813 15.8491H7.4723ZM10.8602 7.96202C12.6649 5.63211 15.9894 4.30972 18.4591 3.58556C19.6939 3.22348 20.8654 2.98734 21.7836 2.82992C21.8628 3.74299 21.9261 4.92369 21.9103 6.21458C21.8628 8.78063 21.4037 12.307 19.6148 14.6369C18.5541 16.0065 16.9551 16.7779 15.2296 16.7779C14.0581 16.7779 12.9499 16.4158 12.0158 15.7389C12.3166 15.1879 12.6649 14.6369 13.0449 14.1016C15.1187 11.1263 17.5567 9.44182 17.5884 9.42608C17.905 9.20569 18.095 8.81212 18.0317 8.40281C17.9367 7.83608 17.3984 7.45825 16.8285 7.55271C16.6702 7.58419 16.5277 7.63142 16.4169 7.72588C16.3061 7.80459 13.6939 9.59925 11.3826 12.858C11.0818 13.283 10.7968 13.7081 10.5435 14.1489C10.1478 13.5034 9.89446 12.7793 9.78364 12.0079C9.59367 10.5596 9.98945 9.11123 10.876 7.94627L10.8602 7.96202Z" fill="#968364"/>
          </G>
        </G>
      </Svg>
    </View>
  );
}

/**
 * ContactsScreen component.
 */
export function ContactsScreen({ testID, communityName }: ContactsScreenProps) {
  const { activeTenantName } = useTenantContext();
  const searchInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ContactFilterType>('all');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Filter and group contacts
  const filteredContacts = useMemo(
    () => filterContacts(MOCK_CONTACTS, searchQuery, selectedFilter),
    [searchQuery, selectedFilter]
  );

  const groupedSections = useMemo(
    () => groupContactsByCategory(filteredContacts),
    [filteredContacts]
  );

  const handleContactPress = useCallback(
    (contact: Contact) => {
      // TODO: Navigate to appropriate screen based on contact type
      if (contact.category === 'member') {
        console.log('Navigate to member:', contact.name);
      } else {
        console.log('Navigate to group:', contact.name);
      }
    },
    []
  );

  const handleFilterChange = useCallback((filter: ContactFilterType) => {
    setSelectedFilter(filter);
  }, []);

  const handleSearchPress = useCallback(() => {
    setIsSearchExpanded(true);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchCollapse = useCallback(() => {
    setIsSearchExpanded(false);
    setSearchQuery('');
    Keyboard.dismiss();
  }, []);

  const handleClearInput = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Focus input when search expands
  useEffect(() => {
    if (isSearchExpanded) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchExpanded]);

  // Handle keyboard appearance to minimize tabs
  useEffect(() => {
    const keyboardWillShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Scroll to top when keyboard appears to help trigger tab minimization
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardWillShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardWillHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Collapse search when keyboard dismisses without text
  useEffect(() => {
    if (keyboardHeight === 0 && !searchQuery && isSearchExpanded) {
      setIsSearchExpanded(false);
    }
  }, [keyboardHeight, searchQuery, isSearchExpanded]);

  // Map English names to Korean
  const nameMap: Record<string, string> = {
    'Pistos Church': '피스토스 교회',
  };

  // Use provided community name, tenant name (mapped), or default
  const displayName = communityName || (activeTenantName ? nameMap[activeTenantName] || activeTenantName : null) || '피스토스 교회';

  return (
    <SafeScreen backgroundColor="#F5F5F7">
      <YStack flex={1} testID={testID ?? 'contacts-screen'}>
        {/* Header with community name and search icon */}
        <XStack
          paddingHorizontal="$4"
          paddingTop="$1"
          paddingBottom="$2"
          alignItems="center"
          justifyContent="space-between"
        >
          {/* Church icon and Community name */}
          <XStack alignItems="center" gap="$3">
            <ChurchIcon />
            <TamaguiText
              fontSize={24}
              fontWeight="700"
              color="$color1"
            >
              {displayName}
            </TamaguiText>
          </XStack>

          {/* Search icon button */}
          <Pressable
            onPress={handleSearchPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="search-expand-button"
          >
            <SearchIcon />
          </Pressable>
        </XStack>

        {/* Search field (liquid glass style, appears below header when expanded) */}
        {isSearchExpanded && (
          <XStack
            paddingHorizontal="$4"
            paddingBottom="$3"
            alignItems="center"
            gap="$2"
          >
            {/* Liquid glass search container */}
            <XStack
              flex={1}
              height={44}
              backgroundColor="rgba(255, 255, 255, 0.8)"
              borderRadius={12}
              overflow="hidden"
            >
              {/* Blur effect for liquid glass */}
              <BlurView
                intensity={20}
                tint="light"
                style={StyleSheet.absoluteFill}
              />

              {/* Content overlay */}
              <XStack
                flex={1}
                paddingHorizontal="$3"
                alignItems="center"
                gap="$2"
                zIndex={1}
              >
                <SearchIcon color="#8E8E93" size={18} />

                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="검색"
                  placeholderTextColor="#8E8E93"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  autoFocus={false}
                  returnKeyType="search"
                  selectTextOnFocus={false}
                  clearButtonMode="never"
                  importantForAutofill="no"
                  testID="contacts-search-input"
                />

                {searchQuery.length > 0 && <ClearIcon onPress={handleClearInput} />}
              </XStack>
            </XStack>

            {/* Cancel button */}
            <Pressable
              onPress={handleSearchCollapse}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.cancelButtonPressed}
            >
              <TamaguiText fontSize={15} fontWeight="600" color="$color1" paddingHorizontal={4}>
                취소
              </TamaguiText>
            </Pressable>
          </XStack>
        )}

        {/* Top divider line (thicker) */}
        <View style={styles.topDivider} />

        {/* Filter Tabs */}
        <FilterTabs
          selectedFilter={selectedFilter}
          onFilterChange={handleFilterChange}
          testID="contacts-filter-tabs"
        />

        {/* Contact List */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {groupedSections.length === 0 ? (
            // Empty state
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$8" marginTop="$8">
              <TamaguiText fontSize={16} color="$color3">
                {searchQuery ? '검색 결과가 없습니다' : '연락처가 없습니다'}
              </TamaguiText>
            </YStack>
          ) : (
            // Grouped contacts - reduced gaps between categories
            groupedSections.map((section, index) => (
              <YStack key={section.category} marginBottom={index === groupedSections.length - 1 ? 16 : 8}>
                <ContactCategoryHeader
                  category={section.category}
                  testID={`category-header-${section.category}`}
                />

                {section.data.map((contact) => (
                  <ContactListItem
                    key={contact.id}
                    contact={contact}
                    onPress={handleContactPress}
                    testID={`contact-${contact.id}`}
                  />
                ))}
              </YStack>
            ))
          )}
        </ScrollView>
      </YStack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    color: '#000000',
    padding: 0,
    margin: 0,
    minHeight: 22,
  },
  searchIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    marginLeft: 4,
  },
  clearButtonPressed: {
    opacity: 0.6,
  },
  clearButtonCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.5,
  },
  churchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topDivider: {
    height: 2,
    backgroundColor: '#e5e5e5',
  },
});
