/**
 * Unit tests for useBackgroundMusic hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackgroundMusic } from '../useBackgroundMusic';

// Mock expo-av - the hook should handle missing expo-av gracefully
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    INTERRUPTION_MODE_IOS_DO_NOT_MIX_WITH_OTHERS: 1,
    INTERRUPTION_MODE_ANDROID_DO_NOT_MIX_WITH_OTHERS: 1,
  },
  Sound: {
    createAsync: jest.fn().mockResolvedValue({
      sound: {
        playAsync: jest.fn().mockResolvedValue(undefined),
        pauseAsync: jest.fn().mockResolvedValue(undefined),
        stopAsync: jest.fn().mockResolvedValue(undefined),
        setPositionAsync: jest.fn().mockResolvedValue(undefined),
        unloadAsync: jest.fn().mockResolvedValue(undefined),
        getStatusAsync: jest.fn().mockResolvedValue({
          isLoaded: true,
          isPlaying: false,
          didJustFinish: false,
        }),
      },
    }),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('useBackgroundMusic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no saved preference
    mockAsyncStorage.getItem.mockResolvedValue(null);
  });

  it('should load saved preference on mount', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');

    renderHook(() => useBackgroundMusic());

    await waitFor(() => {
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@gagyo:background_music_enabled');
    });
  });

  it('should start with music disabled by default', () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const { result } = renderHook(() => useBackgroundMusic());

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it('should start with music enabled if preference was saved', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');

    const { result } = renderHook(() => useBackgroundMusic());

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(true);
    });
  });

  it('should save preference when enabled state changes', async () => {
    const { result } = renderHook(() => useBackgroundMusic());

    await act(async () => {
      result.current.setEnabled(true);
    });

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@gagyo:background_music_enabled',
        'true'
      );
    });
  });

  it('should provide toggle function', () => {
    const { result } = renderHook(() => useBackgroundMusic());

    expect(typeof result.current.toggle).toBe('function');
  });

  it('should provide play function', () => {
    const { result } = renderHook(() => useBackgroundMusic());

    expect(typeof result.current.play).toBe('function');
  });

  it('should provide pause function', () => {
    const { result } = renderHook(() => useBackgroundMusic());

    expect(typeof result.current.pause).toBe('function');
  });

  it('should provide stop function', () => {
    const { result } = renderHook(() => useBackgroundMusic());

    expect(typeof result.current.stop).toBe('function');
  });

  it('should provide setEnabled function', () => {
    const { result } = renderHook(() => useBackgroundMusic());

    expect(typeof result.current.setEnabled).toBe('function');
  });

  it('should initialize with no error', () => {
    const { result } = renderHook(() => useBackgroundMusic());

    expect(result.current.error).toBeNull();
  });
});
