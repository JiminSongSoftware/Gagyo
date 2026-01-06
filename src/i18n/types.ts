/**
 * i18n type definitions and module augmentations.
 */

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
  | 'errors';

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
  common: TranslationResources;
  auth: TranslationResources;
  chat: TranslationResources;
  prayer: TranslationResources;
  pastoral: TranslationResources;
  settings: TranslationResources;
  errors: TranslationResources;
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
    resources: {
      common: true;
      auth: true;
      chat: true;
      prayer: true;
      pastoral: true;
      settings: true;
      errors: true;
    };

    /**
     * Supported locales.
     */
    locales: ['en', 'ko'];

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
