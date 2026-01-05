import { Container, Heading } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';

export default function ImagesScreen() {
  const { user, tenantId } = useRequireAuth();

  return (
    <Container testID="images-screen" centered padded flex={1}>
      <Heading level="h1" i18nKey="common.nav.images" />
    </Container>
  );
}
