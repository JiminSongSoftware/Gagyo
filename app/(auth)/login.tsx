/**
 * Login Screen
 *
 * Allows users to sign in with email and password.
 * All user-facing strings use i18n translations.
 *
 * Test IDs are provided for E2E testing with Detox.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { YStack, XStack, Button, Input, Text, Heading } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { signIn } from '@/lib/auth';
import { getAuthErrorMessage } from '@/lib/auth';

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    // Basic validation
    if (!email || !password) {
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      // Navigation is handled by auth guard in _layout.tsx
    } catch (error: unknown) {
      const errorKey = getAuthErrorMessage(error);
      Alert.alert(t(errorKey, { defaultValue: 'Authentication failed' }));
    } finally {
      setLoading(false);
    }
  }

  const isFormValid = email.length > 0 && password.length > 0;

  return (
    <YStack
      testID="login-screen"
      flex={1}
      padding="$4"
      justifyContent="center"
      backgroundColor="$background"
      gap="$4"
    >
      <Heading size="$8" textAlign="center">
        {t('welcome_back', { defaultValue: 'Welcome back!' })}
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
          textContentType="password"
          autoComplete="password"
          size="$5"
        />
      </YStack>

      <Button
        testID="login-button"
        onPress={handleLogin}
        disabled={loading || !isFormValid}
        size="$5"
        themeInverse
      >
        <InputText>
          {loading ? t('common:loading', { defaultValue: 'Loading...' }) : t('sign_in', { defaultValue: 'Sign In' })}
        </InputText>
      </Button>

      <XStack justifyContent="center" gap="$2">
        <Text>{t('dont_have_account', { defaultValue: "Don't have an account?" })}</Text>
        <Text
          testID="signup-link"
          color="$blue10"
          onPress={() => router.push('/(auth)/signup')}
          style={{ textDecorationLine: 'underline' }}
        >
          {t('sign_up', { defaultValue: 'Sign Up' })}
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
