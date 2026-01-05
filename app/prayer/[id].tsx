/**
 * Prayer Card Detail Screen
 *
 * Displays detailed view of a prayer card with option to mark as answered.
 * Features:
 * - Full prayer content display
 * - Author information
 * - Recipients list
 * - Answered status
 * - "Mark as Answered" button (author only, if unanswered)
 * - Celebratory animation when marked answered
 * - Answered timestamp display
 * - i18n support
 */

import { useCallback, useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { XStack, YStack, Text as TamaguiText, Stack, useTheme, styled } from 'tamagui';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from '@/i18n';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { usePrayerCardById } from '@/features/prayer/hooks/usePrayerCards';
import { useMarkPrayerAnswered } from '@/features/prayer/hooks/useMarkPrayerAnswered';

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const Header = styled(Stack, {
  name: 'Header',
  padding: '$4',
  borderBottomWidth: 1,
  borderBottomColor: '$borderLight',
  backgroundColor: '$background',
});

const Avatar = styled(Stack, {
  name: 'Avatar',
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '$primaryLight',
  alignItems: 'center',
  justifyContent: 'center',
});

const ContentCard = styled(Stack, {
  name: 'ContentCard',
  backgroundColor: '$backgroundTertiary',
  borderRadius: '$4',
  padding: '$4',
  marginBottom: '$4',
});

const StatusBadge = styled(Stack, {
  name: 'StatusBadge',
  alignSelf: 'flex-start',
  paddingHorizontal: '$3',
  paddingVertical: '$1',
  borderRadius: '$2',
});

const BackButton = styled(Pressable, {
  name: 'BackButton',
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '$backgroundTertiary',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '$3',
});

const CelebrationContainer = styled(Animated.View, {
  name: 'CelebrationContainer',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1000,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PrayerCardDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { membershipId } = useRequireAuth();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { prayerCards, loading: fetchingPrayer, refetch } = usePrayerCardById(id ?? null);
  const { markAnswered, marking } = useMarkPrayerAnswered(prayerCards[0]?.tenant_id ?? null);

  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationScale = useSharedValue(0);

  const prayer = prayerCards[0];

  const isAuthor = membershipId && prayer?.author_id === membershipId;
  const canMarkAnswered = isAuthor && prayer && !prayer.answered;

  // Handle navigation back if no ID
  useEffect(() => {
    if (!id) {
      router.replace('/(tabs)');
    }
  }, [id, router]);

  const handleMarkAnswered = useCallback(async () => {
    if (!prayer?.id) return;

    try {
      const success = await markAnswered(prayer.id);
      if (success) {
        setShowCelebration(true);
        celebrationScale.value = withSpring(1);
        setTimeout(() => {
          setShowCelebration(false);
          celebrationScale.value = 0;
        }, 2000);
        void refetch();
      }
    } catch (err) {
      console.error('Failed to mark prayer as answered:', err);
    }
  }, [prayer?.id, markAnswered, refetch, celebrationScale]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const formattedDate = prayer
    ? new Date(prayer.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const formattedAnsweredDate = prayer?.answered_at
    ? new Date(prayer.answered_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  if (fetchingPrayer) {
    return (
      <Stack testID="prayer-detail-loading" flex={1} backgroundColor="$background">
        <Header>
          <XStack alignItems="center">
            <BackButton onPress={handleBack}>
              <TamaguiText fontSize="$lg" color="$color">
                ←
              </TamaguiText>
            </BackButton>
            <TamaguiText fontSize="$lg" fontWeight="bold" color="$color" flex={1}>
              {t('prayer.prayer_cards')}
            </TamaguiText>
          </XStack>
        </Header>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={theme.primary?.val} />
        </YStack>
      </Stack>
    );
  }

  if (!fetchingPrayer && !prayer) {
    return (
      <Stack testID="prayer-detail-error" flex={1} backgroundColor="$background">
        <Header>
          <XStack alignItems="center">
            <BackButton onPress={handleBack}>
              <TamaguiText fontSize="$lg" color="$color">
                ←
              </TamaguiText>
            </BackButton>
            <TamaguiText fontSize="$lg" fontWeight="bold" color="$color" flex={1}>
              {t('prayer.prayer_cards')}
            </TamaguiText>
          </XStack>
        </Header>
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <TamaguiText fontSize="$md" color="$danger">
            Prayer card not found
          </TamaguiText>
        </YStack>
      </Stack>
    );
  }

  if (!prayer) {
    return null;
  }

  const initial = prayer.author.user.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <Stack testID="prayer-detail-screen" flex={1} backgroundColor="$background">
      {/* Header */}
      <Header>
        <XStack alignItems="center">
          <BackButton testID="back-button" onPress={handleBack}>
            <TamaguiText fontSize="$lg" color="$color">
              ←
            </TamaguiText>
          </BackButton>
          <TamaguiText fontSize="$lg" fontWeight="bold" color="$color" flex={1}>
            {t('prayer.prayer_cards')}
          </TamaguiText>
        </XStack>
      </Header>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Author Info */}
        <XStack
          padding="$4"
          alignItems="center"
          gap="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderLight"
        >
          <Avatar>
            <TamaguiText fontSize="$lg" color="white">
              {initial}
            </TamaguiText>
          </Avatar>
          <YStack flex={1}>
            <TamaguiText fontSize="$lg" fontWeight="bold" color="$color">
              {prayer.author.user.display_name || 'Unknown'}
            </TamaguiText>
            <TamaguiText fontSize="$sm" color="$color3">
              {formattedDate}
            </TamaguiText>
          </YStack>
        </XStack>

        {/* Status Badge */}
        <XStack padding="$4" pt="$2">
          {prayer.answered ? (
            <StatusBadge backgroundColor="$successLight" testID="status-answered">
              <TamaguiText fontSize="$sm" color="$success" fontWeight="bold">
                ✓ {t('prayer.answered')}
              </TamaguiText>
            </StatusBadge>
          ) : (
            <StatusBadge backgroundColor="$backgroundTertiary" testID="status-unanswered">
              <TamaguiText fontSize="$sm" color="$color3" fontWeight="bold">
                {t('prayer.unanswered')}
              </TamaguiText>
            </StatusBadge>
          )}
        </XStack>

        {/* Prayer Content */}
        <XStack padding="$4">
          <ContentCard flex={1}>
            <TamaguiText fontSize="$4xl" color="$color" lineHeight="$5">
              {prayer.content}
            </TamaguiText>
          </ContentCard>
        </XStack>

        {/* Recipient Scope */}
        <XStack padding="$4" pt="$2">
          <TamaguiText fontSize="$sm" color="$color3">
            {t('prayer.recipient_scope')}: {t(`prayer.${prayer.recipient_scope}`)}
          </TamaguiText>
        </XStack>

        {/* Answered At */}
        {prayer.answered && formattedAnsweredDate && (
          <XStack padding="$4" pt="$2">
            <TamaguiText fontSize="$sm" color="$color3">
              {t('prayer.answered_at')}: {formattedAnsweredDate}
            </TamaguiText>
          </XStack>
        )}

        {/* Mark as Answered Button (only for author, if not answered) */}
        {canMarkAnswered && (
          <XStack padding="$4" pt="$2">
            <Pressable
              testID="mark-answered-button"
              onPress={() => {
                void handleMarkAnswered();
              }}
              disabled={marking}
              style={({ pressed }) => ({
                opacity: pressed || marking ? 0.5 : 1,
                flex: 1,
                backgroundColor: theme.success?.val,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
              })}
            >
              <TamaguiText fontSize="$md" fontWeight="bold" color="white">
                {marking ? t('common.loading') : t('prayer.mark_answered')}
              </TamaguiText>
            </Pressable>
          </XStack>
        )}

        {/* Extra padding at bottom for scrolling */}
        <YStack height="$8" />
      </ScrollView>

      {/* Celebration Overlay */}
      {showCelebration && (
        <CelebrationContainer>
          <Animated.View
            style={{
              transform: [{ scale: celebrationScale }],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TamaguiText fontSize="$6xl" marginBottom="$4">
              🎉
            </TamaguiText>
            <TamaguiText fontSize="$2xl" color="white" fontWeight="bold">
              {t('prayer.mark_answered_success')}
            </TamaguiText>
          </Animated.View>
        </CelebrationContainer>
      )}
    </Stack>
  );
}
