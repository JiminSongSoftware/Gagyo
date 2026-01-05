/**
 * i18n integration tests for TextArea component following TDD.
 */

import { render, act } from '@testing-library/react-native';
import { TextArea } from '../TextArea';
import { TamaguiProvider } from 'tamagui';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, changeLocale } from '@/i18n';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider>
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  </TamaguiProvider>
);

describe('TextArea i18n integration', () => {
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(async () => {
    // Reset to English before each test
    await act(async () => {
      await changeLocale('en');
    });
  });

  it('renders English label and placeholder when locale is en', () => {
    const { getByPlaceholderText, getByText } = render(
      <TextArea labelKey="common.save" placeholderKey="common.loading" rows={4} />,
      { wrapper }
    );

    expect(getByText('Save')).toBeTruthy();
    expect(getByPlaceholderText('Loading...')).toBeTruthy();
  });

  it('renders Korean label and placeholder when locale is ko', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByPlaceholderText, getByText } = render(
      <TextArea labelKey="common.save" placeholderKey="common.loading" rows={4} />,
      { wrapper }
    );

    expect(getByText('저장')).toBeTruthy();
    expect(getByPlaceholderText('로딩 중...')).toBeTruthy();
  });

  it('updates label and placeholder when locale changes', async () => {
    const { getByPlaceholderText, getByText, rerender } = render(
      <TextArea labelKey="common.save" placeholderKey="common.loading" rows={4} />,
      { wrapper }
    );

    // Initially shows English
    expect(getByText('Save')).toBeTruthy();
    expect(getByPlaceholderText('Loading...')).toBeTruthy();

    // Change locale to Korean
    await act(async () => {
      await changeLocale('ko');
    });

    // Re-render to pick up the new locale
    rerender(<TextArea labelKey="common.save" placeholderKey="common.loading" rows={4} />);

    // Now shows Korean
    expect(getByText('저장')).toBeTruthy();
    expect(getByPlaceholderText('로딩 중...')).toBeTruthy();
  });

  it('renders error helper text in Korean', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(
      <TextArea
        labelKey="common.save"
        placeholderKey="common.loading"
        error
        helperTextKey="common.error"
        rows={4}
      />,
      { wrapper }
    );

    expect(getByText('저장')).toBeTruthy();
    expect(getByText('오류')).toBeTruthy();
  });

  it('renders success helper text in Korean', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(
      <TextArea
        labelKey="common.save"
        placeholderKey="common.loading"
        success
        helperTextKey="common.success"
        rows={4}
      />,
      { wrapper }
    );

    expect(getByText('저장')).toBeTruthy();
    expect(getByText('성공')).toBeTruthy();
  });

  it('shows character count label in Korean', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(
      <TextArea
        labelKey="common.save"
        placeholderKey="common.loading"
        rows={4}
        showCharacterCount
      />,
      { wrapper }
    );

    expect(getByText('저장')).toBeTruthy();
  });
});
