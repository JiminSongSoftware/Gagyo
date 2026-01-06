/**
 * Create Pastoral Journal Screen
 *
 * Form screen for creating new pastoral journals.
 * Only accessible to leaders and co-leaders (enforced by RLS).
 *
 * Route: /pastoral/create
 *
 * @see claude_docs/20_pastoral_journal.md
 */

import { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CreatePastoralJournalForm } from '@/features/pastoral/components/CreatePastoralJournalForm';
import { useRequireAuth } from '@/hooks/useAuthGuard';

export default function CreatePastoralJournalScreen() {
  const router = useRouter();
  const { tenantId, membershipId, membership } = useRequireAuth();

  const handleSuccess = useCallback(
    (journalId: string) => {
      // Navigate to the journal detail after creation
      router.replace(`/pastoral/${journalId}`);
    },
    [router]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View testID="create-journal-screen" style={{ flex: 1 }}>
      <CreatePastoralJournalForm
        tenantId={tenantId}
        smallGroupId={membership?.small_group_id || null}
        membershipId={membershipId}
        membership={membership}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </View>
  );
}
