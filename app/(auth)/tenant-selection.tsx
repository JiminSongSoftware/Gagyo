/**
 * Tenant Selection Screen
 *
 * Displays the list of churches (tenants) where the user has
 * an active membership. Users select their church to proceed
 * to the main app.
 *
 * Test IDs are provided for E2E testing with Detox.
 */

import type { FC } from 'react';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { YStack, Button, Text, Heading, Spinner, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useMemberships } from '@/hooks/useMemberships';
import { useTenantContext } from '@/hooks/useTenantContext';
import { signOut } from '@/lib/auth';
import type { Membership } from '@/types/database';

/**
 * Loading state component while fetching memberships.
 */
function LoadingState() {
  const { t } = useTranslation('common');

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
      <Spinner size="large" />
      <Text testID="tenant-loading-spinner">{t('loading', { defaultValue: 'Loading...' })}</Text>
    </YStack>
  );
}

/**
 * Empty state when user has no active memberships.
 */
function EmptyState() {
  const { t } = useTranslation('auth');

  return (
    <YStack
      flex={1}
      padding="$4"
      justifyContent="center"
      alignItems="center"
      gap="$4"
    >
      <Text testID="no-tenants-message" fontSize="$6" textAlign="center">
        {t('no_churches_found', {
          defaultValue: 'No churches found. Please contact your church administrator.',
        })}
      </Text>
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
  const { t } = useTranslation('auth');
  const tenantName = membership.tenant?.name ?? 'Unknown Church';
  const tenantId = membership.tenant_id;
  const role = membership.role;

  // Get display name for role using i18n keys
  const getRoleDisplay = (r: string) => {
    switch (r) {
      case 'admin':
        return t('roles.admin', { defaultValue: 'Admin' });
      case 'pastor':
        return t('roles.pastor', { defaultValue: 'Pastor' });
      case 'zone_leader':
        return t('roles.zone_leader', { defaultValue: 'Zone Leader' });
      case 'small_group_leader':
        return t('roles.small_group_leader', { defaultValue: 'Small Group Leader' });
      default:
        return t('roles.member', { defaultValue: 'Member' });
    }
  };

  return (
    <Button
      testID={`tenant-button-${tenantId}`}
      size="$5"
      onPress={() => onPress(tenantId, tenantName)}
      backgroundColor="$backgroundStrong"
      pressTheme={{ active: { background: '$backgroundPress' } }}
      borderRadius="$4"
      padding="$4"
    >
      <YStack gap="$2">
        <Text fontSize="$7" fontWeight="bold">
          {tenantName}
        </Text>
        <Text fontSize="$4" opacity={0.7}>
          {getRoleDisplay(role)}
        </Text>
      </YStack>
    </Button>
  );
}

/**
 * Main tenant selection screen component.
 */
export default function TenantSelectionScreen() {
  const { t } = useTranslation('auth');
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
        <Heading size="$8" textAlign="center">
          {t('select_church', { defaultValue: 'Select Your Church' })}
        </Heading>
        <Text textAlign="center" opacity={0.7}>
          {t('select_church_description', {
            defaultValue: 'Choose the church you want to access',
          })}
        </Text>
      </YStack>

      <YStack testID="tenant-list" gap="$3" maxHeight={400}>
        {memberships.map((membership) => (
          <TenantButton
            key={membership.id}
            membership={membership}
            onPress={handleSelectTenant}
          />
        ))}
      </YStack>

      <YStack gap="$2">
        <Text fontSize="$3" opacity={0.5} textAlign="center">
          {t('logout_prompt', { defaultValue: 'Not the right account?' })}
        </Text>
        <Button
          testID="logout-button"
          variant="outlined"
          size="$3"
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Text>{loggingOut ? t('signing_out', { defaultValue: 'Signing out...' }) : t('sign_out', { defaultValue: 'Sign Out' })}</Text>
        </Button>
      </YStack>
    </YStack>
  );
}
