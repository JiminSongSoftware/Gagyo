/**
 * Signup Screen
 *
 * Allows new users to create an account with email and password.
 * Includes validation for email format and password matching.
 *
 * Test IDs are provided for E2E testing with Detox.
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { signUp, getAuthErrorMessage } from '@/lib/auth';

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function validateEmail(emailValue: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  }

  type ValidationErrorKey =
    | 'auth.invalid_email'
    | 'auth.password_too_short'
    | 'auth.passwords_dont_match';

  const validationFallbacks: Record<ValidationErrorKey, string> = {
    'auth.invalid_email': 'Please enter a valid email address',
    'auth.password_too_short': 'Password must be at least 8 characters',
    'auth.passwords_dont_match': "Passwords don't match",
  };

  function validateForm(): ValidationErrorKey | null {
    if (!validateEmail(email)) {
      return 'auth.invalid_email';
    }

    if (password.length < 8) {
      return 'auth.password_too_short';
    }

    if (password !== confirmPassword) {
      return 'auth.passwords_dont_match';
    }

    return null;
  }

  async function handleSignup() {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert(
        t(validationError, {
          defaultValue: validationFallbacks[validationError],
        })
      );
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      // Navigation is handled by auth guard in _layout.tsx
    } catch (error: unknown) {
      const errorKey = getAuthErrorMessage(error);
      Alert.alert(t(errorKey, { defaultValue: 'Signup failed' }));
    } finally {
      setLoading(false);
    }
  }

  const isFormValid = email.length > 0 && password.length >= 8 && confirmPassword.length > 0;

  return (
    <YStack
      testID="signup-screen"
      flex={1}
      padding="$4"
      justifyContent="center"
      backgroundColor="$background"
      gap="$4"
    >
      <Heading i18nKey="auth.create_account" level="h1" textAlign="center" />

      <YStack gap="$3">
        <Input
          testID="email-input"
          placeholderKey="auth.email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          size="lg"
        />

        <Input
          testID="password-input"
          placeholderKey="auth.password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          size="lg"
        />

        <Input
          testID="confirm-password-input"
          placeholderKey="auth.confirm_password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          size="lg"
        />
      </YStack>

      <Button
        testID="signup-button"
        onPress={() => {
          void handleSignup();
        }}
        disabled={loading || !isFormValid}
        size="lg"
        labelKey={loading ? 'common.loading' : 'auth.create_account'}
      />

      <XStack justifyContent="center" gap="$2">
        <Text i18nKey="auth.already_have_account" />
        <Text
          i18nKey="auth.sign_in"
          color="primary"
          onPress={() => router.back()}
          style={{ textDecorationLine: 'underline' }}
        />
      </XStack>
    </YStack>
  );
}
