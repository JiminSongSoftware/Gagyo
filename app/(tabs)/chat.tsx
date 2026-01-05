import { Container, Heading } from '@/components/ui';
import { useRequireAuth } from '@/hooks/useAuthGuard';

export default function ChatScreen() {
  const { user, tenantId } = useRequireAuth();

  return (
    <Container testID="chat-screen" centered padded flex={1}>
      <Heading level="h1" i18nKey="common.nav.chat" />
    </Container>
  );
}
