import { render, act } from '@testing-library/react-native';
import { Text } from '../Text';
import { TamaguiProvider } from 'tamagui';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, changeLocale } from '@/i18n';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider>
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  </TamaguiProvider>
);

describe('Text', () => {
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(async () => {
    // Reset to English before each test
    await act(async () => {
      await changeLocale('en');
    });
  });

  it('renders with i18nKey', () => {
    const { getByText } = render(<Text i18nKey="common.app_name" />, { wrapper });
    expect(getByText('Gagyo')).toBeTruthy();
  });

  it('applies variant styles', () => {
    const { getByText } = render(
      <Text i18nKey="common.app_name" variant="caption" />,
      { wrapper }
    );
    const textElement = getByText('Gagyo');
    expect(textElement).toBeTruthy();
  });

  it('applies color prop', () => {
    const { getByText } = render(
      <Text i18nKey="common.app_name" color="primary" />,
      { wrapper }
    );
    expect(getByText('Gagyo')).toBeTruthy();
  });

  it('interpolates params', () => {
    // Add a test translation with interpolation
    i18n.addResourceBundle('en', 'common', {
      greeting: 'Hello, {{name}}!',
    });

    const { getByText } = render(
      <Text i18nKey="common.greeting" i18nParams={{ name: 'World' }} />,
      { wrapper }
    );
    expect(getByText('Hello, World!')).toBeTruthy();
  });
});

describe('Text i18n integration', () => {
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
    const { getByText } = render(<Text i18nKey="common.app_name" />, { wrapper });
    expect(getByText('Gagyo')).toBeTruthy();
  });

  it('renders Korean text when locale is ko', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(<Text i18nKey="common.app_name" />, { wrapper });
    expect(getByText('가교')).toBeTruthy();
  });

  it('updates text when locale changes from en to ko', async () => {
    const { getByText, rerender } = render(<Text i18nKey="common.save" />, { wrapper });

    // Initially shows English
    expect(getByText('Save')).toBeTruthy();

    // Change locale to Korean
    await act(async () => {
      await changeLocale('ko');
    });

    // Re-render to pick up the new locale
    rerender(<Text i18nKey="common.save" />);

    // Now shows Korean
    expect(getByText('저장')).toBeTruthy();
  });

  it('updates text when locale changes from ko to en', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText, rerender } = render(<Text i18nKey="common.loading" />, { wrapper });

    // Initially shows Korean
    expect(getByText('로딩 중...')).toBeTruthy();

    // Change locale to English
    await act(async () => {
      await changeLocale('en');
    });

    // Re-render to pick up the new locale
    rerender(<Text i18nKey="common.loading" />);

    // Now shows English
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('falls back to English when key missing in Korean', async () => {
    // Add a key that only exists in English
    i18n.addResourceBundle('en', 'common', {
      test_fallback_key: 'This key only exists in English',
    });

    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(<Text i18nKey="common.test_fallback_key" />, { wrapper });
    // Should fall back to English text
    expect(getByText('This key only exists in English')).toBeTruthy();
  });

  it('handles interpolation in Korean locale', async () => {
    // Add a test translation with interpolation in both languages
    i18n.addResourceBundle('en', 'common', {
      greeting: 'Hello, {{name}}!',
    });
    i18n.addResourceBundle('ko', 'common', {
      greeting: '안녕하세요, {{name}}님!',
    });

    // Test English interpolation
    const { getByText: getByTextEn } = render(
      <Text i18nKey="common.greeting" i18nParams={{ name: 'World' }} />,
      { wrapper }
    );
    expect(getByTextEn('Hello, World!')).toBeTruthy();

    // Switch to Korean and test interpolation
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText: getByTextKo } = render(
      <Text i18nKey="common.greeting" i18nParams={{ name: 'World' }} />,
      { wrapper }
    );
    expect(getByTextKo('안녕하세요, World님!')).toBeTruthy();
  });

  it('renders long text correctly in Korean', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(
      <Text i18nKey="common.network_error" />,
      { wrapper }
    );
    expect(getByText('네트워크 오류입니다. 연결 상태를 확인해 주세요.')).toBeTruthy();
  });

  it('handles rapid locale switches without errors', async () => {
    const { rerender } = render(<Text i18nKey="common.save" />, { wrapper });

    // Rapidly switch locales
    await act(async () => {
      await changeLocale('ko');
    });
    rerender(<Text i18nKey="common.save" />);

    await act(async () => {
      await changeLocale('en');
    });
    rerender(<Text i18nKey="common.save" />);

    await act(async () => {
      await changeLocale('ko');
    });
    rerender(<Text i18nKey="common.save" />);

    await act(async () => {
      await changeLocale('en');
    });
    rerender(<Text i18nKey="common.save" />);

    // Should handle all switches without error
    const { getByText } = render(<Text i18nKey="common.save" />, { wrapper });
    expect(getByText('Save')).toBeTruthy();
  });
});
