import { render, fireEvent, act } from '@testing-library/react-native';
import { Button } from '../Button';
import { TamaguiProvider } from 'tamagui';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, changeLocale } from '@/i18n';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider>
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  </TamaguiProvider>
);

describe('Button', () => {
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(async () => {
    // Reset to English before each test
    await act(async () => {
      await changeLocale('en');
    });
  });

  it('renders with labelKey', () => {
    const { getByText } = render(<Button labelKey="common.save" />, { wrapper });
    expect(getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button labelKey="common.save" onPress={onPress} />,
      { wrapper }
    );

    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button labelKey="common.save" onPress={onPress} disabled />,
      { wrapper }
    );

    fireEvent.press(getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    const { getByTestId } = render(
      <Button labelKey="common.loading" loading />,
      { wrapper }
    );

    // Loading spinner should be present
    expect(getByTestId('spinner')).toBeTruthy();
  });
});

describe('Button i18n integration', () => {
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(async () => {
    // Reset to English before each test
    await act(async () => {
      await changeLocale('en');
    });
  });

  it('renders English text when locale is en', () => {
    const { getByText } = render(<Button labelKey="common.save" />, { wrapper });
    expect(getByText('Save')).toBeTruthy();
  });

  it('renders Korean text when locale is ko', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(<Button labelKey="common.save" />, { wrapper });
    expect(getByText('저장')).toBeTruthy();
  });

  it('updates text when locale changes from en to ko', async () => {
    const { getByText, rerender } = render(<Button labelKey="common.save" />, { wrapper });

    // Initially shows English
    expect(getByText('Save')).toBeTruthy();

    // Change locale to Korean
    await act(async () => {
      await changeLocale('ko');
    });

    // Re-render to pick up the new locale
    rerender(<Button labelKey="common.save" />);

    // Now shows Korean
    expect(getByText('저장')).toBeTruthy();
  });

  it('updates text when locale changes from ko to en', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText, rerender } = render(<Button labelKey="common.cancel" />, { wrapper });

    // Initially shows Korean
    expect(getByText('취소')).toBeTruthy();

    // Change locale to English
    await act(async () => {
      await changeLocale('en');
    });

    // Re-render to pick up the new locale
    rerender(<Button labelKey="common.cancel" />);

    // Now shows English
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('falls back to English when key missing in Korean', async () => {
    // Add a key that only exists in English
    i18n.addResourceBundle('en', 'common', {
      test_fallback_key: 'This key only exists in English',
    });

    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(<Button labelKey="common.test_fallback_key" />, { wrapper });
    // Should fall back to English text
    expect(getByText('This key only exists in English')).toBeTruthy();
  });

  it('renders all variants in Korean', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText: getByTextKo } = render(
      <>
        <Button variant="primary" labelKey="common.save" />
        <Button variant="secondary" labelKey="common.cancel" />
        <Button variant="outline" labelKey="common.edit" />
        <Button variant="ghost" labelKey="common.delete" />
        <Button variant="danger" labelKey="common.confirm" />
      </>,
      { wrapper }
    );

    expect(getByTextKo('저장')).toBeTruthy();
    expect(getByTextKo('취소')).toBeTruthy();
    expect(getByTextKo('편집')).toBeTruthy();
    expect(getByTextKo('삭제')).toBeTruthy();
    expect(getByTextKo('확인')).toBeTruthy();
  });

  it('handles rapid locale switches without errors', async () => {
    const { rerender } = render(<Button labelKey="common.save" />, { wrapper });

    // Rapidly switch locales
    await act(async () => {
      await changeLocale('ko');
    });
    rerender(<Button labelKey="common.save" />);

    await act(async () => {
      await changeLocale('en');
    });
    rerender(<Button labelKey="common.save" />);

    await act(async () => {
      await changeLocale('ko');
    });
    rerender(<Button labelKey="common.save" />);

    await act(async () => {
      await changeLocale('en');
    });
    rerender(<Button labelKey="common.save" />);

    // Should handle all switches without error
    const { getByText } = render(<Button labelKey="common.save" />, { wrapper });
    expect(getByText('Save')).toBeTruthy();
  });
});
