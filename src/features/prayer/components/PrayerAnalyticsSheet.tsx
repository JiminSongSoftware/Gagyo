/**
 * Prayer Analytics Bottom Sheet Component
 *
 * Slide-up sheet for displaying prayer statistics.
 * Features:
 * - Three tabs: My Statistics, Small Group Statistics, Church-wide Statistics
 * - Period selector: Weekly, Monthly, Quarterly, Semi-annual, Annual
 * - Display total prayers, answered prayers, answer rate
 * - Simple bar charts for visualization
 * - i18n support
 */

import { useState, useEffect } from 'react';
import { Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, Text as TamaguiText, XStack, YStack, useTheme, styled } from 'tamagui';
import { useTranslation } from '@/i18n';
import { usePrayerAnalytics, AnalyticsScope, AnalyticsPeriod } from '../hooks/usePrayerAnalytics';

// ============================================================================
// TYPES
// ============================================================================

export interface PrayerAnalyticsSheetProps {
  /**
   * The tenant ID for analytics.
   */
  tenantId: string;

  /**
   * The current user's membership ID.
   */
  membershipId: string;

  /**
   * The current user's small group ID (optional).
   */
  smallGroupId: string | null;

  /**
   * Callback when sheet is closed.
   */
  onClose: () => void;

  /**
   * Whether the sheet is visible.
   */
  visible: boolean;
}

// ============================================================================
// STYLIZED COMPONENTS
// ============================================================================

const SheetOverlay = styled(Pressable, {
  name: 'SheetOverlay',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
});

const SheetContent = styled(Stack, {
  name: 'SheetContent',
  backgroundColor: '$background',
  borderTopLeftRadius: '$6',
  borderTopRightRadius: '$6',
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  maxHeight: '85%',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 8,
});

const HandleBar = styled(Stack, {
  name: 'HandleBar',
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: '$borderLight',
  alignSelf: 'center',
  marginBottom: '$4',
});

const StatCard = styled(Stack, {
  name: 'StatCard',
  flex: 1,
  backgroundColor: '$backgroundTertiary',
  borderRadius: '$3',
  padding: '$4',
  alignItems: 'center',
});

const PeriodButton = styled(Pressable, {
  name: 'PeriodButton',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$2',
  backgroundColor: '$transparent',
  borderWidth: 1,
  borderColor: '$borderLight',
});

const SimpleBarChart = styled(Stack, {
  name: 'SimpleBarChart',
  width: '100%',
  height: 120,
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-around',
  gap: '$2',
});

