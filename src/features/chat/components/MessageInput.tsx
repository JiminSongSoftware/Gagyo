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
 * - Emoji picker with predefined emoji sets
 * - Plus icon menu for additional options
 * - Safe area padding for iPhone home indicator
 *
 * Layout (left to right):
 * - Plus icon (opens action sheet with options)
 * - Text input
 * - Smile icon (opens emoji picker)
 * - Send button
 */

import { useTranslation } from '@/i18n';
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Stack, Text as TamaguiText, useTheme, XStack } from 'tamagui';
import { useImageUpload } from '../hooks/useImageUpload';
import type { SendMessageOptions } from '../hooks/useSendMessage';
import { EmojiPicker } from './EmojiPicker';
import { EventChatSelector } from './EventChatSelector';

// Import icon assets from assets folder (PNG files)
const PLUS_ICON = require('../../../../assets/plus-circle.png') as number;
const SMILE_ICON = require('../../../../assets/smile.png') as number;
const SEND_ICON = require('../../../../assets/send.png') as number;

// Close icon SVG (inline since no PNG provided)
function CloseIcon({ size = 24, color = '#8e8e93' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" pointerEvents="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

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

  /**
   * Callback when plus icon is pressed (opens attachment menu).
   */
  onPlusPress?: () => void;
}

export interface MessageInputHandle {
  triggerImageUpload: () => void;
}

const DEFAULT_MAX_LENGTH = 2000;

/**
 * MessageInput component.
 */
export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>((props, ref) => {
  const {
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
    onPlusPress,
  } = props;
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = useState('');
  const [_inputHeight, setInputHeight] = useState(40);
  const textInputRef = useRef<TextInput>(null);

  // Track if we just sent a message to clear input after send completes
  const justSentRef = useRef(false);

  // Reset input on successful send
  useEffect(() => {
    if (!sending && justSentRef.current) {
      setInputText('');
      setInputHeight(40);
      justSentRef.current = false;
    }
    if (sending) {
      justSentRef.current = true;
    }
  }, [sending]);

  // Event Chat state
  const [isEventChatMode, setIsEventChatMode] = useState(false);
  const [excludedMembershipIds, setExcludedMembershipIds] = useState<string[]>([]);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Image upload hook
  const {
    pickAndUploadImage,
    uploading,
    error: imageError,
    clearError: clearImageError,
  } = useImageUpload(conversationId ?? null, tenantId ?? null, currentMembershipId ?? null);

  const actualPlaceholder = placeholder ?? t('chat.message_placeholder');
  const canUploadImages = showImageUpload && conversationId && tenantId && currentMembershipId;

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) {
      return;
    }

    setInputText('');
    setInputHeight(40);
    setShowEmojiPicker(false);

    try {
      if (isEventChatMode && onSendEventChat && excludedMembershipIds.length > 0) {
        await onSendEventChat({
          content: trimmed,
          excludedMembershipIds,
        });
      } else {
        await onSend(trimmed);
      }

      setIsEventChatMode(false);
      setExcludedMembershipIds([]);
    } catch {
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

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputText((prev) => prev + emoji);
    textInputRef.current?.focus();
  }, []);

  const handleImageUpload = useCallback(async () => {
    if (!canUploadImages || uploading) {
      return;
    }

    clearImageError();
    const result = await pickAndUploadImage();

    if (result) {
      onImageUploaded?.();
    }
  }, [canUploadImages, uploading, clearImageError, pickAndUploadImage, onImageUploaded]);

  // Show action sheet for plus icon
  const handlePlusPress = useCallback(() => {
    onPlusPress?.();
  }, [onPlusPress]);

  const handleToggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  const canSend = inputText.trim().length > 0 && !sending;
  const charCount = inputText.length;

  // Expose image upload method via ref
  useImperativeHandle(
    ref,
    () => ({
      triggerImageUpload: handleImageUpload,
    }),
    [handleImageUpload]
  );
  const nearLimit = charCount > maxLength * 0.9;
  const hasEventChatSupport = onSendEventChat && conversationId && tenantId && currentMembershipId;

  return (
    <>
      <Stack
        testID={testID ?? 'message-input'}
        backgroundColor="$background"
        borderTopWidth={1}
        borderTopColor="$borderLight"
      >
        {/* Error display */}
        {error && (
          <Stack
            testID="message-input-error"
            backgroundColor="$dangerLight"
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

        {/* Emoji Picker - rendered above the input bar */}
        {showEmojiPicker && (
          <EmojiPicker onEmojiSelect={handleEmojiSelect} testID="emoji-picker-panel" />
        )}

        {/* Input bar */}
        <XStack
          alignItems="flex-end"
          gap="$2"
          paddingHorizontal="$3"
          paddingVertical="$2"
          paddingBottom={Platform.OS === 'ios' ? insets.bottom : 1}
        >
          {/* Plus icon button */}
          <Pressable
            testID="plus-menu-button"
            onPress={handlePlusPress}
            disabled={sending}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Stack
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor="$backgroundTertiary"
              alignItems="center"
              justifyContent="center"
              pointerEvents="none"
            >
              <Image
                source={PLUS_ICON}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
                tintColor="#8e8e93"
              />
            </Stack>
          </Pressable>

          {/* Text input */}
          <Stack
            flex={1}
            backgroundColor="$backgroundTertiary"
            borderRadius="$2"
            minHeight={40}
            justifyContent="center"
          >
            <TextInput
              ref={textInputRef}
              testID="message-text-input"
              value={inputText}
              onChangeText={handleChangeText}
              onContentSizeChange={handleContentSizeChange}
              placeholder={actualPlaceholder}
              placeholderTextColor={theme.color3?.val as string}
              multiline
              maxLength={maxLength}
              style={{
                paddingHorizontal: 12,
                paddingVertical: Platform.select({
                  ios: 8,
                  android: 8,
                }),
                fontSize: 16,
                color: theme.color1?.val as string,
                minHeight: 40,
                maxHeight: 100,
              }}
              returnKeyType="send"
              onSubmitEditing={canSend ? () => void handleSend() : undefined}
              blurOnSubmit={false}
              editable={!sending}
              enablesReturnKeyAutomatically={false}
            />
          </Stack>

          {/* Smile/Emoji picker toggle button */}
          <Pressable
            testID="emoji-picker-button"
            onPress={handleToggleEmojiPicker}
            disabled={sending}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Stack
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={showEmojiPicker ? '$primary' : '$backgroundTertiary'}
              alignItems="center"
              justifyContent="center"
              pointerEvents="none"
            >
              {showEmojiPicker ? (
                <CloseIcon size={20} color="white" />
              ) : (
                <Image source={SMILE_ICON} style={{ width: 24, height: 24 }} resizeMode="contain" />
              )}
            </Stack>
          </Pressable>

          {/* Send button - only show when typing or in event chat mode */}
          {(canSend || isEventChatMode) && (
            <Pressable
              testID={isEventChatMode ? 'event-chat-send-button' : 'send-message-button'}
              onPress={() => void handleSend()}
              disabled={!canSend}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Image
                    source={SEND_ICON}
                    style={{ width: 24, height: 24 }}
                    resizeMode="contain"
                    tintColor={canSend || isEventChatMode ? 'white' : '#8e8e93'}
                  />
                )}
              </Stack>
            </Pressable>
          )}
        </XStack>

        {/* Character count */}
        {nearLimit && (
          <Stack alignItems="flex-end" paddingHorizontal="$3" paddingBottom="$2">
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
});

MessageInput.displayName = 'MessageInput';
