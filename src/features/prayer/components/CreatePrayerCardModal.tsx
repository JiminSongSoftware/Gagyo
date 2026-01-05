/**
 * Create Prayer Card Modal Component
 *
 * Modal for creating new prayer cards with content input
 * and recipient selection.
 *
 * Features:
 * - TextArea for prayer content (required, max 1000 chars)
 * - Button to open RecipientSelector
 * - Display selected recipients summary
 * - Form validation
 * - i18n support
 */

import { useState } from 'react';
import { Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Stack, Text as TamaguiText, XStack, YStack, Button, useTheme, styled } from 'tamagui';
import { useTranslation } from '@/i18n';
import { RecipientSelector } from './RecipientSelector';
import type { PrayerCardRecipientScope } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePrayerCardModalProps {
  /**
   * The tenant ID for the prayer card.
   */
  tenantId: string;

  /**
   * The current user's membership ID.
   */
  membershipId: string;

  /**
   * Callback when prayer card is created successfully.
   */
  onSuccess: () => void;

  /**
   * Callback when modal is closed.
   */
  onClose: () => void;

  /**
   * Whether the modal is visible.
   */
  visible: boolean;

  /**
   * Whether a prayer card is currently being created.
   */
  creating?: boolean;
}

const MAX_CONTENT_LENGTH = 1000;

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const ModalOverlay = styled(Stack, {
  name: 'ModalOverlay',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
});

