/**
 * i18n integration tests for Heading component following TDD.
 */

import { render, act } from '@testing-library/react-native';
import { Heading } from '../Heading';
import { TamaguiProvider } from 'tamagui';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, changeLocale } from '@/i18n';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider>
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  </TamaguiProvider>
);

describe('Heading i18n integration', () => {
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
    const { getByText } = render(<Heading level="h1" i18nKey="common.app_name" />, { wrapper });
    expect(getByText('Gagyo')).toBeTruthy();
  });

  it('renders Korean text when locale is ko', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(<Heading level="h1" i18nKey="common.app_name" />, { wrapper });
    expect(getByText('가교')).toBeTruthy();
  });

  it('updates text when locale changes from en to ko', async () => {
    const { getByText, rerender } = render(<Heading level="h1" i18nKey="common.save" />, { wrapper });

    // Initially shows English
    expect(getByText('Save')).toBeTruthy();

    // Change locale to Korean
    await act(async () => {
      await changeLocale('ko');
    });

    // Re-render to pick up the new locale
    rerender(<Heading level="h1" i18nKey="common.save" />);

    // Now shows Korean
    expect(getByText('저장')).toBeTruthy();
  });

  it('renders all heading levels in Korean', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(
      <>
        <Heading level="h1" i18nKey="common.success" />
        <Heading level="h2" i18nKey="common.error" />
        <Heading level="h3" i18nKey="common.loading" />
        <Heading level="h4" i18nKey="common.confirm" />
      </>,
      { wrapper }
    );

    expect(getByText('성공')).toBeTruthy();
    expect(getByText('오류')).toBeTruthy();
    expect(getByText('로딩 중...')).toBeTruthy();
    expect(getByText('확인')).toBeTruthy();
  });

  it('handles color prop with Korean locale', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(
      <Heading level="h1" color="primary" i18nKey="common.success" />,
      { wrapper }
    );

    expect(getByText('성공')).toBeTruthy();
  });
});
