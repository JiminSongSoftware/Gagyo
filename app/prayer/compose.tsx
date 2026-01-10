/**
 * Prayer Card Compose Screen
 *
 * Full-page screen for creating new prayer cards.
 * Features:
 * - Text input for prayer content (required, max 1000 chars)
 * - Recipient scope selector (individual/small_group/church_wide)
 * - Recipients picker for individual members or small groups
 * - Urgent toggle ([긴급] marker)
 * - Submit/Cancel buttons
 *
 * Uses mock data from prayerCardStore for development.
 *
 * Based on Figma design:
 * https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=131-1432
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View, Text } from 'react-native';
import {
  Stack,
  XStack,
  YStack,
  Text as TamaguiText,
} from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from '@/i18n';
import { usePrayerCardStore } from '@/stores/prayerCardStore';

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
  contentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  scopeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  scopeButtonActive: {
    backgroundColor: '#000000',
  },
  recipientsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginTop: 12,
  },
  urgentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  smallGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButtonPressed: {
    opacity: 0.7,
  },
  timerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerIconButtonPressed: {
    opacity: 0.7,
  },
  timerPulse: {
    opacity: 0.9,
  },
});

const MAX_CONTENT_LENGTH = 1000;

// ============================================================================
// TYPES
// ============================================================================

type RecipientScope = 'individual' | 'small_group' | 'church_wide';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ScopeButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function ScopeButton({ label, isActive, onPress }: ScopeButtonProps) {
  return (
    <Pressable
      style={[styles.scopeButton, isActive && styles.scopeButtonActive]}
      onPress={onPress}
    >
      <TamaguiText
        fontSize={14}
        fontWeight={isActive ? '600' : '400'}
        color={isActive ? '#ffffff' : '#8e8e93'}
      >
        {label}
      </TamaguiText>
    </Pressable>
  );
}

interface RecipientsPickerModalProps {
  visible: boolean;
  scope: RecipientScope;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

function RecipientsPickerModal({
  visible,
  scope,
  selectedIds,
  onConfirm,
  onClose,
}: RecipientsPickerModalProps) {
  const { t } = useTranslation();
  const getRecipientPickerItems = usePrayerCardStore(
    (state) => state.getRecipientPickerItems
  );

  const items = getRecipientPickerItems();
  const filteredItems =
    scope === 'individual'
      ? items.filter((item) => item.type === 'membership')
      : items.filter((item) => item.type === 'small_group');

  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(
    new Set(selectedIds)
  );

  // Reset local selection when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(new Set(selectedIds));
    }
  }, [visible, selectedIds]);

  const toggleSelection = useCallback((id: string) => {
    setLocalSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(localSelectedIds));
    onClose();
  }, [localSelectedIds, onConfirm, onClose]);

  if (!visible) return null;

  return (
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          width: '90%',
          maxWidth: 400,
          maxHeight: '70%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#11181C' }}>
            {scope === 'individual'
              ? t('prayer.select_members')
              : t('prayer.select_small_groups')}
          </Text>
          <Text style={{ fontSize: 14, color: '#687076', marginTop: 4 }}>
            {scope === 'individual'
              ? t('prayer.members_selected', { count: localSelectedIds.size })
              : t('prayer.small_groups_selected', { count: localSelectedIds.size })}
          </Text>
        </View>

        {/* List */}
        <ScrollView style={{ maxHeight: 300 }}>
          {filteredItems.map((item) => {
            const isSelected = localSelectedIds.has(item.id);
            const initial = item.name?.[0] ?? '?';

            console.log('[RecipientPicker] rendering:', item.name);

            return (
              <Pressable
                key={item.id}
                onPress={() => toggleSelection(item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' }}
              >
                <View style={item.type === 'membership' ? styles.avatar : styles.smallGroupIcon}>
                  <Text
                    style={{
                      fontSize: item.type === 'membership' ? 16 : 14,
                      color: item.type === 'membership' ? '#687076' : '#0369a1',
                      fontWeight: '600',
                    }}
                  >
                    {item.type === 'membership' ? initial : '목'}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, color: '#000', marginLeft: 12, flex: 1 }}>
                  {item.name}
                </Text>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: isSelected ? '#000000' : '#e5e5e5',
                    backgroundColor: isSelected ? '#000000' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={{ flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e5e5', gap: 8 }}>
          <Pressable
            style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' }}
            onPress={onClose}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#11181C' }}>
              {t('prayer.compose_cancel')}
            </Text>
          </Pressable>
          <Pressable
            style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#000000', alignItems: 'center' }}
            onPress={handleConfirm}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
              {t('prayer.confirm_button')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PrayerCardComposeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Store state
  const composeData = usePrayerCardStore((state) => state.composeData);
  const startComposing = usePrayerCardStore((state) => state.startComposing);
  const updateComposeData = usePrayerCardStore((state) => state.updateComposeData);
  const cancelComposing = usePrayerCardStore((state) => state.cancelComposing);
  const submitPrayerCard = usePrayerCardStore((state) => state.submitPrayerCard);

  // Timer/Music state
  const timer = usePrayerCardStore((state) => state.timer);
  const music = usePrayerCardStore((state) => state.music);
  const startTimer = usePrayerCardStore((state) => state.startTimer);
  const pauseTimer = usePrayerCardStore((state) => state.pauseTimer);
  const resetTimer = usePrayerCardStore((state) => state.resetTimer);
  const toggleMusic = usePrayerCardStore((state) => state.toggleMusic);

  // Timer interval ref
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Timer interval effect
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

  // Local state for form
  const [content, setContent] = useState(composeData?.content ?? '');
  const [recipientScope, setRecipientScope] = useState<RecipientScope>(
    composeData?.recipientScope ?? 'small_group'
  );
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>(
    composeData?.recipientMembershipIds ?? []
  );
  const [isUrgent, setIsUrgent] = useState(composeData?.isUrgent ?? false);
  const [showRecipientsPicker, setShowRecipientsPicker] = useState(false);

  // Initialize compose state on mount
  React.useEffect(() => {
    if (!composeData) {
      startComposing();
    }
  }, [composeData, startComposing]);

  // Update store when local state changes
  React.useEffect(() => {
    if (composeData) {
      // Only update if values actually changed to prevent infinite loop
      const needsUpdate =
        composeData.content !== content ||
        composeData.recipientScope !== recipientScope ||
        composeData.isUrgent !== isUrgent ||
        (recipientScope === 'individual' &&
          JSON.stringify(composeData.recipientMembershipIds) !==
            JSON.stringify(selectedRecipientIds)) ||
        (recipientScope === 'small_group' &&
          JSON.stringify(composeData.recipientSmallGroupIds) !==
            JSON.stringify(selectedRecipientIds));

      if (needsUpdate) {
        updateComposeData({
          content,
          recipientScope,
          recipientMembershipIds:
            recipientScope === 'individual' ? selectedRecipientIds : [],
          recipientSmallGroupIds:
            recipientScope === 'small_group' ? selectedRecipientIds : [],
          isUrgent,
        });
      }
    }
  }, [
    content,
    recipientScope,
    selectedRecipientIds,
    isUrgent,
    composeData,
    // updateComposeData is a stable Zustand function, so it's safe to exclude
  ]);

  const handleBack = useCallback(() => {
    cancelComposing();
    router.push('/(tabs)/prayer');
  }, [cancelComposing, router]);

  const handleSubmit = useCallback(() => {
    const newId = submitPrayerCard();
    if (newId) {
      // Navigate back to prayer list after creating
      router.push('/(tabs)/prayer');
    }
  }, [submitPrayerCard, router]);

  const handleRecipientsConfirm = useCallback((ids: string[]) => {
    setSelectedRecipientIds(ids);
    setShowRecipientsPicker(false);
  }, []);

  const getRecipientsSummary = useCallback(() => {
    if (recipientScope === 'church_wide') {
      return t('prayer.church_wide');
    }
    if (selectedRecipientIds.length === 0) {
      return t('prayer.select_recipients');
    }
    if (recipientScope === 'individual') {
      return t('prayer.members_selected', { count: selectedRecipientIds.length });
    }
    return t('prayer.small_groups_selected', { count: selectedRecipientIds.length });
  }, [recipientScope, selectedRecipientIds, t]);

  const isValid = content.trim().length > 0 && recipientScope !== null;

  return (
    <Stack testID="prayer-compose-screen" flex={1} backgroundColor="#ffffff">
      {/* Header */}
      <Stack style={styles.header}>
        <Pressable style={styles.backButton} testID="back-button" onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </Pressable>
        <XStack flex={1} alignItems="center" justifyContent="center">
          <TamaguiText fontSize={16} fontWeight="600" color="#11181C">
            {t('prayer.compose_title')}
          </TamaguiText>
        </XStack>
        <Stack style={{ width: 40 }} />
      </Stack>

      {/* Timer with Background Music */}
      <XStack
        paddingHorizontal={16}
        paddingTop={16}
        paddingBottom={16}
        alignItems="center"
        justifyContent="center"
        gap={16}
        borderBottomWidth={1}
        borderBottomColor="#e5e5e5"
      >
        {/* Play/Pause Button */}
        <Pressable
          testID="timer-play-pause-button"
          onPress={timer.isRunning ? pauseTimer : startTimer}
          style={({ pressed }) => [
            styles.timerButton,
            pressed && styles.timerButtonPressed,
          ]}
        >
          <Ionicons
            name={timer.isRunning ? 'pause' : 'play'}
            size={24}
            color="#ffffff"
          />
        </Pressable>

        {/* Timer Display */}
        <YStack alignItems="center" gap={4}>
          <TamaguiText
            fontSize={32}
            fontWeight="700"
            color="#11181C"
            style={timer.isRunning && styles.timerPulse}
          >
            {String(Math.floor(timer.elapsedSeconds / 60)).padStart(2, '0')}:
            {String(timer.elapsedSeconds % 60).padStart(2, '0')}
          </TamaguiText>
          <TamaguiText fontSize={12} color="#9BA1A6">
            {timer.isRunning
              ? t('prayer.praying_with_you')
              : t('prayer.start_praying')}
          </TamaguiText>
        </YStack>

        {/* Reset Button */}
        <Pressable
          testID="timer-reset-button"
          onPress={resetTimer}
          style={({ pressed }) => [
            styles.timerIconButton,
            pressed && styles.timerIconButtonPressed,
          ]}
        >
          <Ionicons name="refresh" size={20} color="#8e8e93" />
        </Pressable>

        {/* Music Toggle Button */}
        <Pressable
          testID="music-toggle-button"
          onPress={toggleMusic}
          style={({ pressed }) => [
            styles.timerIconButton,
            pressed && styles.timerIconButtonPressed,
          ]}
        >
          <Ionicons
            name={music.isPlaying ? 'musical-notes' : 'musical-notes-outline'}
            size={20}
            color={music.isPlaying ? '#000000' : '#8e8e93'}
          />
        </Pressable>
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Content Input */}
        <XStack paddingHorizontal={16} paddingTop={20}>
          <YStack flex={1} gap={8}>
            <TamaguiText fontSize={14} fontWeight="600" color="#11181C">
              {t('prayer.prayer_content')}
            </TamaguiText>
            <Stack style={{ position: 'relative' }}>
              <TextInput
                testID="prayer-content-input"
                style={styles.contentInput}
                placeholder={t('prayer.compose_content_placeholder')}
                placeholderTextColor="#8e8e93"
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={MAX_CONTENT_LENGTH}
                textAlignVertical="top"
              />
              <XStack position="absolute" bottom={12} right={16}>
                <TamaguiText fontSize={12} color="#9BA1A6">
                  {content.length} / {MAX_CONTENT_LENGTH}
                </TamaguiText>
              </XStack>
            </Stack>
          </YStack>
        </XStack>

        {/* Recipient Scope */}
        <XStack paddingHorizontal={16} paddingTop={24} paddingBottom={8}>
          <TamaguiText fontSize={14} fontWeight="600" color="#11181C">
            {t('prayer.compose_scope_label')}
          </TamaguiText>
        </XStack>

        <XStack paddingHorizontal={16} gap={8}>
          <ScopeButton
            label={t('prayer.scope_individual')}
            isActive={recipientScope === 'individual'}
            onPress={() => setRecipientScope('individual')}
          />
          <ScopeButton
            label={t('prayer.scope_small_group')}
            isActive={recipientScope === 'small_group'}
            onPress={() => setRecipientScope('small_group')}
          />
          <ScopeButton
            label={t('prayer.scope_church_wide')}
            isActive={recipientScope === 'church_wide'}
            onPress={() => setRecipientScope('church_wide')}
          />
        </XStack>

        {/* Recipients Selection */}
        {recipientScope !== 'church_wide' && (
          <XStack paddingHorizontal={16} paddingTop={16} paddingBottom={8}>
            <TamaguiText fontSize={14} fontWeight="600" color="#11181C">
              {t('prayer.compose_recipients_label')}
            </TamaguiText>
          </XStack>
        )}

        {recipientScope !== 'church_wide' && (
          <XStack paddingHorizontal={16}>
            <Pressable
              style={styles.recipientsButton}
              onPress={() => setShowRecipientsPicker(true)}
              testID="select-recipients-button"
            >
              <TamaguiText fontSize={15} color="#11181C">
                {getRecipientsSummary()}
              </TamaguiText>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </Pressable>
          </XStack>
        )}

        {/* Urgent Toggle */}
        <XStack paddingHorizontal={16} paddingTop={16}>
          <XStack
            flex={1}
            alignItems="center"
            justifyContent="space-between"
            style={styles.urgentToggle}
          >
            <XStack alignItems="center" gap={12}>
              <Stack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="#fee2e2"
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
              </Stack>
              <YStack>
                <TamaguiText fontSize={15} fontWeight="600" color="#11181C">
                  {t('prayer.compose_urgent_toggle')}
                </TamaguiText>
                <TamaguiText fontSize={13} color="#9BA1A6">
                  {t('prayer.urgent_badge')}
                </TamaguiText>
              </YStack>
            </XStack>
            <Pressable
              testID="urgent-toggle"
              onPress={() => setIsUrgent(!isUrgent)}
            >
              <Stack
                width={56}
                height={32}
                borderRadius={16}
                backgroundColor={isUrgent ? '#ef4444' : '#e5e5e5'}
                position="relative"
              >
                <Stack
                  width={28}
                  height={28}
                  borderRadius={14}
                  backgroundColor="#ffffff"
                  position="absolute"
                  top={2}
                  left={2}
                  style={{
                    transform: [{ translateX: isUrgent ? 24 : 0 }],
                  }}
                />
              </Stack>
            </Pressable>
          </XStack>
        </XStack>

        {/* Submit Button */}
        <Pressable
          testID="submit-prayer-button"
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
        >
          <XStack alignItems="center" gap={8}>
            <Ionicons name="paper-plane" size={20} color="#ffffff" />
            <TamaguiText fontSize={16} fontWeight="600" color="#ffffff">
              {t('prayer.compose_submit')}
            </TamaguiText>
          </XStack>
        </Pressable>
      </ScrollView>

      {/* Recipients Picker Modal */}
      <RecipientsPickerModal
        visible={showRecipientsPicker}
        scope={recipientScope}
        selectedIds={selectedRecipientIds}
        onConfirm={handleRecipientsConfirm}
        onClose={() => setShowRecipientsPicker(false)}
      />
    </Stack>
  );
}
