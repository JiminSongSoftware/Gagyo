/**
 * i18n type definitions and module augmentations.
 */

import type enCommon from '../../locales/en/common.json';
import type enAuth from '../../locales/en/auth.json';
import type enChat from '../../locales/en/chat.json';
import type enPrayer from '../../locales/en/prayer.json';
import type enPastoral from '../../locales/en/pastoral.json';
import type enSettings from '../../locales/en/settings.json';
import type enErrors from '../../locales/en/errors.json';
import type enImages from '../../locales/en/images.json';

/**
 * Available translation namespaces.
 */
export type TranslationNamespace =
  | 'common'
  | 'auth'
  | 'chat'
  | 'prayer'
  | 'pastoral'
  | 'settings'
  | 'errors'
  | 'images';

/**
 * Helper type for translation keys with namespace.
 * Format: namespace:key
 */
export type TranslationKey<TNamespace extends TranslationNamespace = TranslationNamespace> =
  `${TNamespace}.${string}`;

/**
 * All available translation keys.
 */
export type AvailableTranslationKeys =
  | `${TranslationNamespace}.${string}`
  | 'common.app_name'
  | 'common.loading'
  | 'common.error'
  | 'common.success'
  | 'common.cancel'
  | 'common.confirm'
  | 'common.save'
  | 'common.delete'
  | 'common.edit'
  | 'common.close'
  | 'common.back'
  | 'common.next'
  | 'common.done'
  | 'common.search'
  | 'common.retry'
  | 'common.refresh'
  | 'common.yes'
  | 'common.no'
  | 'common.ok'
  | 'common.submit'
  | 'common.continue'
  | 'common.skip'
  | 'common.select'
  | 'common.view_all'
  | 'common.show_more'
  | 'common.show_less'
  | 'common.no_results'
  | 'common.empty_state'
  | 'common.network_error'
  | 'common.unknown_error'
  | 'common.home'
  | 'common.character_count';

/**
 * Supported locales.
 */
export type Locale = 'en' | 'ko';

/**
 * i18n resources type.
 */
export interface TranslationResources {
  [key: string]: string | TranslationResources;
}

/**
 * Namespace resources mapping.
 */
export interface NamespaceResources {
  common: typeof enCommon;
  auth: typeof enAuth;
  chat: typeof enChat;
  prayer: typeof enPrayer;
  pastoral: typeof enPastoral;
  settings: typeof enSettings;
  errors: typeof enErrors;
  images: typeof enImages;
}

/**
 * Module augmentation for i18next to provide type safety.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    /**
     * Default namespace for translations.
     */
    defaultNS: 'common';

    /**
     * Available namespaces.
     */
    resources: NamespaceResources;

    /**
     * Return type for t function.
     */
    returnNull: false;

    /**
     * Return objects for nested keys.
     */
    returnObjects: false;
  }
}

/**
 * Format options for date formatting.
 */
export interface DateFormatOptions {
  format?: 'short' | 'medium' | 'long' | 'full';
  locale?: Locale;
}

/**
 * Format options for number formatting.
 */
export interface NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'percent';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: Locale;
}
