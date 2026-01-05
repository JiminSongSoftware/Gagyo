/**
 * Pastoral Journal Detail Screen
 *
 * Deep link target for pastoral journal notifications.
 * Route: /pastoral/[journalId]
 *
 * @see claude_docs/06_push_notifications.md
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useEffect } from 'react';

export default function PastoralJournalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!id) {
      router.replace('/(tabs)');
    }
  }, [id, router]);

  // TODO: Implement pastoral journal detail view
  // This is a placeholder for the actual pastoral journal screen

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Text content to be implemented */}
    </View>
  );
}
