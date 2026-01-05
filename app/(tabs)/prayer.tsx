import { Container, Heading } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';

export default function PrayerScreen() {
  const { user, tenantId } = useRequireAuth();

  return (
    <Container testID="prayer-screen" centered padded flex={1}>
      <Heading level="h1" i18nKey="common.nav.prayer" />
    </Container>
  );
}
