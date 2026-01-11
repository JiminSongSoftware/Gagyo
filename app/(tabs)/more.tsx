/**
 * More Tab Screen (KakaoTalk-style "더보기")
 *
 * Clean launcher grid with:
 * - Simple header bar (title left, search+settings right)
 * - Profile row with avatar, name, email
 * - 4-column icon grid with transparent backgrounds
 * - Line icons only, no filled circles
 * - Subtle press feedback
 *
 * Route: /more
 */

import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Dimensions, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { YStack, XStack, Text as TamaguiText } from 'tamagui';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentMembership } from '@/hooks/useCurrentMembership';
import type { Role } from '@/types/database';

const { width: screenWidth } = Dimensions.get('window');
const horizontalPadding = 16;
const gapBetweenItems = 8;
const numberOfColumns = 4;
const itemWidth =
  (screenWidth - horizontalPadding * 2 - gapBetweenItems * (numberOfColumns - 1)) / numberOfColumns;

// ============================================================================
// TYPES
// ============================================================================

interface ServiceItem {
  id: string;
  icon: string;
  label: string;
  route: string;
}

// ============================================================================
// PROFILE ROW COMPONENT
// ============================================================================

interface ProfileRowProps {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: Role | null;
  onPress: () => void;
}

function ProfileRow({ displayName, email, avatarUrl, role, onPress }: ProfileRowProps) {
  const { t } = useTranslation();

  // Get initials from display name or email for fallback
  const getInitials = useCallback(() => {
    if (displayName) {
      const names = displayName.split(' ');
      if (names.length >= 2) {
        const first = names[0]?.[0] || '';
        const second = names[1]?.[0] || '';
        return `${first}${second}`.toUpperCase();
      }
      return displayName.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '?';
  }, [displayName, email]);

  // Get avatar background color based on initials
  const getAvatarColor = useCallback((initials: string) => {
    const colors = ['#5D3FD3', '#0096FF', '#00C853', '#FF6D00', '#D500F9', '#00B8D4'];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  }, []);

  // Get translated role label
  const getRoleLabel = useCallback(() => {
    if (!role) return null;
    return t(`more.roles.${role}` as any);
  }, [role, t]);

  const initials = getInitials();
  const avatarColor = getAvatarColor(initials);
  const roleLabel = getRoleLabel();

  return (
    <Pressable
      testID="more-profile-row"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileRow,
        pressed && styles.profileRowPressed,
      ]}
      accessibilityLabel={`Account, ${displayName || 'User'}, ${email || ''}${role ? `, ${roleLabel}` : ''}`}
      accessibilityRole="button"
    >
      {/* Avatar */}
      <View style={[styles.profileAvatar, { backgroundColor: avatarColor }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.profileAvatarImage}
            accessibilityLabel="Profile avatar"
          />
        ) : (
          <TamaguiText
            fontSize={18}
            fontWeight="600"
            color="#FFFFFF"
            style={styles.profileAvatarInitials}
          >
            {initials}
          </TamaguiText>
        )}
      </View>

      {/* Name, Email, and Role */}
      <YStack flex={1} gap={2} marginLeft={12} justifyContent="center">
        {/* Name - primary identity, no fallback action text */}
        <TamaguiText
          fontSize={16}
          fontWeight="600"
          color="#000000"
          numberOfLines={1}
        >
          {displayName || 'User'}
        </TamaguiText>
        {/* Email - secondary */}
        {email && (
          <TamaguiText
            fontSize={13}
            fontWeight="400"
            color="#888888"
            numberOfLines={1}
          >
            {email}
          </TamaguiText>
        )}
        {/* Role - tertiary, muted */}
        {roleLabel && (
          <TamaguiText
            fontSize={12}
            fontWeight="500"
            color="#AAAAAA"
            numberOfLines={1}
          >
            {roleLabel}
          </TamaguiText>
        )}
      </YStack>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" style={styles.profileChevron} />
    </Pressable>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MoreScreen() {
  const { t } = useTranslation();
  useRequireAuth();
  const router = useRouter();
  const { user } = useAuth();
  const { membership } = useCurrentMembership();

  // Get user data for profile row
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || null;
  const email = user?.email || null;
  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const role = membership?.role || null;

  // Service items - keeping all existing items
  const serviceItems: ServiceItem[] = useMemo(() => [
    {
      id: 'profile_edit',
      icon: 'person-outline',
      label: t('more.services.profile_edit'),
      route: '/screens/settings',
    },
    {
      id: 'chat_rooms',
      icon: 'chatbubbles-outline',
      label: t('more.services.chat_rooms'),
      route: '/chat',
    },
    {
      id: 'members',
      icon: 'people-outline',
      label: t('more.services.members'),
      route: '/chat',
    },
    {
      id: 'calendar',
      icon: 'calendar-outline',
      label: t('more.services.calendar'),
      route: '/screens/calendar',
    },
    {
      id: 'pastoral',
      icon: 'book-outline',
      label: t('more.services.pastoral'),
      route: '/screens/pastoral',
    },
    {
      id: 'prayer',
      icon: 'heart-outline',
      label: t('more.services.prayer'),
      route: '/prayer',
    },
    {
      id: 'announcements',
      icon: 'megaphone-outline',
      label: t('more.services.announcements'),
      route: '/screens/announcements',
    },
    {
      id: 'resources',
      icon: 'play-circle-outline',
      label: t('more.services.resources'),
      route: '/screens/resources',
    },
    {
      id: 'giving',
      icon: 'card-outline',
      label: t('more.services.giving'),
      route: '/screens/giving',
    },
    {
      id: 'volunteers',
      icon: 'hand-outline',
      label: t('more.services.volunteers'),
      route: '/screens/volunteers',
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: t('more.services.settings'),
      route: '/screens/settings',
    },
    {
      id: 'gagyo_team',
      icon: 'sparkles-outline',
      label: t('more.services.gagyo_team'),
      route: '/screens/gagyo-team',
    },
    {
      id: 'files',
      icon: 'document-outline',
      label: t('more.services.files'),
      route: '/screens/files',
    },
  ], [t]);

  const handleServicePress = useCallback(
    (route: string) => () => {
      router.push(route as any);
    },
    [router]
  );

  const handleSearchPress = useCallback(() => {
    // Navigate to search screen or show search UI
    // For now, placeholder - can be extended later
    console.log('Search pressed');
  }, []);

  const handleSettingsPress = useCallback(() => {
    router.push('/screens/settings' as any);
  }, [router]);

  // Render individual grid item
  const renderItem = useCallback(
    ({ item }: { item: ServiceItem }) => (
      <Pressable
        testID={`more-service-${item.id}`}
        onPress={handleServicePress(item.route)}
        style={({ pressed }) => [
          styles.gridItem,
          pressed && styles.gridItemPressed,
        ]}
        accessibilityLabel={`${item.label}`}
        accessibilityRole="button"
      >
        <YStack alignItems="center" gap={4}>
          {/* Icon - no background, just the outline icon */}
          <Ionicons
            name={item.icon as any}
            size={26}
            color="#333333"
          />

          {/* Label below icon */}
          <TamaguiText
            fontSize={12}
            fontWeight="400"
            color="#333333"
            numberOfLines={1}
            textAlign="center"
            style={styles.label}
          >
            {item.label}
          </TamaguiText>
        </YStack>
      </Pressable>
    ),
    [handleServicePress]
  );

  // Item layout for FlatList performance
  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      index,
      length: itemWidth,
      offset: Math.ceil(index / numberOfColumns) * (itemWidth + gapBetweenItems),
    }),
    []
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: ServiceItem) => item.id, []);

  return (
    <YStack testID="more-screen" flex={1} backgroundColor="#FFFFFF">
      {/* Header Bar - safe area only, no extra padding */}
      <XStack
        style={[
          styles.header,
          {
            paddingTop: 0,
            paddingBottom: 8,
          },
        ]}
        alignItems="center"
        justifyContent="space-between"
      >
        {/* Left: Title - properly anchored */}
        <TamaguiText
          fontSize={17}
          fontWeight="600"
          color="#000000"
          paddingLeft={16}
          style={styles.headerTitle}
        >
          {t('more.title')}
        </TamaguiText>

        {/* Right: Search + Settings icons - part of header row */}
        <XStack gap={16} alignItems="center" paddingRight={16}>
          {/* Search Icon */}
          <Pressable
            testID="more-search-button"
            onPress={handleSearchPress}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
            accessibilityLabel="Search"
            accessibilityRole="button"
          >
            <Ionicons name="search-outline" size={24} color="#333333" />
          </Pressable>

          {/* Settings Icon */}
          <Pressable
            testID="more-settings-button"
            onPress={handleSettingsPress}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={24} color="#333333" />
          </Pressable>
        </XStack>
      </XStack>

      {/* Separator line below header */}
      <View style={styles.headerSeparator} />

      {/* Profile Row - KakaoTalk-style account section */}
      <ProfileRow
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        role={role}
        onPress={handleSettingsPress}
      />

      {/* Separator below profile row */}
      <View style={styles.profileSeparator} />

      {/* 4-Column Grid - with proper spacing from header */}
      <FlatList
        testID="more-services-grid"
        data={serviceItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numberOfColumns}
        getItemLayout={getItemLayout}
        contentContainerStyle={[
          styles.gridContainer,
          { paddingBottom: 24 },
        ]}
        columnWrapperStyle={styles.columnWrapper}
        scrollIndicatorInsets={{ right: 0 }}
      />
    </YStack>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
  },

  headerTitle: {
    // No flex:1, let title take natural width
  },

  headerButton: {
    padding: 8,
    // Remove borderRadius, minWidth, alignItems, justifyContent - let Pressable handle touch
    minHeight: 44,
  },

  headerButtonPressed: {
    opacity: 0.5,
  },

  headerSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginLeft: 16,
  },

  // Profile Row Styles
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 72, // Increased to accommodate name + email + role
  },

  profileRowPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },

  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  profileAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  profileAvatarInitials: {
    lineHeight: 44,
  },

  profileChevron: {
    marginLeft: 8,
  },

  profileSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginLeft: 72, // Align with text, not avatar (16 padding + 44 avatar + 12 margin = 72)
  },

  gridContainer: {
    paddingHorizontal: horizontalPadding,
    paddingTop: 28, // Proper breathing room from header
  },

  columnWrapper: {
    gap: gapBetweenItems,
  },

  gridItem: {
    width: itemWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 72,
  },

  gridItemPressed: {
    opacity: 0.6,
  },

  label: {
    maxWidth: itemWidth - 4,
  },
});
