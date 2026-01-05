/**
 * Message input component.
 *
 * Provides a text input with send button for sending messages.
 * Features:
 * - Auto-growing text input
 * - Character limit indicator
 * - Send button disabled when empty or sending
 * - Error display
 * - Event Chat mode for selective message visibility
 * - Image upload button
 * - Typing indicator support (future)
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { TextInput, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Stack, Text as TamaguiText, useTheme, XStack } from 'tamagui';
import { useTranslation } from '@/i18n';
import type { SendMessageOptions } from '../hooks/useSendMessage';
import { EventChatSelector } from './EventChatSelector';
import { useImageUpload } from '../hooks/useImageUpload';

export interface MessageInputProps {
  /**
   * Callback when send is pressed.
   * @param content - The message content to send
   */
  onSend: (content: string) => Promise<void>;

  /**
   * Callback when Event Chat message is sent.
   * @param options - Message options including excluded user IDs
   */
  onSendEventChat?: (options: SendMessageOptions) => Promise<void>;

  /**
   * Whether a message is currently being sent.
   */
  sending: boolean;

  /**
   * Error to display, if any.
   */
  error: Error | null;

  /**
   * Maximum message length.
   */
  maxLength?: number;

  /**
   * Placeholder text (overrides i18n default).
   */
  placeholder?: string;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;

  /**
   * Conversation ID for Event Chat participant fetching and image upload.
   */
  conversationId?: string;

  /**
   * Tenant ID for Event Chat and image upload.
   */
  tenantId?: string;

  /**
   * Current user's membership ID (filtered from exclusion list).
   */
  currentMembershipId?: string;

  /**
   * Whether to show the image upload button.
   */
  showImageUpload?: boolean;

  /**
   * Callback when an image is successfully uploaded.
   */
  onImageUploaded?: () => void;
}

const DEFAULT_MAX_LENGTH = 2000;

/**
 * MessageInput component.
 */
