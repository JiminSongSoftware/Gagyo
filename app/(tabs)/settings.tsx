import { Container, Heading, YStack, Button } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { user, tenantId } = useRequireAuth();
  const { signOut } = useAuth();
  const { clearTenantContext } = useTenantContext();
  const router = useRouter();

  const handleLogout = async () => {
    await clearTenantContext();
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <Container testID="settings-screen" padded flex={1}>
      <YStack gap="$4" width="100%">
        <Heading level="h1" i18nKey="common.nav.settings" />
        <Button
          testID="logout-button"
          labelKey="common.logout"
          variant="outline"
          onPress={handleLogout}
        />
      </YStack>
    </Container>
  );
}
