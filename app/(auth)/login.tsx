/**
 * Login Screen
 *
 * Implements a simple email/password login form using React Native primitives.
 * All labels use i18n translations and testIDs are kept for Detox.
 */

import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signIn, getAuthErrorMessage } from '@/lib/auth';

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  async function handleLogin() {
    if (!isFormValid) {
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Navigation handled via auth guard in _layout.tsx
    } catch (error: unknown) {
      const errorKey = getAuthErrorMessage(error);
      Alert.alert(t(errorKey, { defaultValue: 'Authentication failed' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container} testID="login-screen">
      <Text style={styles.heading}>{t('welcome_back', { defaultValue: 'Welcome back!' })}</Text>

      <View style={styles.form}>
        <TextInput
          testID="email-input"
          style={styles.input}
          placeholder={t('email', { defaultValue: 'Email' })}
          placeholderTextColor="#7a7a7a"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />

        <TextInput
          testID="password-input"
          style={styles.input}
          placeholder={t('password', { defaultValue: 'Password' })}
          placeholderTextColor="#7a7a7a"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
        />
      </View>

      <TouchableOpacity
        testID="login-button"
        style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
        onPress={() => {
          void handleLogin();
        }}
        disabled={!isFormValid || loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? t('common:loading', { defaultValue: 'Loading...' })
            : t('sign_in', { defaultValue: 'Sign In' })}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text>{t('dont_have_account', { defaultValue: "Don't have an account?" })}</Text>
        <Text
          testID="signup-link"
          style={styles.link}
          onPress={() => router.push('/(auth)/signup')}
        >
          {t('sign_up', { defaultValue: 'Sign Up' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111',
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#2f6fed',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#b3c6ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  link: {
    color: '#2f6fed',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