export function MessageInput({
  onSend,
  onSendEventChat,
  sending,
  error,
  maxLength = DEFAULT_MAX_LENGTH,
  placeholder,
  testID,
  conversationId,
  tenantId,
  currentMembershipId,
  showImageUpload = true,
  onImageUploaded,
}: MessageInputProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const textInputRef = useRef<TextInput>(null);

  // Event Chat state
  const [isEventChatMode, setIsEventChatMode] = useState(false);
  const [excludedMembershipIds, setExcludedMembershipIds] = useState<string[]>([]);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // Image upload hook
  const {
    pickAndUploadImage,
    uploading,
    error: imageError,
    clearError: clearImageError,
  } = useImageUpload();

  const actualPlaceholder = placeholder || t('chat.message_placeholder');

  // Determine if image upload is available
  const canUploadImages = showImageUpload && conversationId && tenantId;

  // Reset input on successful send
  useEffect(() => {
    if (!sending && inputText.trim()) {
      // Send was successful, clear input
      setInputText('');
      setInputHeight(40);
    }
  }, [sending, inputText]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) {
      return;
    }

    setInputText('');
    setInputHeight(40);

    try {
      if (isEventChatMode && onSendEventChat && excludedMembershipIds.length > 0) {
        await onSendEventChat({
          content: trimmed,
          excludedMembershipIds,
        });
      } else {
        await onSend(trimmed);
      }

      // Reset Event Chat mode after successful send
      setIsEventChatMode(false);
      setExcludedMembershipIds([]);
    } catch {
      // Restore input on error
      setInputText(trimmed);
    }
  }, [inputText, sending, onSend, isEventChatMode, onSendEventChat, excludedMembershipIds]);

  const handleEventChatSelectorConfirm = useCallback((selectedIds: string[]) => {
    setExcludedMembershipIds(selectedIds);
    setIsEventChatMode(true);
    setSelectorVisible(false);
  }, []);

  const handleCancelEventChat = useCallback(() => {
    setIsEventChatMode(false);
    setExcludedMembershipIds([]);
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const handleContentSizeChange = useCallback(
    (event: { nativeEvent: { contentSize: { height: number } } }) => {
      const newHeight = Math.max(40, Math.min(100, event.nativeEvent.contentSize.height));
      setInputHeight(newHeight);
    },
    []
  );

  // Handle image upload
  const handleImageUpload = useCallback(async () => {
    if (!canUploadImages || uploading) {
      return;
    }

    clearImageError();

    const result = await pickAndUploadImage({
      tenantId: tenantId!,
      conversationId: conversationId!,
    });

    if (result) {
      onImageUploaded?.();
    }
  }, [
    canUploadImages,
    uploading,
    clearImageError,
    pickAndUploadImage,
    tenantId,
    conversationId,
    onImageUploaded,
  ]);

  const canSend = inputText.trim().length > 0 && !sending;
  const charCount = inputText.length;
  const nearLimit = charCount > maxLength * 0.9;

  const hasEventChatSupport = onSendEventChat && conversationId && tenantId && currentMembershipId;

  return (
    <>
      <Stack
        testID={testID || 'message-input'}
        borderWidth={1}
        borderColor="$borderLight"
        borderRadius="$3"
        backgroundColor="$background"
        padding="$2"
        gap="$2"
      >
        {/* Error display */}
        {error && (
          <Stack
            testID="message-input-error"
            backgroundColor="$dangerLight"
            borderRadius="$2"
            paddingHorizontal="$3"
            paddingVertical="$2"
          >
            <TamaguiText fontSize="$xs" color="$danger">
              {error.message}
            </TamaguiText>
          </Stack>
        )}

        {/* Image upload error display */}
        {imageError && (
          <XStack
            testID="image-upload-error"
            backgroundColor="$dangerLight"
            borderRadius="$2"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            justifyContent="space-between"
          >
            <TamaguiText fontSize="$xs" color="$danger" flex={1}>
              {imageError.message}
            </TamaguiText>
            <Pressable onPress={clearImageError}>
              <TamaguiText fontSize="$xs" color="$danger" fontWeight="bold">
                ✕
              </TamaguiText>
            </Pressable>
          </XStack>
        )}

        {/* Event Chat mode indicator */}
        {isEventChatMode && (
          <XStack
            testID="event-chat-mode-indicator"
            backgroundColor="$warningLight"
            borderRadius="$2"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            gap="$2"
          >
            <TamaguiText fontSize="$sm" color="$warning">
              {t('chat.event_chat_mode_active', {
                count: excludedMembershipIds.length,
              })}
            </TamaguiText>
            <Pressable onPress={handleCancelEventChat}>
              <TamaguiText fontSize="$xs" color="$warning" fontWeight="bold">
                {t('chat.cancel_event_chat')}
              </TamaguiText>
            </Pressable>
          </XStack>
        )}

        <Stack flexDirection="row" alignItems="flex-end" gap="$2">
          {/* Text input */}
          <Stack flex={1} backgroundColor="$backgroundTertiary" borderRadius="$2" minHeight={40}>
            <TextInput
              ref={textInputRef}
              testID="message-text-input"
              value={inputText}
              onChangeText={handleChangeText}
              onContentSizeChange={handleContentSizeChange}
              placeholder={actualPlaceholder}
              placeholderTextColor={theme.color3?.val}
              multiline
              maxLength={maxLength}
              style={{
                paddingHorizontal: 12,
                paddingVertical: Platform.select({
                  ios: 8,
                  android: 8,
                }),
                fontSize: 16,
                color: theme.color1?.val,
                minHeight: inputHeight,
                maxHeight: 100,
                textAlignVertical: 'top',
              }}
              returnKeyType="send"
              onSubmitEditing={canSend ? () => void handleSend() : undefined}
              blurOnSubmit={false}
              editable={!sending}
            />
          </Stack>

          {/* Image upload button */}
          {canUploadImages && (
            <Pressable
              testID="image-upload-button"
              onPress={() => void handleImageUpload()}
              disabled={sending || uploading}
              style={({ pressed }) => ({
                opacity: pressed || uploading ? 0.5 : 1,
              })}
            >
              <Stack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor="$backgroundTertiary"
                alignItems="center"
                justifyContent="center"
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={theme.primary?.val} />
                ) : (
                  <TamaguiText fontSize="$lg">📷</TamaguiText>
                )}
              </Stack>
            </Pressable>
          )}

          {/* Event Chat button */}
          {hasEventChatSupport && !isEventChatMode && (
            <Pressable
              testID="event-chat-button"
              onPress={() => setSelectorVisible(true)}
              disabled={sending}
            >
              <Stack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor="$backgroundTertiary"
                alignItems="center"
                justifyContent="center"
              >
                <TamaguiText fontSize="$lg">👁️</TamaguiText>
              </Stack>
            </Pressable>
          )}

          {/* Send button */}
          <Pressable
            testID={isEventChatMode ? 'event-chat-send-button' : 'send-message-button'}
            onPress={() => void handleSend()}
            disabled={!canSend}
            style={({ pressed }) => ({
              opacity: pressed || !canSend ? 0.5 : 1,
            })}
          >
            <Stack
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={
                isEventChatMode ? '$warning' : canSend ? '$primary' : '$backgroundTertiary'
              }
              alignItems="center"
              justifyContent="center"
            >
              {sending ? (
                <TamaguiText fontSize="$xs" color="white">
                  ...
                </TamaguiText>
              ) : (
                <TamaguiText fontSize="$md" color={isEventChatMode ? 'white' : 'white'}>
                  {isEventChatMode ? 'EC' : t('chat.send')}
                </TamaguiText>
              )}
            </Stack>
          </Pressable>
        </Stack>

        {/* Character count */}
        {nearLimit && (
          <Stack alignItems="flex-end">
            <TamaguiText
              testID="character-count"
              fontSize="$xs"
              color={charCount >= maxLength ? '$danger' : '$color3'}
            >
              {charCount}/{maxLength}
            </TamaguiText>
          </Stack>
        )}
      </Stack>

      {/* Event Chat Selector Modal */}
      {hasEventChatSupport && (
        <EventChatSelector
          conversationId={conversationId!}
          tenantId={tenantId!}
          currentMembershipId={currentMembershipId!}
          visible={selectorVisible}
          onConfirm={handleEventChatSelectorConfirm}
          onCancel={() => setSelectorVisible(false)}
        />
      )}
    </>
  );
}
