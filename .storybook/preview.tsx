import type { Preview } from '@storybook/react-native';
import { TamaguiProvider } from 'tamagui';
import { I18nextProvider } from 'react-i18next';
import { initI18nForStorybook } from '@/i18n/init';
import i18n from '@/i18n';
import config from '../tamagui.config';

/**
 * Initialize i18n for Storybook before rendering stories.
 * This ensures translations are available in all stories.
 */
initI18nForStorybook().catch((error) => {
  console.error('[Storybook] Failed to initialize i18n:', error);
});

/**
 * Storybook preview configuration with global decorators and parameters.
 */
const preview: Preview = {
  decorators: [
    (Story, context) => {
      const { parameters } = context;
      const locale = parameters?.locale || 'en';

      // Change locale when parameter changes
      if (i18n.language !== locale) {
        i18n.changeLanguage(locale).catch((err) => {
          console.warn(`[Storybook] Failed to change locale to ${locale}:`, err);
        });
      }

      return (
        <TamaguiProvider config={config} defaultTheme="light">
          <I18nextProvider i18n={i18n}>
            <Story />
          </I18nextProvider>
        </TamaguiProvider>
      );
    },
  ],
  parameters: {
    // Default layout for stories
    layout: 'centered',
  },
  globalTypes: {
    locale: {
      name: 'Locale',
      description: 'Display locale for translations',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        items: [
          { value: 'en', title: 'English 🇺🇸', left: '🇺🇸' },
          { value: 'ko', title: '한국어 🇰🇷', left: '🇰🇷' },
        ],
      },
    },
  },
};

export default preview;
