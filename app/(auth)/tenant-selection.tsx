/**
 * Tenant Selection Screen
 *
 * Displays the list of churches (tenants) where the user has
 * an active membership. Users select their church to proceed
 * to the main app.
 *
 * Test IDs are provided for E2E testing with Detox.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button as TamaguiButton, Spinner, YStack } from 'tamagui';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useMemberships } from '@/hooks/useMemberships';
import { useTenantContext } from '@/hooks/useTenantContext';
import { signOut } from '@/lib/auth';
import type { Membership } from '@/types/database';

/**
 * Loading state component while fetching memberships.
 */
function LoadingState() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
      <Spinner size="large" />
      <Text testID="tenant-loading-spinner" i18nKey="common.loading" />
    </YStack>
  );
}

/**
 * Empty state when user has no active memberships.
 */
function EmptyState() {
  return (
    <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$4">
      <Text
        testID="no-tenants-message"
        i18nKey="auth.no_churches_found"
        size="lg"
        textAlign="center"
      />
    </YStack>
  );
}

/**
 * Individual tenant button component.
 */
interface TenantButtonProps {
  membership: Membership;
  onPress: (tenantId: string, tenantName: string) => void;
}

function TenantButton({ membership, onPress }: TenantButtonProps) {
  const { t } = useTranslation();
  const tenantName =
    membership.tenant?.name ?? t('auth.unknown_church', { defaultValue: 'Unknown Church' });
  const tenantId = membership.tenant_id;
  const role = membership.role;

  // Get display name for role using i18n keys
  const getRoleKey = (r: string) => {
    switch (r) {
      case 'admin':
        return 'auth.roles.admin';
      case 'pastor':
        return 'auth.roles.pastor';
      case 'zone_leader':
        return 'auth.roles.zone_leader';
      case 'small_group_leader':
        return 'auth.roles.small_group_leader';
      default:
        return 'auth.roles.member';
    }
  };

  return (
    <TamaguiButton
      testID={`tenant-button-${tenantId}`}
      size="$5"
      onPress={() => onPress(tenantId, tenantName)}
      backgroundColor="$backgroundSecondary"
      pressStyle={{ backgroundColor: '$backgroundTertiary' }}
      borderRadius="$4"
      padding="$4"
    >
      <YStack gap="$2">
        <Text i18nKey="auth.tenant_name" i18nParams={{ tenantName }} size="lg" weight="bold" />
        <Text i18nKey={getRoleKey(role)} size="sm" opacity={0.7} />
      </YStack>
    </TamaguiButton>
  );
}

/**
 * Main tenant selection screen component.
 */
export default function TenantSelectionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { memberships, loading } = useMemberships(user?.id);
  const { setActiveTenant, clearTenantContext } = useTenantContext();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSelectTenant(tenantId: string, tenantName: string) {
    await setActiveTenant(tenantId, tenantName);
    router.replace('/(tabs)');
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      await clearTenantContext();
      // Navigation is handled by auth guard in _layout.tsx
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
    }
  }

  // Show loading while fetching memberships
  if (loading) {
    return <LoadingState />;
  }

  // Show empty state if no memberships
  if (memberships.length === 0) {
    return <EmptyState />;
  }

  // Show tenant list
  return (
    <YStack
      testID="tenant-selection-screen"
      flex={1}
      padding="$4"
      justifyContent="center"
      backgroundColor="$background"
      gap="$6"
    >
      <YStack gap="$2">
        <Heading i18nKey="auth.select_church" level="h1" textAlign="center" />
        <Text i18nKey="auth.select_church_description" textAlign="center" opacity={0.7} />
      </YStack>

      <YStack testID="tenant-list" gap="$3" maxHeight={400}>
        {memberships.map((membership) => (
          <TenantButton
            key={membership.id}
            membership={membership}
            onPress={(tenantId, tenantName) => {
              void handleSelectTenant(tenantId, tenantName);
            }}
          />
        ))}
      </YStack>

      <YStack gap="$2">
        <Text i18nKey="auth.logout_prompt" size="sm" opacity={0.5} textAlign="center" />
        <Button
          testID="logout-button"
          variant="outline"
          size="sm"
          onPress={() => {
            void handleLogout();
          }}
          disabled={loggingOut}
          labelKey={loggingOut ? 'auth.signing_out' : 'auth.sign_out'}
        />
      </YStack>
    </YStack>
  );
}
