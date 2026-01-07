/**
 * EmojiPicker component.
 *
 * Displays a horizontal scrollable list of emoji icons with:
 * - Navigation arrow on the left to switch between icon sets
 * - First set: happy, laugh, shocked, rotfl, kiss, scared, depressed
 * - Second set: emoji-heart, emoji-prayer, emoji-thumbsup, emoji-with-heart-eyes, emjoi-with-upset, emoji-rofl, emoji-crying
 *
 * When an emoji is pressed, it inserts the emoji into the message input.
 */

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { XStack, YStack } from 'tamagui';

// First set of emoji icons - using PNG files
// Path from src/features/chat/components/ -> assets/ = ../../../../assets/
const EMOJI_SET_1 = [
  { id: 'happy', source: require('../../../../assets/happy.png'), name: 'happy' },
  { id: 'laugh', source: require('../../../../assets/laugh.png'), name: 'laugh' },
  { id: 'shocked', source: require('../../../../assets/shocked.png'), name: 'shocked' },
  { id: 'rotfl', source: require('../../../../assets/rotfl.png'), name: 'rotfl' },
  { id: 'kiss', source: require('../../../../assets/kiss.png'), name: 'kiss' },
  { id: 'scared', source: require('../../../../assets/scared.png'), name: 'scared' },
  { id: 'depressed', source: require('../../../../assets/depressed.png'), name: 'depressed' },
];

// Second set of emoji icons - using PNG files
const EMOJI_SET_2 = [
  { id: 'emoji-heart', source: require('../../../../assets/emjoi-heart.png'), name: 'heart' },
  { id: 'emoji-prayer', source: require('../../../../assets/emoji-prayer.png'), name: 'prayer' },
  { id: 'emoji-thumbsup', source: require('../../../../assets/emoji-thumbsup.png'), name: 'thumbsup' },
  { id: 'emoji-with-heart-eyes', source: require('../../../../assets/emoji-with-heart-eyes.png'), name: 'heart-eyes' },
  { id: 'emoji-with-upset', source: require('../../../../assets/emoji-with-upset.png'), name: 'upset' },
  { id: 'emoji-rofl', source: require('../../../../assets/emoji-rofl.png'), name: 'rofl' },
  { id: 'emoji-crying', source: require('../../../../assets/emoji-crying.png'), name: 'crying' },
];

export interface EmojiPickerProps {
  /**
   * Callback when an emoji is selected.
   * @param emoji - The emoji identifier or character to insert
   */
  onEmojiSelect: (emoji: string) => void;

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

/**
 * Right arrow icon for navigating to next emoji set.
 */
function ArrowRightIcon({ size = 24, color = '#8e8e93' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" pointerEvents="none">
      <Path
        d="M9 18L15 12L9 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Emoji icon component that renders PNG assets.
 */
function EmojiIcon({
  source,
  size = 32,
  onPress,
}: {
  source: number;
  size?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        width: size + 16,
        height: size + 16,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Pressable>
  );
}

/**
 * EmojiPicker component.
 */
export function EmojiPicker({ onEmojiSelect, testID }: EmojiPickerProps) {
  const [currentSet, setCurrentSet] = useState(1);

  const currentEmojis = currentSet === 1 ? EMOJI_SET_1 : EMOJI_SET_2;

  const handleEmojiPress = useCallback(
    (emoji: typeof EMOJI_SET_1[number]) => {
      onEmojiSelect(':' + emoji.name + ':');
    },
    [onEmojiSelect]
  );

  const handleNextSet = useCallback(() => {
    setCurrentSet((prev) => (prev === 1 ? 2 : 1));
  }, []);

  return (
    <YStack
      testID={testID ?? 'emoji-picker'}
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderLight"
      paddingVertical="$3"
    >
      <XStack alignItems="center" gap="$2">
        {/* Navigation arrow button */}
        <Pressable
          onPress={handleNextSet}
          testID="emoji-set-nav-button"
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#f5f5f5',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowRightIcon size={20} color="#8e8e93" />
        </Pressable>

        {/* Horizontal scrollable emoji list */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiList}
          testID="emoji-list-scroll"
        >
          {currentEmojis.map((emoji) => (
            <EmojiIcon
              key={emoji.id}
              source={emoji.source}
              onPress={() => handleEmojiPress(emoji)}
            />
          ))}
        </ScrollView>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  emojiList: {
    paddingRight: 16,
  },
});
