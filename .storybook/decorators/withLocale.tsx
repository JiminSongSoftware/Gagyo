/**
 * Storybook decorator for locale switching.
 *
 * This decorator adds a toolbar control to switch between English and Korean locales,
 * allowing developers and designers to preview components in both languages.
 *
 * Usage in stories:
 * ```tsx
 * export default {
 *   title: 'Components/Button',
 *   component: Button,
 *   decorators: [withLocale],
 * } as Meta;
 *
 * export const Korean = {
 *   args: { ... },
 *   parameters: { locale: 'ko' },
 * };
 * ```
 */

import type { DecoratorFunction } from '@storybook/react-native';
import { useEffect, useState } from 'react';
import { changeLocale } from '@/i18n';

export type StoryLocale = 'en' | 'ko';

export interface withLocaleParams {
  locale?: StoryLocale;
}

/**
 * Decorator that wraps stories with locale context.
 *
 * This decorator:
 * 1. Reads the locale parameter from the story
 * 2. Changes the i18n locale when the parameter changes
 * 3. Resets to English when the story unmounts
 */
export const withLocale: DecoratorFunction = (Story, context) => {
  const { parameters } = context;
  const locale: StoryLocale = parameters?.locale || 'en';
  const [currentLocale, setCurrentLocale] = useState<StoryLocale>(locale);

  useEffect(() => {
    // Change locale when the parameter changes
    if (locale !== currentLocale) {
      changeLocale(locale).then(() => {
        setCurrentLocale(locale);
      });
    }
  }, [locale, currentLocale]);

  return <Story />;
};

/**
 * Add locale parameter to Storybook global parameters.
 *
 * In your .storybook/preview.tsx, add:
 * ```tsx
 * export const parameters = {
 *   ...defaultParameters,
 *   locale: {
 *     description: 'Display locale for the story',
 *     toolbar: {
 *       name: 'locale',
 *       items: [
 *         { value: 'en', title: 'English' },
 *         { value: 'ko', title: '한국어 (Korean)' },
 *       ],
 *       icon: 'globe',
 *     },
 *   },
 * };
 * ```
 *
 * Note: Storybook for React Native may have limited toolbar support.
 * Use the `locale` parameter directly on stories for manual switching.
 */
