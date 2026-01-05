import type { Meta, StoryObj } from '@storybook/react';
import { Text } from '@/components/ui';
import { DashboardWidget } from './DashboardWidget';

const meta: Meta<typeof DashboardWidget> = {
  title: 'Home/DashboardWidget',
  component: DashboardWidget,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DashboardWidget>;

export const Default: Story = {
  args: {
    titleKey: 'common.home_screen.recent_conversations',
    children: <Text>Recent conversations would appear here...</Text>,
    onViewAll: () => console.log('View all clicked'),
  },
};

export const EmptyState: Story = {
  args: {
    titleKey: 'common.home_screen.recent_conversations',
    isEmpty: true,
  },
};

export const WithCustomEmptyMessage: Story = {
  args: {
    titleKey: 'common.home_screen.prayer_summary',
    isEmpty: true,
    emptyStateKey: 'common.empty_state',
  },
};

export const WithoutViewAll: Story = {
  args: {
    titleKey: 'common.home_screen.pastoral_status',
    children: <Text>Journal status would appear here...</Text>,
  },
};

export const PastoralJournal: Story = {
  args: {
    titleKey: 'common.home_screen.pastoral_status',
    isEmpty: true,
    onViewAll: () => console.log('View pastoral journals'),
  },
};