const ModalContent = styled(Stack, {
  name: 'ModalContent',
  backgroundColor: '$background',
  borderRadius: '$4',
  width: '90%',
  maxWidth: 500,
  maxHeight: '80%',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 8,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreatePrayerCardModal({
  tenantId,
  membershipId,
  onSuccess,
  onClose,
  visible,
  creating = false,
}: CreatePrayerCardModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [content, setContent] = useState('');
  const [recipientScope, setRecipientScope] = useState<PrayerCardRecipientScope | null>(null);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);

  const handleRecipientConfirm = useCallback((scope: PrayerCardRecipientScope, ids: string[]) => {
    setRecipientScope(scope);
    setRecipientIds(ids);
    setShowRecipientSelector(false);
  }, []);

  const handleRecipientCancel = useCallback(() => {
    setShowRecipientSelector(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!creating) {
      setContent('');
      setRecipientScope(null);
      setRecipientIds([]);
      onClose();
    }
  }, [creating, onClose]);

  const isValid = content.trim().length > 0 && recipientScope !== null;

  const getRecipientSummary = useCallback(() => {
    if (!recipientScope) return '';

    switch (recipientScope) {
      case 'individual':
        return t('prayer.recipients_selected', { count: recipientIds.length });
      case 'small_group':
        return t('prayer.small_group_selected');
      case 'church_wide':
        return t('prayer.church_wide_selected');
    }
  }, [recipientScope, recipientIds, t]);

  return (
    <>
      {visible && (
        <ModalOverlay testID="create-prayer-modal">
          <ModalContent>
            {/* Header */}
            <YStack
              padding="$4"
              borderBottomWidth={1}
              borderBottomColor="$borderLight"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <TamaguiText fontSize="$lg" fontWeight="bold" color="$color" flex={1}>
                {t('prayer.create_prayer_card')}
              </TamaguiText>
              <Pressable
                testID="close-modal-button"
                onPress={handleClose}
                disabled={creating}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <TamaguiText fontSize="$2xl" color="$color3" paddingHorizontal="$2">
                  ×
                </TamaguiText>
              </Pressable>
            </YStack>

            {/* Content */}
            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 16 }}>
              {/* Prayer Content */}
              <YStack gap="$2" marginBottom="$4">
                <TamaguiText fontSize="$sm" fontWeight="bold" color="$color">
                  {t('prayer.prayer_content')}
                </TamaguiText>
                <Stack
                  borderWidth={1}
                  borderColor="$borderLight"
                  borderRadius="$2"
                  backgroundColor="$backgroundTertiary"
                  padding="$2"
                >
                  <TextInput
                    testID="prayer-content-input"
                    value={content}
                    onChangeText={setContent}
                    placeholder={t('prayer.prayer_content_placeholder')}
                    placeholderTextColor={theme.color3?.val}
                    multiline
                    numberOfLines={6}
                    maxLength={MAX_CONTENT_LENGTH}
                    textAlignVertical="top"
                    style={{
                      fontSize: 16,
                      color: theme.color?.val,
                      minHeight: 120,
                      maxHeight: 200,
                    }}
                    editable={!creating}
                  />
                  <XStack justifyContent="space-between" alignItems="center">
                    <TamaguiText fontSize="$xs" color="$color3">
                      {content.length} / {MAX_CONTENT_LENGTH}
                    </TamaguiText>
                  </XStack>
                </Stack>
              </YStack>

              {/* Recipient Selection */}
              <YStack gap="$2" marginBottom="$4">
                <TamaguiText fontSize="$sm" fontWeight="bold" color="$color">
                  {t('prayer.select_recipients')}
                </TamaguiText>

                {/* Selected Recipients Display */}
                {recipientScope ? (
                  <Stack
                    borderWidth={1}
                    borderColor="$borderLight"
                    borderRadius="$2"
                    backgroundColor="$backgroundTertiary"
                    padding="$3"
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <TamaguiText fontSize="$sm" color="$color">
                        {getRecipientSummary()}
                      </TamaguiText>
                      <Pressable
                        testID="change-recipients-button"
                        onPress={() => setShowRecipientSelector(true)}
                        disabled={creating}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <TamaguiText fontSize="$sm" color="$primary">
                          {t('common.change')}
                        </TamaguiText>
                      </Pressable>
                    </XStack>
                  </Stack>
                ) : (
                  <Pressable
                    testID="select-recipients-button"
                    onPress={() => setShowRecipientSelector(true)}
                    disabled={creating}
                  >
                    <Stack
                      borderWidth={1}
                      borderColor="$borderLight"
                      borderRadius="$2"
                      backgroundColor="$backgroundTertiary"
                      padding="$4"
                      alignItems="center"
                    >
                      <TamaguiText fontSize="$sm" color="$primary">
                        {t('prayer.select_recipients')}
                      </TamaguiText>
                    </Stack>
                  </Pressable>
                )}
              </YStack>
            </ScrollView>

            {/* Footer */}
            <XStack padding="$4" borderTopWidth={1} borderTopColor="$borderLight" gap="$2">
              <Button
                testID="cancel-create-button"
                flex={1}
                size="$4"
                backgroundColor="$backgroundTertiary"
                color="$color"
                onPress={handleClose}
                disabled={creating}
              >
                <TamaguiText>{t('common.cancel')}</TamaguiText>
              </Button>

              <Button
                testID="confirm-create-button"
                flex={1}
                size="$4"
                backgroundColor={isValid ? '$primary' : '$backgroundTertiary'}
                color={isValid ? 'white' : '$color3'}
                onPress={onSuccess}
                disabled={!isValid || creating}
              >
                {creating ? (
                  <XStack alignItems="center" gap="$2">
                    <ActivityIndicator size="small" color="white" />
                    <TamaguiText color="white">{t('common.creating')}</TamaguiText>
                  </XStack>
                ) : (
                  <TamaguiText>{t('common.create')}</TamaguiText>
                )}
              </Button>
            </XStack>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Recipient Selector */}
      <RecipientSelector
        visible={showRecipientSelector}
        tenantId={tenantId}
        currentMembershipId={membershipId}
        onConfirm={handleRecipientConfirm}
        onCancel={handleRecipientCancel}
      />
    </>
  );
}

// ============================================================================
// EXPORT HOOK FOR EXTERNAL USE
// ============================================================================

export interface UseCreatePrayerCardModalResult {
  content: string;
  recipientScope: PrayerCardRecipientScope | null;
  recipientIds: string[];
  setContent: (content: string) => void;
  setRecipients: (scope: PrayerCardRecipientScope, ids: string[]) => void;
  reset: () => void;
  isValid: boolean;
}

export function useCreatePrayerCardModal(): UseCreatePrayerCardModalResult {
  const [content, setContent] = useState('');
  const [recipientScope, setRecipientScope] = useState<PrayerCardRecipientScope | null>(null);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);

  const setRecipients = useCallback((scope: PrayerCardRecipientScope, ids: string[]) => {
    setRecipientScope(scope);
    setRecipientIds(ids);
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setRecipientScope(null);
    setRecipientIds([]);
  }, []);

  const isValid = content.trim().length > 0 && recipientScope !== null;

  return {
    content,
    recipientScope,
    recipientIds,
    setContent,
    setRecipients,
    reset,
    isValid,
  };
}
