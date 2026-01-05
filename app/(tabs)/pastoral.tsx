import { Container, Heading } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';

export default function PastoralScreen() {
  const { user, tenantId } = useRequireAuth();

  return (
    <Container testID="pastoral-screen" centered padded flex={1}>
      <Heading level="h1" i18nKey="common.nav.pastoral" />
    </Container>
  );
}
