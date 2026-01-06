import type { ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../index';

// Mock hooks
jest.mock('@/hooks/useAuthGuard', () => ({
  useRequireAuth: jest.fn(() => ({
    user: { id: 'user-1' },
    tenantId: 'tenant-1',
    membership: null,
    membershipId: null,
    membershipLoading: false,
    membershipError: null,
  })),
}));

jest.mock('@/hooks/useTenantContext', () => ({
  useTenantContext: jest.fn(() => ({
    activeTenantName: 'Test Church',
    activeTenantId: 'tenant-1',
    hasTenant: true,
    loading: false,
  })),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock UI components
jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Container: ({ children, testID }: { children?: ReactNode; testID?: string }) => (
      <View testID={testID}>{children}</View>
    ),
    Heading: ({ i18nKey, testID }: { i18nKey?: string; testID?: string }) => (
      <Text testID={testID || i18nKey}>{i18nKey}</Text>
    ),
    Column: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Button: ({
      labelKey,
      onPress,
      testID,
    }: {
      labelKey?: string;
      onPress?: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity onPress={onPress} testID={testID}>
        <Text>{labelKey}</Text>
      </TouchableOpacity>
    ),
  };
});

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: (key: string) => key,
  })),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard title', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('dashboard-title')).toBeTruthy();
  });

  it('should display welcome message with tenant name', () => {
    const { getByText } = render(<HomeScreen />);
    // Welcome message contains the tenant name
    const welcomeElement = getByText(/Test Church/);
    expect(welcomeElement).toBeTruthy();
  });

  it('should render dashboard widgets', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('recent-conversations-widget')).toBeTruthy();
    expect(getByTestId('prayer-summary-widget')).toBeTruthy();
    expect(getByTestId('pastoral-status-widget')).toBeTruthy();
  });

  it('should render quick actions section', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('quick-actions-section')).toBeTruthy();
  });

  it('should render quick action buttons', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('start-conversation-button')).toBeTruthy();
    expect(getByTestId('create-prayer-button')).toBeTruthy();
    expect(getByTestId('write-journal-button')).toBeTruthy();
  });

  it('should use tenant context for welcome message', () => {
    const { getByText } = render(<HomeScreen />);
    // The tenant name from useTenantContext should be in the welcome message
    expect(getByText(/Test Church/)).toBeTruthy();
  });
});
