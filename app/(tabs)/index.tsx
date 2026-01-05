import { Container, Heading, Column, Text, Button } from '@/components/ui';
import { DashboardWidget } from '@/components/home';
import { useTranslation } from '@/i18n';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, tenantId } = useRequireAuth();
  const { activeTenantName } = useTenantContext();
  const router = useRouter();

  return (
    <Container testID="home-screen" flex={1}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Column gap="$4" width="100%">
          {/* Welcome Header */}
          <Heading
            level="h1"
            i18nKey="common.home_screen.welcome"
            i18nParams={{ churchName: activeTenantName || '' }}
          />

          {/* Dashboard Title */}
          <Heading
            level="h2"
            i18nKey="common.home_screen.dashboard_title"
            testID="dashboard-title"
          />

          {/* Recent Conversations Widget */}
          <DashboardWidget
            testID="recent-conversations-widget"
            titleKey="common.home_screen.recent_conversations"
            isEmpty={true}
            onViewAll={() => router.push('/(tabs)/chat')}
          />

          {/* Prayer Cards Summary Widget */}
          <DashboardWidget
            testID="prayer-summary-widget"
            titleKey="common.home_screen.prayer_summary"
            isEmpty={true}
            onViewAll={() => router.push('/(tabs)/prayer')}
          />

          {/* Pastoral Journal Status Widget */}
          <DashboardWidget
            testID="pastoral-status-widget"
            titleKey="common.home_screen.pastoral_status"
            isEmpty={true}
            onViewAll={() => router.push('/(tabs)/pastoral')}
          />

          {/* Quick Actions Section */}
          <Heading level="h3" i18nKey="common.home_screen.quick_actions" testID="quick-actions-section" />
          <Column gap="$2">
            <Button
              testID="start-conversation-button"
              labelKey="common.home_screen.start_conversation"
              variant="outline"
              onPress={() => router.push('/(tabs)/chat')}
            />
            <Button
              testID="create-prayer-button"
              labelKey="common.home_screen.create_prayer"
              variant="outline"
              onPress={() => router.push('/(tabs)/prayer')}
            />
            <Button
              testID="write-journal-button"
              labelKey="common.home_screen.write_journal"
              variant="outline"
              onPress={() => router.push('/(tabs)/pastoral')}
            />
          </Column>
        </Column>
      </ScrollView>
    </Container>
  );
}
