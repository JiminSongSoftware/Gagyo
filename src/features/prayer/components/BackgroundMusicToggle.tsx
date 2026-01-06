/**
 * Background Music Toggle Component
 *
 * A toggle button for controlling background music playback
 * in the prayer screen.
 *
 * Features:
 * - Visual indicator for music on/off state
 * - Icon animation when playing
 * - i18n support
 * - Accessible button with proper labels
 */

import { Pressable, ActivityIndicator } from 'react-native';
import { Text as TamaguiText, styled, useTheme } from 'tamagui';
import { useTranslation } from '@/i18n';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const ToggleButton = styled(Pressable, {
  name: 'BackgroundMusicToggleButton',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$2',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$2',
  backgroundColor: '$backgroundTertiary',
  borderWidth: 1,
  borderColor: '$borderLight',
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface BackgroundMusicToggleProps {
  /**
   * Optional custom music file path.
   */
  musicFile?: string | number;

  /**
   * Size variant for the button.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Test ID for E2E testing.
   */
  testID?: string;
}

export function BackgroundMusicToggle({
  musicFile,
  size = 'md',
  testID = 'background-music-toggle',
}: BackgroundMusicToggleProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const { isEnabled, isPlaying, isLoading, toggle } = useBackgroundMusic(musicFile);

  const handlePress = () => {
    void toggle();
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const fontSize = size === 'sm' ? '$xs' : size === 'lg' ? '$md' : '$sm';

  return (
    <ToggleButton
      testID={testID}
      onPress={handlePress}
      disabled={isLoading}
      accessibilityLabel={
        isEnabled ? t('prayer.background_music_enabled') : t('prayer.background_music_disabled')
      }
      accessibilityRole="button"
      accessibilityState={{ checked: isEnabled }}
    >
      <TamaguiText
        fontSize={fontSize}
        color={isEnabled ? '$primary' : '$color3'}
        style={{ fontSize: iconSize }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary?.val} />
        ) : isPlaying ? (
          '🔊'
        ) : (
          '🔇'
        )}
      </TamaguiText>
      {size !== 'sm' && (
        <TamaguiText fontSize={fontSize} color={isEnabled ? '$primary' : '$color3'}>
          {t('prayer.background_music')}
        </TamaguiText>
      )}
    </ToggleButton>
  );
}
