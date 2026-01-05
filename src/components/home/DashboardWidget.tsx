import { Card, Heading, Text, Button } from '@/components/ui';
import type { CardProps } from '@/components/ui/Card';

export interface DashboardWidgetProps extends Omit<CardProps, 'children'> {
  /**
   * i18n key for the widget title.
   */
  titleKey: string;

  /**
   * Whether to show empty state instead of children.
   */
  isEmpty?: boolean;

  /**
   * i18n key for the empty state message.
   * Defaults to 'common.home_screen.no_recent_activity'.
   */
  emptyStateKey?: string;

  /**
   * Callback when "View All" button is pressed.
   * Button is only shown when not empty and this is provided.
   */
  onViewAll?: () => void;

  /**
   * Widget content (ignored when isEmpty is true).
   */
  children?: React.ReactNode;
}

const DEFAULT_EMPTY_STATE_KEY = 'common.home_screen.no_recent_activity';

/**
 * DashboardWidget component for displaying summary cards on the home screen.
 *
 * @example
 * ```tsx
 * // Empty state widget
 * <DashboardWidget
 *   titleKey="common.home_screen.recent_conversations"
 *   isEmpty={true}
 *   onViewAll={() => router.push('/chat')}
 * />
 *
 * // Widget with content
 * <DashboardWidget
 *   titleKey="common.home_screen.prayer_summary"
 *   isEmpty={false}
 *   onViewAll={() => router.push('/prayer')}
 * >
 *   <PrayerList />
 * </DashboardWidget>
 * ```
 */
export function DashboardWidget({
  titleKey,
  isEmpty = false,
  emptyStateKey = DEFAULT_EMPTY_STATE_KEY,
  onViewAll,
  children,
  ...cardProps
}: DashboardWidgetProps) {
  return (
    <Card variant="elevated" padding="md" {...cardProps}>
      <Card.Header>
        <Heading level="h3" i18nKey={titleKey} />
      </Card.Header>
      <Card.Body>
        {isEmpty ? (
          <Text i18nKey={emptyStateKey} color="muted" />
        ) : (
          children
        )}
      </Card.Body>
      {onViewAll && !isEmpty && (
        <Card.Footer>
          <Button
            labelKey="common.home_screen.view_all"
            variant="ghost"
            size="sm"
            onPress={onViewAll}
          />
        </Card.Footer>
      )}
    </Card>
  );
}
