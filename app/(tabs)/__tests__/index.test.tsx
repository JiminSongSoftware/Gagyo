import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import HomeScreen from '../index';

// Mock hooks
jest.mock('@/hooks/useAuthGuard', () => ({
  useRequireAuth: jest.fn(() => ({
    user: { id: 'user-1' },
    tenantId: 'tenant-1',
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
jest.mock('@/components/ui', () => ({
  Container: ({ children, testID }: any) => (
    <div testID={testID}>{children}</div>
  ),
  Heading: ({ i18nKey, level, testID }: any) => (
    <h1 data-testid={testID || i18nKey}>{i18nKey}</h1>
  ),
  Column: ({ children }: any) => <div>{children}</div>,
  Button: ({ labelKey, onPress }: any) => (
    <button onPress={onPress}>{labelKey}</button>
  ),
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: (key: string) => key,
  })),
}));

jest.mock('react-native', () => ({
  ScrollView: ({ children }: any) => <div>{children}</div>,
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
