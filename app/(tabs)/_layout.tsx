import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import koTranslations from '@/i18n/locales/ko/common.json';
import enTranslations from '@/i18n/locales/en/common.json';

/**
 * Get translation by key (defaults to Korean).
 */
function t(key: string, locale: 'ko' | 'en' = 'ko'): string {
  const translations = locale === 'ko' ? koTranslations : enTranslations;
  const keys = key.split('.');
  let value: unknown = translations;
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return (value as string) || key;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { loading } = useAuthGuard();

  if (loading) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.nav.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('common.nav.chat'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: t('common.nav.prayer'),
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pastoral"
        options={{
          title: t('common.nav.pastoral'),
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="images"
        options={{
          title: t('common.nav.images'),
          tabBarIcon: ({ color, size }) => <Ionicons name="images" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('common.nav.settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
