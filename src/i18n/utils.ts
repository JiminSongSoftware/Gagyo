import { format as formatDateFn } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import type { DateFormatOptions, Locale, NumberFormatOptions } from './types';

const dateFnsLocales: Record<Locale, Locale> = {
  en: enUS,
  ko: ko,
};

/**
 * Format a date according to locale preferences.
 *
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDate(new Date(), { format: 'long', locale: 'en' }) // "January 4, 2026"
 * formatDate(new Date(), { format: 'short', locale: 'ko' }) // "2026. 1. 4."
 * ```
 */
export function formatDate(
  date: Date | number,
  options: DateFormatOptions = {}
): string {
  const { format = 'medium', locale = 'en' } = options;

  const formatMap = {
    short: 'PPP',
    medium: 'PPPP',
    long: 'EEEE, LLLL d, yyyy',
    full: 'EEEE, LLLL d, yyyy HH:mm',
  } as const;

  return formatDateFn(date, formatMap[format as keyof typeof formatMap], {
    locale: dateFnsLocales[locale],
  });
}

/**
 * Format a number according to locale preferences.
 *
 * @param num - The number to format
 * @param options - Formatting options
 * @returns Formatted number string
 *
 * @example
 * ```ts
 * formatNumber(1234.56, { locale: 'en' }) // "1,234.56"
 * formatNumber(1234.56, { locale: 'ko' }) // "1,234.56"
 * formatNumber(0.85, { style: 'percent', locale: 'en' }) // "85%"
 * ```
 */
export function formatNumber(
  num: number,
  options: NumberFormatOptions = {}
): string {
  const {
    style = 'decimal',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    locale = 'en',
  } = options;

  const localeString = locale === 'ko' ? 'ko-KR' : 'en-US';

  return new Intl.NumberFormat(localeString, {
    style,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
}

/**
 * Format a relative time string (e.g., "5 minutes ago").
 *
 * @param date - The date to compare against now
 * @param locale - The locale to use
 * @returns Relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 60000), 'en') // "1 minute ago"
 * formatRelativeTime(new Date(Date.now() - 60000), 'ko') // "1분 전"
 * ```
 */
export function formatRelativeTime(date: Date, locale: Locale = 'en'): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const translations: Record<
    Locale,
    {
      justNow: string;
      minute: string;
      minutes: string;
      hour: string;
      hours: string;
      day: string;
      days: string;
      ago: string;
    }
  > = {
    en: {
      justNow: 'just now',
      minute: 'minute',
      minutes: 'minutes',
      hour: 'hour',
      hours: 'hours',
      day: 'day',
      days: 'days',
      ago: 'ago',
    },
    ko: {
      justNow: '방금',
      minute: '분',
      minutes: '분',
      hour: '시간',
      hours: '시간',
      day: '일',
      days: '일',
      ago: '전',
    },
  };

  const t = translations[locale];

  if (diffInSeconds < 60) {
    return t.justNow;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (locale === 'ko') {
      return diffInMinutes + t.minutes + ' ' + t.ago;
    }
    return diffInMinutes + ' ' + (diffInMinutes === 1 ? t.minute : t.minutes) + ' ' + t.ago;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (locale === 'ko') {
      return diffInHours + t.hours + ' ' + t.ago;
    }
    return diffInHours + ' ' + (diffInHours === 1 ? t.hour : t.hours) + ' ' + t.ago;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    if (locale === 'ko') {
      return diffInDays + t.days + ' ' + t.ago;
    }
    return diffInDays + ' ' + (diffInDays === 1 ? t.day : t.days) + ' ' + t.ago;
  }

  // For dates older than a week, use date formatting instead
  return formatDate(date, { format: 'short', locale });
}
