/**
 * Pastoral Journal Detail Screen
 *
 * Deep link target for pastoral journal notifications.
 * Displays full journal details with comments and action buttons.
 *
 * Route: /pastoral/[journalId]
 *
 * @see claude_docs/20_pastoral_journal.md
 * @see claude_docs/06_push_notifications.md
 */

import { useCallback } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PastoralJournalDetail } from '@/features/pastoral/components/PastoralJournalDetail';
import { useRequireAuth } from '@/hooks/useAuthGuard';

export default function PastoralJournalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tenantId, membership } = useRequireAuth();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!id) {
    // If no ID provided, redirect to tabs
    router.replace('/(tabs)');
    return null;
  }

  return (
    <View testID="journal-detail-screen" style={{ flex: 1 }}>
      <PastoralJournalDetail
        journalId={id}
        tenantId={tenantId}
        membership={membership}
        onBack={handleBack}
      />
    </View>
  );
}
