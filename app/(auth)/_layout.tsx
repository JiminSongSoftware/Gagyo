/**
 * Auth group layout.
 *
 * Configures navigation for authentication-related screens:
 * - Login
 * - Signup
 * - Tenant Selection
 *
 * All auth screens have no header (full-screen experience).
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'card' }}>
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="signup" options={{ gestureEnabled: true }} />
      <Stack.Screen name="tenant-selection" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
