/**
 * Unit tests for BackgroundMusicToggle component.
 */

import { render, fireEvent } from '@testing-library/react-native';
import { BackgroundMusicToggle } from '../BackgroundMusicToggle';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

// Mock useBackgroundMusic hook
jest.mock('../hooks/useBackgroundMusic', () => ({
  useBackgroundMusic: jest.fn(),
}));

const mockUseBackgroundMusic = useBackgroundMusic as jest.MockedFunction<typeof useBackgroundMusic>;

describe('BackgroundMusicToggle', () => {
  const defaultProps = {
    testID: 'background-music-toggle',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock return
    mockUseBackgroundMusic.mockReturnValue({
      isEnabled: false,
      isPlaying: false,
      isLoading: false,
      error: null,
      toggle: jest.fn().mockResolvedValue(undefined),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setEnabled: jest.fn(),
    });
  });

  it('should render the toggle button', () => {
    const { getByTestId } = render(<BackgroundMusicToggle {...defaultProps} />);

    expect(getByTestId('background-music-toggle')).toBeTruthy();
  });

  it('should display muted icon when not playing', () => {
    const { getByText } = render(<BackgroundMusicToggle {...defaultProps} />);

    expect(getByText('🔇')).toBeTruthy();
  });

  it('should display sound icon when playing', () => {
    mockUseBackgroundMusic.mockReturnValue({
      isEnabled: true,
      isPlaying: true,
      isLoading: false,
      error: null,
      toggle: jest.fn().mockResolvedValue(undefined),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setEnabled: jest.fn(),
    });

    const { getByText } = render(<BackgroundMusicToggle {...defaultProps} />);

    expect(getByText('🔊')).toBeTruthy();
  });

  it('should call toggle when pressed', () => {
    const mockToggle = jest.fn().mockResolvedValue(undefined);
    mockUseBackgroundMusic.mockReturnValue({
      isEnabled: false,
      isPlaying: false,
      isLoading: false,
      error: null,
      toggle: mockToggle,
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setEnabled: jest.fn(),
    });

    const { getByTestId } = render(<BackgroundMusicToggle {...defaultProps} />);

    const button = getByTestId('background-music-toggle');
    fireEvent.press(button);

    expect(mockToggle).toHaveBeenCalled();
  });

  it('should display label for medium size', () => {
    const { getByText } = render(<BackgroundMusicToggle {...defaultProps} size="md" />);

    expect(getByText('prayer.background_music')).toBeTruthy();
  });

  it('should not display label for small size', () => {
    const { queryByText } = render(<BackgroundMusicToggle {...defaultProps} size="sm" />);

    expect(queryByText('prayer.background_music')).toBeNull();
  });

  it('should have correct accessibility label when disabled', () => {
    const { getByRole } = render(<BackgroundMusicToggle {...defaultProps} />);

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('prayer.background_music_disabled');
  });

  it('should have correct accessibility label when enabled', () => {
    mockUseBackgroundMusic.mockReturnValue({
      isEnabled: true,
      isPlaying: false,
      isLoading: false,
      error: null,
      toggle: jest.fn().mockResolvedValue(undefined),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setEnabled: jest.fn(),
    });

    const { getByRole } = render(<BackgroundMusicToggle {...defaultProps} />);

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('prayer.background_music_enabled');
  });
});
