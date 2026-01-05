/**
 * Unit tests for Signup screen.
 *
 * Tests form validation and user interactions.
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignupScreen from '../signup';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

// Mock auth functions
jest.mock('@/lib/auth', () => ({
  signUp: jest.fn(),
  getAuthErrorMessage: jest.fn(() => 'errors:unknown_error'),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('SignupScreen', () => {
  it('should render signup form', () => {
    const { getByTestId, getByText } = render(<SignupScreen />);

    expect(getByTestId('signup-screen')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('confirm-password-input')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy();
  });

  it('should validate email format', async () => {
    const { getByTestId, getByText } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('invalid_email')
      );
    });
  });

  it('should validate password length', async () => {
    const { getByTestId, getByText } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@test.com');
    fireEvent.changeText(getByTestId('password-input'), 'short');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('password_too_short')
      );
    });
  });

  it('should validate password confirmation match', async () => {
    const { getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@test.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password456');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('passwords_dont_match')
      );
    });
  });

  it('should enable button when form is valid', () => {
    const { getByTestId } = render(<SignupScreen />);

    const button = getByTestId('signup-button');
    expect(button.props.disabled).toBe(true);

    fireEvent.changeText(getByTestId('email-input'), 'test@test.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');

    expect(button.props.disabled).toBe(false);
  });

  it('should call signUp with valid credentials', async () => {
    const { signUp } = require('@/lib/auth');
    signUp.mockResolvedValue({ data: { user: { id: '123' } } });

    const { getByTestId } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@test.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('signup-button'));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });
});
