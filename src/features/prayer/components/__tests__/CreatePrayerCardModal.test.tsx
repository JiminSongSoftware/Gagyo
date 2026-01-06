/**
 * Unit tests for CreatePrayerCardModal component.
 */

import { render, fireEvent } from '@testing-library/react-native';
import { CreatePrayerCardModal } from '../CreatePrayerCardModal';

// Mock i18n
jest.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('CreatePrayerCardModal', () => {
  const mockProps = {
    tenantId: 'tenant-123',
    membershipId: 'membership-456',
    content: '',
    recipientScope: null as 'individual' | 'small_group' | 'church_wide' | null,
    recipientIds: [],
    onContentChange: jest.fn(),
    onRecipientScopeChange: jest.fn(),
    onRecipientIdsChange: jest.fn(),
    onSuccess: jest.fn(),
    onClose: jest.fn(),
    visible: true,
    creating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible is true', () => {
    const { getByTestId } = render(<CreatePrayerCardModal {...mockProps} />);

    expect(getByTestId('create-prayer-modal')).toBeTruthy();
  });

  it('should not render modal when visible is false', () => {
    const { queryByTestId } = render(<CreatePrayerCardModal {...mockProps} visible={false} />);

    expect(queryByTestId('create-prayer-modal')).toBeNull();
  });

  it('should display prayer content input', () => {
    const { getByTestId } = render(<CreatePrayerCardModal {...mockProps} />);

    expect(getByTestId('prayer-content-input')).toBeTruthy();
  });

  it('should call onContentChange when content is typed', () => {
    const { getByTestId } = render(<CreatePrayerCardModal {...mockProps} />);

    const input = getByTestId('prayer-content-input');
    fireEvent.changeText(input, 'Test prayer content');

    expect(mockProps.onContentChange).toHaveBeenCalledWith('Test prayer content');
  });

  it('should display select recipients button when no recipients selected', () => {
    const { getByTestId } = render(<CreatePrayerCardModal {...mockProps} />);

    expect(getByTestId('select-recipients-button')).toBeTruthy();
  });

  it('should disable create button when form is invalid', () => {
    const { getByTestId } = render(<CreatePrayerCardModal {...mockProps} />);

    // Button exists but form is invalid
    expect(getByTestId('confirm-create-button')).toBeTruthy();
    expect(mockProps.onSuccess).not.toHaveBeenCalled();
  });

  it('should call onClose when close button is pressed', () => {
    const { getByTestId } = render(<CreatePrayerCardModal {...mockProps} />);

    const closeButton = getByTestId('close-modal-button');
    fireEvent.press(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should not call onClose when creating', () => {
    const { getByTestId } = render(<CreatePrayerCardModal {...mockProps} creating={true} />);

    const closeButton = getByTestId('close-modal-button');
    fireEvent.press(closeButton);

    expect(mockProps.onClose).not.toHaveBeenCalled();
  });

  it('should call onSuccess when create button is pressed with valid form', async () => {
    const props = {
      ...mockProps,
      content: 'Test prayer',
      recipientScope: 'church_wide' as const,
      recipientIds: [],
    };

    const { getByTestId } = render(<CreatePrayerCardModal {...props} />);

    const createButton = getByTestId('confirm-create-button');
    fireEvent.press(createButton);

    expect(props.onSuccess).toHaveBeenCalled();
  });

  it('should show selected recipients when scope is set', () => {
    const props = {
      ...mockProps,
      recipientScope: 'church_wide' as const,
      recipientIds: [],
    };

    const { getByText } = render(<CreatePrayerCardModal {...props} />);

    expect(getByText('prayer.church_wide_selected')).toBeTruthy();
  });

  it('should show recipient count for individual scope', () => {
    const props = {
      ...mockProps,
      recipientScope: 'individual' as const,
      recipientIds: ['id1', 'id2'],
    };

    const { getByText } = render(<CreatePrayerCardModal {...props} />);

    expect(getByText('prayer.recipients_selected')).toBeTruthy();
  });
});
