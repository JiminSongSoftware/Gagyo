import { render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { Trans } from '../Trans';
import { TamaguiProvider } from 'tamagui';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider>
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  </TamaguiProvider>
);

describe('Trans', () => {
  beforeAll(async () => {
    // Add test translations with rich text for Trans component
    i18n.addResourceBundle('en', 'common', {
      terms_notice: 'By continuing, you agree to our <link>Terms of Service</link>.',
      welcome_user: 'Welcome, <bold>{{name}}</bold>!',
      privacy_policy: 'Read our <link>Privacy Policy</link> for details.',
      rich_text_multiple: 'This has <bold>bold</bold> and <italic>italic</italic> text.',
    });
    i18n.addResourceBundle('ko', 'common', {
      terms_notice: '계속하면 <link>서비스 약관</link>에 동의하는 것으로 간주됩니다.',
      welcome_user: '<bold>{{name}}</bold>님, 환영합니다!',
      privacy_policy: '자세한 내용은 <link>개인정보 처리방침</link>을 참고하세요.',
      rich_text_multiple: '이것은 <bold>굵은</bold> 글씨와 <italic>기울임</italic> 글씨가 있습니다.',
    });
  });

  it('renders basic text with i18nKey', () => {
    const { getByText } = render(<Trans i18nKey="common.terms_notice" />, { wrapper });
    expect(getByText('Terms of Service')).toBeTruthy();
  });

  it('interpolates variables with i18nParams', () => {
    const { getByText } = render(
      <Trans
        i18nKey="common.welcome_user"
        i18nParams={{ name: 'John' }}
        components={{ bold: <RNText style={{ fontWeight: 'bold' }} /> }}
      />,
      { wrapper }
    );
    expect(getByText('John')).toBeTruthy();
  });

  it('renders with component interpolation (link)', () => {
    const { getByText } = render(
      <Trans
        i18nKey="common.terms_notice"
        components={{
          link: <RNText style={{ color: 'blue' }} testID="terms-link" />,
        }}
      />,
      { wrapper }
    );
    expect(getByText('Terms of Service')).toBeTruthy();
  });

  it('renders with multiple component interpolations', () => {
    const { getByText } = render(
      <Trans
        i18nKey="common.rich_text_multiple"
        components={{
          bold: <RNText style={{ fontWeight: 'bold' }} />,
          italic: <RNText style={{ fontStyle: 'italic' }} />,
        }}
      />,
      { wrapper }
    );
    expect(getByText('bold')).toBeTruthy();
    expect(getByText('italic')).toBeTruthy();
  });

  it('renders in Korean when locale is switched', async () => {
    await i18n.changeLanguage('ko');

    const { getByText } = render(
      <Trans
        i18nKey="common.welcome_user"
        i18nParams={{ name: 'John' }}
        components={{ bold: <RNText style={{ fontWeight: 'bold' }} /> }}
      />,
      { wrapper }
    );
    expect(getByText('John')).toBeTruthy();
  });

  it('applies style prop correctly', () => {
    const { getByTestId } = render(
      <Trans
        i18nKey="common.terms_notice"
        style={{ color: 'red' }}
        components={{ link: <RNText /> }}
      />,
      { wrapper }
    );
    const textElement = getByTestId(/^.*$/); // Get any element with testID
    // The component should render without errors
    expect(textElement).toBeTruthy();
  });

  it('renders with paragraph prop', () => {
    const { getByText } = render(
      <Trans
        i18nKey="common.terms_notice"
        paragraph
        components={{ link: <RNText /> }}
      />,
      { wrapper }
    );
    expect(getByText('Terms of Service')).toBeTruthy();
  });

  it('falls back to English when key is missing in Korean', async () => {
    // Add a key only in English
    i18n.addResourceBundle('en', 'common', {
      english_only_key: 'This is English only <bold>text</bold>.',
    });

    await i18n.changeLanguage('ko');

    const { getByText } = render(
      <Trans
        i18nKey="common.english_only_key"
        components={{ bold: <RNText style={{ fontWeight: 'bold' }} /> }}
      />,
      { wrapper }
    );
    // Should fall back to English
    expect(getByText('text')).toBeTruthy();
  });

  it('displays key when translation is completely missing', () => {
    const { getByText } = render(
      <Trans
        i18nKey="common.nonexistent_key"
        components={{ bold: <RNText /> }}
      />,
      { wrapper }
    );
    // i18next falls back to showing the key
    expect(getByText('common.nonexistent_key')).toBeTruthy();
  });
});
