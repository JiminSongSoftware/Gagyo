/**
 * Signup Screen
 *
 * Allows new users to create an account with email and password.
 * Includes validation for email format and password matching.
 *
 * Test IDs are provided for E2E testing with Detox.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { YStack, XStack, Button, Input, Text, Heading } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { signUp, getAuthErrorMessage } from '@/lib/auth';

export default function SignupScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function validateEmail(emailValue: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  }

  function validateForm(): string | null {
    if (!validateEmail(email)) {
      return 'invalid_email';
    }

    if (password.length < 8) {
      return 'password_too_short';
    }

    if (password !== confirmPassword) {
      return 'passwords_dont_match';
    }

    return null;
  }

  async function handleSignup() {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert(t(validationError));
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
      <Heading size="$8" textAlign="center">
        {t('create_account', { defaultValue: 'Create Account' })}
      </Heading>

      <YStack gap="$3">
        <Input
          testID="email-input"
          placeholder={t('email', { defaultValue: 'Email' })}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          size="$5"
        />

        <Input
          testID="password-input"
          placeholder={t('password', { defaultValue: 'Password' })}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          size="$5"
        />

        <Input
          testID="confirm-password-input"
          placeholder={t('confirm_password', { defaultValue: 'Confirm Password' })}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          size="$5"
        />
      </YStack>

      <Button
        testID="signup-button"
        onPress={handleSignup}
        disabled={loading || !isFormValid}
        size="$5"
        themeInverse
      >
        <InputText>
          {loading
            ? t('common:loading', { defaultValue: 'Loading...' })
            : t('create_account', { defaultValue: 'Create Account' })}
        </InputText>
      </Button>

      <XStack justifyContent="center" gap="$2">
        <Text>{t('already_have_account', { defaultValue: 'Already have an account?' })}</Text>
        <Text
          color="$blue10"
          onPress={() => router.back()}
          style={{ textDecorationLine: 'underline' }}
        >
          {t('sign_in', { defaultValue: 'Sign In' })}
        </Text>
      </XStack>
    </YStack>
  );
}

/**
 * Helper component for button text with proper theming.
 */
function InputText({ children }: { children: string }) {
  return <Text>{children}</Text>;
}
