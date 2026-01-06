/**
 * Pastoral Tab Screen
 *
 * Main screen for pastoral journals with role-based display.
 *
 * Features:
 * - Role-based filtering (leaders see their group's, zone leaders see zone, pastors see all)
 * - Filter tabs (my journals, submitted journals, all journals)
 * - Pull-to-refresh
 * - FAB for creating new journals (leaders only)
 * - Navigation to journal details
 * - i18n support
 *
 * Route: /pastoral
 *
 * @see claude_docs/20_pastoral_journal.md
 */

import { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, styled } from 'tamagui';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import {
  PastoralJournalList,
  type PastoralJournalsFilter,
} from '@/features/pastoral/components/PastoralJournalList';
import type { PastoralJournalWithRelations } from '@/types/database';

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const FAB = styled(Pressable, {
  name: 'FAB',
  position: 'absolute',
  bottom: 24,
  right: 24,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '$primary',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PastoralScreen() {
  const { tenantId, membershipId, membership } = useRequireAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<PastoralJournalsFilter>({ scope: 'my_journals' });

  // Only leaders and co-leaders can create journals
  const canCreate = membership?.role === 'small_group_leader' || membership?.role === 'co_leader';

  const handleJournalPress = useCallback(
    (journal: PastoralJournalWithRelations) => {
      router.push(`/pastoral/${journal.id}`);
    },
    [router]
  );

  const handleCreatePress = useCallback(() => {
    router.push('/pastoral/create');
  }, [router]);

  const handleFilterChange = useCallback((newFilter: PastoralJournalsFilter) => {
    setFilter(newFilter);
  }, []);

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Journal List */}
      <PastoralJournalList
        tenantId={tenantId}
        membershipId={membershipId}
        membership={membership}
        onJournalPress={handleJournalPress}
        onCreatePress={handleCreatePress}
        filter={filter}
        onFilterChange={handleFilterChange}
      />

      {/* Create FAB - only for leaders and co-leaders */}
      {canCreate && (
        <FAB
          testID="create-journal-fab"
          onPress={handleCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Create Journal"
        >
          <Text fontSize="$8" color="white" fontWeight="bold">
            +
          </Text>
        </FAB>
      )}
    </YStack>
  );
}

// Import Text locally to avoid circular dependencies
const { Text } = require('tamagui');
