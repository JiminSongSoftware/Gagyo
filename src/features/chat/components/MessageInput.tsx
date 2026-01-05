/**
 * Message input component.
 *
 * Provides a text input with send button for sending messages.
 * Features:
 * - Auto-growing text input
 * - Character limit indicator
 * - Send button disabled when empty or sending
 * - Error display
 * - Typing indicator support (future)
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { TextInput, Pressable, Platform } from 'react-native';
import { Stack, Text as TamaguiText, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';

export interface MessageInputProps {
  /**
   * Callback when send is pressed.
   * @param content - The message content to send
   */
  onSend: (content: string) => Promise<void>;

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
}

const DEFAULT_MAX_LENGTH = 2000;

/**
 * MessageInput component.
 */
export function MessageInput({
  onSend,
  sending,
  error,
  maxLength = DEFAULT_MAX_LENGTH,
  placeholder,
  testID,
}: MessageInputProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const textInputRef = useRef<TextInput>(null);

  const actualPlaceholder = placeholder || t('chat.message_placeholder');

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
      await onSend(trimmed);
    } catch {
      // Restore input on error
      setInputText(trimmed);
    }
  }, [inputText, sending, onSend]);

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

  const canSend = inputText.trim().length > 0 && !sending;
  const charCount = inputText.length;
  const nearLimit = charCount > maxLength * 0.9;

  return (
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

        {/* Send button */}
        <Pressable
          testID="send-message-button"
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
            backgroundColor={canSend ? '$primary' : '$backgroundTertiary'}
            alignItems="center"
            justifyContent="center"
          >
            {sending ? (
              <TamaguiText fontSize="$xs" color="white">
                ...
              </TamaguiText>
            ) : (
              <TamaguiText fontSize="$md" color="white">
                Send
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
  );
}
