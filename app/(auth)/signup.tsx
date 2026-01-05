/**
 * Signup Screen
 *
 * Email/password signup form implemented with React Native components.
 * Includes basic validation and i18n strings.
 */

import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signUp, getAuthErrorMessage } from '@/lib/auth';

export default function SignupScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
    const errorKey = validateForm();
    if (errorKey) {
      Alert.alert(t(errorKey));
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password);
      // Navigation handled elsewhere once auth state updates
    } catch (error: unknown) {
      const translated = getAuthErrorMessage(error);
      Alert.alert(t(translated, { defaultValue: 'Signup failed' }));
    } finally {
      setLoading(false);
    }
  }

  const isFormValid = validateEmail(email) && password.length >= 8 && confirmPassword.length >= 8;

  return (
    <View style={styles.container} testID="signup-screen">
      <Text style={styles.heading}>{t('create_account', { defaultValue: 'Create Account' })}</Text>

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
          textContentType="newPassword"
          autoComplete="password-new"
        />

        <TextInput
          testID="confirm-password-input"
          style={styles.input}
          placeholder={t('confirm_password', { defaultValue: 'Confirm Password' })}
          placeholderTextColor="#7a7a7a"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
        />
      </View>

      <TouchableOpacity
        testID="signup-button"
        style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
        onPress={() => {
          void handleSignup();
        }}
        disabled={!isFormValid || loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? t('common:loading', { defaultValue: 'Loading...' })
            : t('create_account', { defaultValue: 'Create Account' })}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text>{t('already_have_account', { defaultValue: 'Already have an account?' })}</Text>
        <Text style={styles.link} onPress={() => router.back()}>
          {t('sign_in', { defaultValue: 'Sign In' })}
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
