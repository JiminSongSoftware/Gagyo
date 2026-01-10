/**
 * Prayer Card Detail Screen
 *
 * Displays detailed view of a prayer card with:
 * - Timer for prayer duration
 * - Music toggle for background worship music
 * - "응답받음" (Mark as Answered) button with response input
 * - Responses section showing testimonies
 *
 * Based on Figma design:
 * https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=131-1429
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { XStack, YStack, Text as TamaguiText, Stack, Button, styled } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from '@/i18n';
import { usePrayerCardStore } from '@/stores/prayerCardStore';
import type { PrayerCardWithDetails } from '@/types/prayer';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButtonActive: {
    backgroundColor: '#000000',
  },
  musicButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicButtonActive: {
    backgroundColor: '#000000',
  },
  answeredBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pendingBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  responseCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  markAnsweredButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  markAnsweredButtonDisabled: {
    opacity: 0.5,
  },
  dialogInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
});

// ============================================================================
// STYLIZED DIALOG COMPONENTS
// ============================================================================

const AnswerDialogOverlay = styled(Stack, {
  name: 'AnswerDialogOverlay',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
});

const AnswerDialogContent = styled(Stack, {
  name: 'AnswerDialogContent',
  backgroundColor: '#ffffff',
  borderRadius: 16,
  width: '85%',
  maxWidth: 400,
  padding: 20,
  margin: 20,
});

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface TimerDisplayProps {
  elapsedSeconds: number;
  isRunning: boolean;
}

function TimerDisplay({ elapsedSeconds, isRunning }: TimerDisplayProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <XStack alignItems="center" gap={8}>
      <TamaguiText fontSize={32} fontWeight="700" color="#11181C">
        {formatTime(elapsedSeconds)}
      </TamaguiText>
      {isRunning && (
        <Stack
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor="#10b981"
          animation="pulse 1s ease-in-out infinite"
        />
      )}
    </XStack>
  );
}

interface ResponseItemProps {
  response: {
    id: string;
    authorName: string;
    authorPhotoUrl: string | null;
    content: string;
    createdAt: string;
  };
}

function ResponseItem({ response }: ResponseItemProps) {
  const formattedDate = new Date(response.createdAt).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Stack style={styles.responseCard}>
      <XStack alignItems="center" gap={8} marginBottom={8}>
        <Stack style={styles.avatar}>
          <TamaguiText fontSize={16} color="#687076" fontWeight="600">
            {response.authorName[0] || '?'}
          </TamaguiText>
        </Stack>
        <YStack flex={1}>
          <TamaguiText fontSize={14} fontWeight="600" color="#11181C">
            {response.authorName}
          </TamaguiText>
          <TamaguiText fontSize={12} color="#9BA1A6">
            {formattedDate}
          </TamaguiText>
        </YStack>
        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
      </XStack>
      <TamaguiText fontSize={14} color="#363b4b" lineHeight={20}>
        {response.content}
      </TamaguiText>
    </Stack>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PrayerCardDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Store state
  const selectedPrayerCard = usePrayerCardStore((state) => state.selectedPrayerCard);
  const timer = usePrayerCardStore((state) => state.timer);
  const music = usePrayerCardStore((state) => state.music);
  const startTimer = usePrayerCardStore((state) => state.startTimer);
  const pauseTimer = usePrayerCardStore((state) => state.pauseTimer);
  const resetTimer = usePrayerCardStore((state) => state.resetTimer);
  const toggleMusic = usePrayerCardStore((state) => state.toggleMusic);
  const markAsAnswered = usePrayerCardStore((state) => state.markAsAnswered);
  const clearSelectedPrayerCard = usePrayerCardStore((state) => state.clearSelectedPrayerCard);

  // Local state
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [responseContent, setResponseContent] = useState('');

  // Timer interval
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Handle navigation back if no ID
  useEffect(() => {
    if (!id) {
      router.back();
    }
  }, [id, router]);

  // Set up timer interval
  useEffect(() => {
    if (timer.isRunning) {
      timerInterval.current = setInterval(() => {
        usePrayerCardStore.getState().tickTimer();
      }, 1000);
    } else if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [timer.isRunning]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearSelectedPrayerCard();
    };
  }, [clearSelectedPrayerCard]);

  const prayer = selectedPrayerCard;
  const canMarkAnswered = prayer && !prayer.answered;

  const handleBack = useCallback(() => {
    router.push('/(tabs)/prayer');
  }, [router]);

  const handleMarkAnswered = useCallback(() => {
    if (!prayer) return;
    markAsAnswered(prayer.id, responseContent || undefined);
    setShowAnswerDialog(false);
    setResponseContent('');
  }, [prayer, markAsAnswered, responseContent]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!prayer) {
    return (
      <Stack flex={1} backgroundColor="#ffffff" alignItems="center" justifyContent="center">
        <TamaguiText fontSize={16} color="#687076">
          {t('prayer.detail_not_found')}
        </TamaguiText>
      </Stack>
    );
  }

  const initial = prayer.author.user.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <Stack testID="prayer-detail-screen" flex={1} backgroundColor="#ffffff">
      {/* Header */}
      <Stack style={styles.header}>
        <Pressable style={styles.backButton} testID="back-button" onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </Pressable>
        <XStack flex={1} alignItems="center" justifyContent="center">
          <TamaguiText fontSize={16} fontWeight="600" color="#11181C">
            {t('prayer.detail_title')}
          </TamaguiText>
        </XStack>
        <Stack style={{ width: 40 }} />
      </Stack>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Author Info */}
        <XStack
          paddingHorizontal={16}
          paddingTop={16}
          paddingBottom={12}
          alignItems="center"
          gap={12}
          borderBottomWidth={1}
          borderBottomColor="#e5e5e5"
        >
          <Stack style={styles.avatar}>
            <TamaguiText fontSize={18} color="#687076" fontWeight="600">
              {initial}
            </TamaguiText>
          </Stack>
          <YStack flex={1}>
            <TamaguiText fontSize={16} fontWeight="600" color="#11181C">
              {prayer.author.user.display_name || t('prayer.anonymous')}
            </TamaguiText>
            <TamaguiText fontSize={13} color="#9BA1A6">
              {formatTime(prayer.created_at)}
            </TamaguiText>
          </YStack>
          {prayer.answered ? (
            <Stack style={styles.answeredBadge}>
              <XStack alignItems="center" gap={4}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <TamaguiText fontSize={12} color="#10b981" fontWeight="600">
                  {t('prayer.answered')}
                </TamaguiText>
              </XStack>
            </Stack>
          ) : (
            <Stack style={styles.pendingBadge}>
              <TamaguiText fontSize={12} color="#687076" fontWeight="600">
                {t('prayer.praying')}
              </TamaguiText>
            </Stack>
          )}
        </XStack>

        {/* Timer Section */}
        <XStack
          paddingHorizontal={16}
          paddingVertical={20}
          alignItems="center"
          justifyContent="center"
          gap={16}
          borderBottomWidth={1}
          borderBottomColor="#e5e5e5"
        >
          <Pressable
            testID="timer-button"
            style={[styles.timerButton, timer.isRunning && styles.timerButtonActive]}
            onPress={timer.isRunning ? pauseTimer : startTimer}
          >
            <Ionicons
              name={timer.isRunning ? 'pause' : 'play'}
              size={24}
              color={timer.isRunning ? '#ffffff' : '#11181C'}
            />
          </Pressable>

          <TimerDisplay elapsedSeconds={timer.elapsedSeconds} isRunning={timer.isRunning} />

          <Pressable
            testID="reset-timer-button"
            style={styles.timerButton}
            onPress={resetTimer}
          >
            <Ionicons name="refresh" size={20} color="#11181C" />
          </Pressable>

          <Pressable
            testID="music-button"
            style={[styles.musicButton, music.isPlaying && styles.musicButtonActive]}
            onPress={toggleMusic}
          >
            <Ionicons
              name={music.isPlaying ? 'musical-notes' : 'musical-notes-outline'}
              size={24}
              color={music.isPlaying ? '#ffffff' : '#11181C'}
            />
          </Pressable>
        </XStack>

        {/* Prayer Content */}
        <XStack paddingHorizontal={16} paddingTop={20}>
          <Stack style={styles.contentCard} width="100%">
            <TamaguiText fontSize={18} color="#11181C" lineHeight={26}>
              {prayer.content}
            </TamaguiText>
          </Stack>
        </XStack>

        {/* Recipients Info */}
        <XStack paddingHorizontal={16} paddingBottom={8}>
          <TamaguiText fontSize={13} color="#9BA1A6">
            {prayer.recipient_scope === 'individual' && t('prayer.scope_individual_prayer')}
            {prayer.recipient_scope === 'small_group' && t('prayer.scope_small_group_prayer')}
            {prayer.recipient_scope === 'church_wide' && t('prayer.scope_church_wide_prayer')}
          </TamaguiText>
        </XStack>

        {/* Answered Date */}
        {prayer.answered && prayer.answered_at && (
          <XStack paddingHorizontal={16} paddingBottom={20}>
            <TamaguiText fontSize={13} color="#9BA1A6">
              {t('prayer.answered_date_label')} {formatTime(prayer.answered_at)}
            </TamaguiText>
          </XStack>
        )}

        {/* Responses Section */}
        {prayer.responses.length > 0 && (
          <XStack paddingHorizontal={16} paddingBottom={8}>
            <TamaguiText fontSize={15} fontWeight="600" color="#11181C">
              {t('prayer.responses_section')} ({prayer.responses.length})
            </TamaguiText>
          </XStack>
        )}

        {prayer.responses.map((response) => (
          <XStack key={response.id} paddingHorizontal={16}>
            <ResponseItem response={response} />
          </XStack>
        ))}

        {/* Mark as Answered Button */}
        {canMarkAnswered && (
          <Pressable
            testID="mark-answered-button"
            style={styles.markAnsweredButton}
            onPress={() => setShowAnswerDialog(true)}
          >
            <XStack alignItems="center" gap={8}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <TamaguiText fontSize={16} fontWeight="600" color="#ffffff">
                {t('prayer.mark_answered_button')}
              </TamaguiText>
            </XStack>
          </Pressable>
        )}
      </ScrollView>

      {/* Answer Dialog */}
      {showAnswerDialog && (
        <AnswerDialogOverlay
          testID="answer-dialog-overlay"
          onStartShouldSetResponder={() => true}
        >
          <AnswerDialogContent>
            <YStack gap={16}>
              <YStack gap={4}>
                <TamaguiText
                  testID="answer-dialog-title"
                  fontSize={18}
                  fontWeight="700"
                  color="#11181C"
                >
                  {t('prayer.mark_answered_dialog_title')}
                </TamaguiText>
                <TamaguiText fontSize={14} color="#687076">
                  {t('prayer.mark_answered_dialog_description')}
                </TamaguiText>
              </YStack>

              <TextInput
                style={styles.dialogInput}
                placeholder={t('prayer.mark_answered_placeholder')}
                placeholderTextColor="#8e8e93"
                value={responseContent}
                onChangeText={setResponseContent}
                multiline
                maxLength={500}
                testID="response-input"
              />

              <XStack gap={8}>
                <Button
                  flex={1}
                  size="$4"
                  backgroundColor="#f5f5f5"
                  onPress={() => {
                    setShowAnswerDialog(false);
                    setResponseContent('');
                  }}
                  testID="cancel-answer-button"
                >
                  <TamaguiText color="#11181C" fontWeight="600">
                    {t('prayer.cancel_button')}
                  </TamaguiText>
                </Button>
                <Button
                  flex={1}
                  size="$4"
                  backgroundColor="#10b981"
                  onPress={handleMarkAnswered}
                  testID="confirm-answer-button"
                >
                  <TamaguiText color="#ffffff" fontWeight="600">
                    {t('prayer.confirm_button')}
                  </TamaguiText>
                </Button>
              </XStack>
            </YStack>
          </AnswerDialogContent>
        </AnswerDialogOverlay>
      )}
    </Stack>
  );
}
