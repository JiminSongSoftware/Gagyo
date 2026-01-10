import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Image } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useTranslation } from '@/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { loading } = useAuthGuard();
  const { t } = useTranslation();

  if (loading) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#C7C7CC',
        tabBarActiveBackgroundColor: 'transparent',
        tabBarStyle: {
          borderTopColor: '#e0e0e0',
          backgroundColor: '#ffffff',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('nav.chat'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: t('nav.prayer'),
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../../assets/hands.png')}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="images"
        options={{
          title: t('nav.images'),
          tabBarIcon: ({ color, size }) => <Ionicons name="images" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('nav.more'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
