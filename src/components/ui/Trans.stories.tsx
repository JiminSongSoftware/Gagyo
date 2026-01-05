import type { Meta } from '@storybook/react-native';
import { Text as RNText } from 'react-native';
import { Trans } from './Trans';

/**
 * Trans component stories demonstrating rich text translations with component interpolation.
 *
 * The Trans component is used for translations that contain HTML-like tags
 * for formatting (links, bold, italic, etc.) or component interpolation.
 */
export default {
  title: 'Components/Trans',
  component: Trans,
} as Meta;

// Add test translations for Storybook
if (typeof global !== 'undefined') {
  const i18n = require('@/i18n').i18n;
  i18n.addResourceBundle('en', 'common', {
    rich_text_link: 'By continuing, you agree to our <link>Terms of Service</link>.',
    rich_text_bold: 'This is <bold>bold text</bold> in a sentence.',
    rich_text_interpolation: 'Welcome, <bold>{{name}}</bold>!',
    rich_text_multiple: 'This has <bold>bold</bold> and <link>links</link> combined.',
    rich_text_paragraph: 'Read our <link>Privacy Policy</link> to learn how we handle your data.',
  });
  i18n.addResourceBundle('ko', 'common', {
    rich_text_link: '계속하면 <link>서비스 약관</link>에 동의하는 것으로 간주됩니다.',
    rich_text_bold: '이것은 문장 안의 <bold>굵은 텍스트</bold>입니다.',
    rich_text_interpolation: '<bold>{{name}}</bold>님, 환영합니다!',
    rich_text_multiple: '이것은 <bold>굵은</bold> 글씨와 <link>링크</link>가 결합되었습니다.',
    rich_text_paragraph: '우리가 데이터를 처리하는 방법을 알아보려면 <link>개인정보 처리방침</link>을 읽어보세요.',
  });
}

export const Default = {
  args: {
    i18nKey: 'common.rich_text_link',
    components: {
      link: <RNText style={{ textDecorationLine: 'underline', color: 'blue' }} />,
    },
  },
};

export const WithLink = {
  name: 'With Link Interpolation',
  args: {
    i18nKey: 'common.rich_text_link',
    components: {
      link: <RNText style={{ textDecorationLine: 'underline', color: '#007AFF' }} />,
    },
  },
};

export const WithBoldText = {
  name: 'With Bold Text',
  args: {
    i18nKey: 'common.rich_text_bold',
    components: {
      bold: <RNText style={{ fontWeight: 'bold' }} />,
    },
  },
};

export const WithInterpolation = {
  name: 'With Variable Interpolation',
  args: {
    i18nKey: 'common.rich_text_interpolation',
    i18nParams: { name: 'John' },
    components: {
      bold: <RNText style={{ fontWeight: 'bold' }} />,
    },
  },
};

export const WithMultipleComponents = {
  name: 'With Multiple Components',
  args: {
    i18nKey: 'common.rich_text_multiple',
    components: {
      bold: <RNText style={{ fontWeight: 'bold' }} />,
      link: <RNText style={{ textDecorationLine: 'underline', color: '#007AFF' }} />,
    },
  },
};

export const AsParagraph = {
  name: 'As Paragraph',
  args: {
    i18nKey: 'common.rich_text_paragraph',
    paragraph: true,
    components: {
      link: <RNText style={{ textDecorationLine: 'underline', color: '#007AFF' }} />,
    },
  },
};

export const Korean = {
  name: 'Korean (한국어)',
  args: {
    i18nKey: 'common.rich_text_link',
    components: {
      link: <RNText style={{ textDecorationLine: 'underline', color: '#007AFF' }} />,
    },
  },
  parameters: {
    notes: 'In Storybook, manually switch the locale to ko (Korean) to see the translated text.',
  },
};

export const KoreanWithInterpolation = {
  name: 'Korean with Interpolation',
  args: {
    i18nKey: 'common.rich_text_interpolation',
    i18nParams: { name: '김철수' },
    components: {
      bold: <RNText style={{ fontWeight: 'bold' }} />,
    },
  },
  parameters: {
    notes: 'In Storybook, manually switch the locale to ko (Korean) to see the translated text.',
  },
};

/**
 * Usage examples for the Trans component:
 *
 * 1. Simple rich text with a link:
 *    <Trans i18nKey="common.terms_notice" components={{ link: <Link /> }} />
 *
 * 2. With variable interpolation:
 *    <Trans
 *      i18nKey="common.welcome_user"
 *      i18nParams={{ name: 'John' }}
 *      components={{ bold: <BoldText /> }}
 *    />
 *
 * 3. As a styled paragraph:
 *    <Trans
 *      i18nKey="common.privacy_notice"
 *      paragraph
 *      style={{ color: 'gray' }}
 *      components={{ link: <Link /> }}
 *    />
 *
 * Translation file format:
 * {
 *   "terms_notice": "By continuing, you agree to our <link>Terms of Service</link>.",
 *   "welcome_user": "Welcome, <bold>{{name}}</bold>!",
 *   "privacy_notice": "Read our <link>Privacy Policy</link> for details."
 * }
 */
