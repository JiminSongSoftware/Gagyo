/**
 * Hook for managing background music playback in prayer screens.
 *
 * Features:
 * - Play/pause/stop background music
 * - Persistent preference storage
 * - Interruption handling (calls, other apps)
 * - Loop functionality
 *
 * NOTE: Requires expo-av to be installed:
 * bun add expo-av
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import expo-av to allow builds without it
let Audio: typeof import('expo-av').Audio;

try {
  const av = require('expo-av');
  Audio = av.Audio;
} catch {
  // expo-av not installed - hook will be a no-op
}

const BACKGROUND_MUSIC_KEY = '@gagyo:background_music_enabled';
const BACKGROUND_MUSIC_FILE = require('../../../../assets/music/prayer-background.mp3');

export interface BackgroundMusicState {
  isEnabled: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  error: Error | null;
}

export interface BackgroundMusicActions {
  toggle: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
}

export type BackgroundMusicReturn = BackgroundMusicState & BackgroundMusicActions;

/**
 * Hook for managing background music playback.
 *
 * @param musicFile - Optional asset file to play (defaults to prayer-background.mp3)
 * @returns BackgroundMusicReturn with state and actions
 *
 * @example
 * ```tsx
 * function PrayerScreen() {
 *   const { isEnabled, isPlaying, toggle } = useBackgroundMusic();
 *
 *   return (
 *     <View>
 *       <Button onPress={toggle}>
 *         {isPlaying ? 'Pause Music' : 'Play Music'}
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useBackgroundMusic(musicFile?: string | number): BackgroundMusicReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use the Sound type from expo-av if available, otherwise use unknown
  type SoundType = typeof import('expo-av').Audio.Sound;
  const soundRef = useRef<SoundType | null>(null);
  const isMountedRef = useRef(true);

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(BACKGROUND_MUSIC_KEY);
        if (saved !== null && isMountedRef.current) {
          setIsEnabled(JSON.parse(saved));
        }
      } catch {
        // Ignore storage errors
      }
    };

    void loadPreference();

    return () => {
      isMountedRef.current = false;
      // Cleanup sound on unmount
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  // Save preference when changed
  useEffect(() => {
    const savePreference = async () => {
      try {
        await AsyncStorage.setItem(BACKGROUND_MUSIC_KEY, JSON.stringify(isEnabled));
      } catch {
        // Ignore storage errors
      }
    };

    void savePreference();
  }, [isEnabled]);

  // Setup audio mode on mount
  useEffect(() => {
    if (!Audio) return;

    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX_WITH_OTHERS,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX_WITH_OTHERS,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.warn('Failed to set audio mode:', err);
      }
    };

    void setupAudio();
  }, []);

  // Load sound object
  const loadSound = useCallback(async (): Promise<AudioSound | null> => {
    if (!Audio || soundRef.current) {
      return soundRef.current;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { sound } = await Audio.Sound.createAsync(
        musicFile ?? BACKGROUND_MUSIC_FILE,
        { shouldPlay: false, isLooping: true },
        (status) => {
          if (!isMountedRef.current) return;

          if (status.didJustFinish && !status.isLooping) {
            setIsPlaying(false);
          }
          if (status.error) {
            setError(new Error(status.error));
          }
        }
      );

      if (isMountedRef.current) {
        soundRef.current = sound;
        setIsLoading(false);
      }
      return sound;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        setIsLoading(false);
      }
      return null;
    }
  }, [musicFile]);

  // Play music
  const play = useCallback(async () => {
    if (!Audio) return;

    try {
      const sound = await loadSound();
      if (sound && isMountedRef.current) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.playAsync();
          if (isMountedRef.current) {
            setIsPlaying(true);
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    }
  }, [loadSound]);

  // Pause music
  const pause = useCallback(async () => {
    if (!Audio || !soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    }
  }, []);

  // Stop music
  const stop = useCallback(async () => {
    if (!Audio || !soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    }
  }, []);

  // Toggle enabled state
  const toggle = useCallback(async () => {
    if (!Audio) return;

    const newState = !isEnabled;
    setIsEnabled(newState);

    if (newState) {
      await play();
    } else {
      await pause();
    }
  }, [isEnabled, play, pause]);

  // Set enabled state externally
  const setEnabled = useCallback(
    (enabled: boolean) => {
      setIsEnabled(enabled);
      if (enabled) {
        void play();
      } else {
        void pause();
      }
    },
    [play, pause]
  );

  return {
    isEnabled,
    isPlaying,
    isLoading,
    error,
    toggle,
    play,
    pause,
    stop,
    setEnabled,
  };
}
