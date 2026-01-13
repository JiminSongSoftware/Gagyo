/**
 * Login Screen
 *
 * Allows users to sign in with email and password.
 * All user-facing strings use i18n translations.
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
import { signIn, getAuthErrorMessage } from '@/lib/auth';
import { SafeScreen } from '@/components/SafeScreen';

export default function LoginScreen() {
  const { t } = useTranslation();
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('[login] error caught:', errorMessage);
      Alert.alert(
        t(errorKey, { defaultValue: 'Authentication failed' }),
        errorMessage !== 'Invalid login credentials' ? `Details: ${errorMessage}` : undefined
      );
    } finally {
      setLoading(false);
    }
  }

  const isFormValid = email.length > 0 && password.length > 0;

  return (
    <SafeScreen backgroundColor="$background">
      <YStack
        testID="login-screen"
        flex={1}
        padding="$4"
        justifyContent="center"
        gap="$4"
      >
      <Heading i18nKey="auth.welcome_back" level="h1" textAlign="center" />

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
          textContentType="password"
          autoComplete="password"
          size="lg"
        />
      </YStack>

      <Button
        testID="login-button"
        size="lg"
        onPress={() => {
          void handleLogin();
        }}
        disabled={!isFormValid || loading}
        labelKey={loading ? 'common.loading' : 'auth.sign_in'}
      />

      <XStack justifyContent="center" gap="$2">
        <Text i18nKey="auth.dont_have_account" />
        <Text
          testID="signup-link"
          i18nKey="auth.sign_up"
          style={{ cursor: 'pointer' }}
          onPress={() => router.push('/(auth)/signup')}
          color="primary"
        />
      </XStack>
    </YStack>
    </SafeScreen>
  );
}
