/**
 * Tenant Selection Screen
 *
 * Displays the list of churches (tenants) a user belongs to and allows
 * them to select which tenant context to enter.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useMemberships } from '@/hooks/useMemberships';
import { useTenantContext } from '@/hooks/useTenantContext';
import { signOut } from '@/lib/auth';
import type { Membership } from '@/types/database';

function LoadingState() {
  const { t } = useTranslation('common');
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
      <Text testID="tenant-loading-spinner" style={styles.loadingText}>
        {t('loading', { defaultValue: 'Loading...' })}
      </Text>
    </View>
  );
}

function EmptyState() {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.emptyContainer}>
      <Text testID="no-tenants-message" style={styles.emptyText}>
        {t('no_churches_found', {
          defaultValue: 'No churches found. Please contact your church administrator.',
        })}
      </Text>
    </View>
  );
}

interface TenantButtonProps {
  membership: Membership;
  onPress: (tenantId: string, tenantName: string) => void;
}

function TenantButton({ membership, onPress }: TenantButtonProps) {
  const { t } = useTranslation('auth');

  const tenantName = membership.tenant?.name ?? 'Unknown Church';
  const role = membership.role;

  const roleDisplay = (() => {
    switch (role) {
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
  })();

  return (
    <TouchableOpacity
      testID={`tenant-button-${membership.tenant_id}`}
      style={styles.tenantButton}
      onPress={() => onPress(membership.tenant_id, tenantName)}
      activeOpacity={0.85}
    >
      <Text style={styles.tenantName}>{tenantName}</Text>
      <Text style={styles.tenantRole}>{roleDisplay}</Text>
    </TouchableOpacity>
  );
}

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
    } catch (error) {
      console.error('[TenantSelection] Logout failed', error);
      setLoggingOut(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (memberships.length === 0) {
    return <EmptyState />;
  }

  return (
    <View style={styles.container} testID="tenant-selection-screen">
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('select_church', { defaultValue: 'Select Your Church' })}
        </Text>
        <Text style={styles.description}>
          {t('select_church_description', {
            defaultValue: 'Choose the church you want to access',
          })}
        </Text>
      </View>

      <FlatList
        data={memberships}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <TenantButton
            membership={item}
            onPress={(tenantId, tenantName) => {
              void handleSelectTenant(tenantId, tenantName);
            }}
          />
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.footerPrompt}>
          {t('logout_prompt', { defaultValue: 'Not the right account?' })}
        </Text>
        <TouchableOpacity
          testID="logout-button"
          style={[styles.logoutButton, loggingOut && styles.buttonDisabled]}
          onPress={() => {
            void handleLogout();
          }}
          disabled={loggingOut}
        >
          <Text style={styles.logoutText}>
            {loggingOut
              ? t('signing_out', { defaultValue: 'Signing out...' })
              : t('sign_out', { defaultValue: 'Sign Out' })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
    backgroundColor: '#fff',
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111',
  },
  description: {
    textAlign: 'center',
    color: '#555',
  },
  listContent: {
    paddingBottom: 24,
  },
  tenantButton: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f6f6f6',
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  tenantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  tenantRole: {
    marginTop: 4,
    color: '#777',
    fontSize: 14,
  },
  footer: {
    gap: 8,
    alignItems: 'center',
  },
  footerPrompt: {
    color: '#777',
    fontSize: 14,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9c9c9',
    backgroundColor: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: '#111',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#555',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#444',
  },
});