const Bar = styled(Stack, {
  name: 'Bar',
  flex: 1,
  borderRadius: '$1',
  position: 'relative',
  minHeight: 4,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PrayerAnalyticsSheet({
  tenantId,
  membershipId,
  smallGroupId,
  onClose,
  visible,
}: PrayerAnalyticsSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<AnalyticsScope>('individual');
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly');

  // Fetch analytics based on active tab
  const scopeId =
    activeTab === 'individual' ? membershipId : activeTab === 'small_group' ? smallGroupId : null;

  const { analytics, loading, error } = usePrayerAnalytics(tenantId, activeTab, scopeId, period);

  // Refresh when tab or period changes
  useEffect(() => {
    // The usePrayerAnalytics hook will auto-refresh on dependency changes
  }, [activeTab, period]);

  const periods: AnalyticsPeriod[] = ['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'];

  if (!visible) return null;

  return (
    <SheetOverlay onPress={onClose} testID="analytics-sheet-overlay">
      <Pressable style={{ flex: 1 }} />
      <SheetContent testID="analytics-sheet-content">
        {/* Handle Bar */}
        <HandleBar />

        {/* Header */}
        <YStack padding="$4" borderBottomWidth={1} borderBottomColor="$borderLight">
          <XStack alignItems="center" justifyContent="space-between" marginBottom="$4">
            <TamaguiText fontSize="$lg" fontWeight="bold" color="$color" testID="analytics-title">
              {t('prayer.analytics_title')}
            </TamaguiText>
            <Pressable
              testID="close-analytics-button"
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <TamaguiText fontSize="$2xl" color="$color3" paddingHorizontal="$2">
                ×
              </TamaguiText>
            </Pressable>
          </XStack>

          {/* Tabs */}
          <XStack gap="$2" marginBottom="$4">
            <TabButton
              active={activeTab === 'individual'}
              onPress={() => setActiveTab('individual')}
              label={t('prayer.my_statistics')}
              testID="tab-my-stats"
            />
            <TabButton
              active={activeTab === 'small_group'}
              onPress={() => setActiveTab('small_group')}
              label={t('prayer.small_group_statistics')}
              testID="tab-group-stats"
              disabled={!smallGroupId}
            />
            <TabButton
              active={activeTab === 'church_wide'}
              onPress={() => setActiveTab('church_wide')}
              label={t('prayer.church_wide_statistics')}
              testID="tab-church-stats"
            />
          </XStack>

          {/* Period Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {periods.map((p) => (
              <PeriodButton
                key={p}
                testID={`period-${p}`}
                onPress={() => setPeriod(p)}
                style={{
                  backgroundColor: period === p ? theme.primaryLight?.val : 'transparent',
                  borderColor: period === p ? theme.primary?.val : theme.borderLight?.val,
                }}
              >
                <TamaguiText fontSize="$xs" color={period === p ? '$primary' : '$color3'}>
                  {t(`prayer.${p}`)}
                </TamaguiText>
              </PeriodButton>
            ))}
          </ScrollView>
        </YStack>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {loading ? (
            <YStack padding="$4" alignItems="center" testID="analytics-loading">
              <ActivityIndicator size="small" color={theme.primary?.val} />
              <TamaguiText fontSize="$sm" color="$color3" marginTop="$2">
                {t('common.loading')}
              </TamaguiText>
            </YStack>
          ) : error ? (
            <YStack padding="$4" alignItems="center" testID="analytics-error">
              <TamaguiText fontSize="$sm" color="$danger">
                {error.message}
              </TamaguiText>
            </YStack>
          ) : analytics ? (
            <YStack gap="$4">
              {/* Stat Cards */}
              <XStack gap="$3">
                <StatCard testID="stat-total">
                  <TamaguiText fontSize="$xs" color="$color3" marginBottom="$2">
                    {t('prayer.total_prayers')}
                  </TamaguiText>
                  <TamaguiText fontSize="$4xl" fontWeight="bold" color="$primary">
                    {analytics.totalPrayers}
                  </TamaguiText>
                </StatCard>

                <StatCard testID="stat-answered">
                  <TamaguiText fontSize="$xs" color="$color3" marginBottom="$2">
                    {t('prayer.answered_prayers')}
                  </TamaguiText>
                  <TamaguiText fontSize="$4xl" fontWeight="bold" color="$accent">
                    {analytics.answeredPrayers}
                  </TamaguiText>
                </StatCard>
              </XStack>

              <StatCard testID="stat-rate">
                <TamaguiText fontSize="$xs" color="$color3" marginBottom="$2">
                  {t('prayer.answered_rate')}
                </TamaguiText>
                <TamaguiText fontSize="$5xl" fontWeight="bold" color="$success">
                  {analytics.answerRate}%
                </TamaguiText>
              </StatCard>

              {/* Simple Bar Chart Visualization */}
              <YStack gap="$2" marginTop="$2">
                <TamaguiText fontSize="$sm" fontWeight="bold" color="$color">
                  {t('prayer.answered_rate')}
                </TamaguiText>
                <SimpleBarChart>
                  {/* Total bar */}
                  <YStack flex={1} alignItems="center" gap="$1">
                    <Bar
                      style={{
                        height: '100%',
                        backgroundColor: '$backgroundTertiary',
                      }}
                    />
                    <TamaguiText fontSize="$xs" color="$color3">
                      {t('prayer.total')}
                    </TamaguiText>
                  </YStack>

                  {/* Answered bar */}
                  <YStack flex={1} alignItems="center" gap="$1">
                    <Bar
                      testID="bar-answered"
                      style={{
                        height: `${Math.max(analytics.answerRate, 10)}%`,
                        backgroundColor: '$success',
                      }}
                    />
                    <TamaguiText fontSize="$xs" color="$color3">
                      {t('prayer.answered')}
                    </TamaguiText>
                  </YStack>

                  {/* Unanswered bar */}
                  <YStack flex={1} alignItems="center" gap="$1">
                    <Bar
                      testID="bar-unanswered"
                      style={{
                        height: `${Math.max(100 - analytics.answerRate, 10)}%`,
                        backgroundColor: '$warning',
                      }}
                    />
                    <TamaguiText fontSize="$xs" color="$color3">
                      {t('prayer.unanswered')}
                    </TamaguiText>
                  </YStack>
                </SimpleBarChart>
              </YStack>

              {/* Empty state message */}
              {analytics.totalPrayers === 0 && (
                <YStack
                  padding="$4"
                  alignItems="center"
                  backgroundColor="$backgroundTertiary"
                  borderRadius="$3"
                  testID="analytics-empty"
                >
                  <TamaguiText fontSize="$sm" color="$color3" textAlign="center">
                    {t('prayer.no_prayers')}
                  </TamaguiText>
                  <TamaguiText fontSize="$xs" color="$color3" textAlign="center" marginTop="$2">
                    {t('prayer.start_praying')}
                  </TamaguiText>
                </YStack>
              )}
            </YStack>
          ) : null}
        </ScrollView>
      </SheetContent>
    </SheetOverlay>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface TabButtonProps {
  active: boolean;
  onPress: () => void;
  label: string;
  testID?: string;
  disabled?: boolean;
}

function TabButton({ active, onPress, label, testID, disabled }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: pressed || disabled ? 0.5 : 1,
        flex: 1,
      })}
    >
      <Stack
        paddingVertical="$2"
        borderBottomWidth={2}
        borderBottomColor={active ? theme.primary?.val : 'transparent'}
        alignItems="center"
      >
        <TamaguiText
          fontSize="$xs"
          color={active ? '$primary' : '$color3'}
          fontWeight={active ? 'bold' : 'normal'}
          numberOfLines={1}
        >
          {label}
        </TamaguiText>
      </Stack>
    </Pressable>
  );
}
