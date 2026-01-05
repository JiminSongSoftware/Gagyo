/**
 * Prayer Card Detail Screen
 *
 * Deep link target for prayer_answered notifications.
 * Route: /prayer/[prayerCardId]
 *
 * @see claude_docs/06_push_notifications.md
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useEffect } from 'react';

export default function PrayerCardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!id) {
      router.replace('/(tabs)');
    }
  }, [id, router]);

  // TODO: Implement prayer card detail view
  // This is a placeholder for the actual prayer card screen

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Text content to be implemented */}
    </View>
  );
}
