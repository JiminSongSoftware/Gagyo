import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DashboardWidget } from '../DashboardWidget';

// Mock UI components
jest.mock('@/components/ui', () => ({
  Card: ({ children, testID }: any) => (
    <div testID={testID}>{children}</div>
  ),
  Heading: ({ i18nKey }: any) => <h3>{i18nKey}</h3>,
  Button: ({ labelKey, onPress }: any) => (
    <button data-labelkey={labelKey} onPress={onPress}>
      {labelKey}
    </button>
  ),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: (key: string) => key,
  })),
}));

describe('DashboardWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title with i18n key', () => {
    const { getByText } = render(
      <DashboardWidget titleKey="common.home_screen.recent_conversations" />
    );
    expect(getByText('common.home_screen.recent_conversations')).toBeTruthy();
  });

  it('should render children content when not empty', () => {
    const { getByText } = render(
      <DashboardWidget titleKey="common.home_screen.recent_conversations">
        <Text>Widget Content</Text>
      </DashboardWidget>
    );
    expect(getByText('Widget Content')).toBeTruthy();
  });

  it('should display empty state message when isEmpty is true', () => {
    const { getByText } = render(
      <DashboardWidget
        titleKey="common.home_screen.recent_conversations"
        isEmpty={true}
        emptyStateKey="common.home_screen.no_recent_activity"
      />
    );
    expect(getByText('common.home_screen.no_recent_activity')).toBeTruthy();
  });

  it('should not show View All button when empty', () => {
    const { queryByText } = render(
      <DashboardWidget
        titleKey="common.home_screen.recent_conversations"
        isEmpty={true}
        onViewAll={jest.fn()}
      />
    );
    expect(queryByText('common.home_screen.view_all')).toBeNull();
  });

  it('should show View All button when not empty and onViewAll provided', () => {
    const { getByText } = render(
      <DashboardWidget
        titleKey="common.home_screen.recent_conversations"
        isEmpty={false}
        onViewAll={jest.fn()}
      >
        <Text>Content</Text>
      </DashboardWidget>
    );
    expect(getByText('common.home_screen.view_all')).toBeTruthy();
  });

  it('should call onViewAll when View All button is pressed', () => {
    const onViewAll = jest.fn();
    const { getByText } = render(
      <DashboardWidget
        titleKey="common.home_screen.recent_conversations"
        isEmpty={false}
        onViewAll={onViewAll}
      >
        <Text>Content</Text>
      </DashboardWidget>
    );

    fireEvent.press(getByText('common.home_screen.view_all'));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('should pass testID to Card component', () => {
    const { getByTestId } = render(
      <DashboardWidget
        titleKey="common.home_screen.recent_conversations"
        testID="custom-widget-id"
      />
    );
    expect(getByTestId('custom-widget-id')).toBeTruthy();
  });

  it('should use default empty state key when not provided', () => {
    const { getByText } = render(
      <DashboardWidget
        titleKey="common.home_screen.recent_conversations"
        isEmpty={true}
      />
    );
    // Default should be common.home_screen.no_recent_activity
    expect(getByText('common.home_screen.no_recent_activity')).toBeTruthy();
  });
});
