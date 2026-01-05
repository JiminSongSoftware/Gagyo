/**
 * Tests for i18n utility functions following TDD.
 *
 * Tests:
 * 1. formatDate with various formats and locales
 * 2. formatNumber with various options and locales
 * 3. formatRelativeTime with various time differences and locales
 */

import { formatDate, formatNumber, formatRelativeTime } from '../utils';
import type { Locale } from '../types';

describe('formatDate', () => {
  const testDate = new Date('2024-01-15T10:30:00Z');

  it('formats date in English with short format', () => {
    const result = formatDate(testDate, { format: 'short', locale: 'en' });
    expect(result).toContain('2024');
  });

  it('formats date in English with medium format', () => {
    const result = formatDate(testDate, { format: 'medium', locale: 'en' });
    expect(result).toContain('January');
    expect(result).toContain('2024');
  });

  it('formats date in English with long format', () => {
    const result = formatDate(testDate, { format: 'long', locale: 'en' });
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats date in English with full format', () => {
    const result = formatDate(testDate, { format: 'full', locale: 'en' });
    expect(result).toBeTruthy();
    expect(result).toContain('2024');
  });

  it('formats date in Korean with short format', () => {
    const result = formatDate(testDate, { format: 'short', locale: 'ko' });
    expect(result).toContain('2024');
    expect(result).toContain('1');
    expect(result).toContain('15');
  });

  it('formats date in Korean with medium format', () => {
    const result = formatDate(testDate, { format: 'medium', locale: 'ko' });
    expect(result).toContain('2024');
    expect(result).toContain('1');
    expect(result).toContain('15');
  });

  it('formats date in Korean with long format', () => {
    const result = formatDate(testDate, { format: 'long', locale: 'ko' });
    expect(result).toContain('2024');
  });

  it('uses default format when not specified', () => {
    const result = formatDate(testDate, { locale: 'en' });
    expect(result).toBeTruthy();
  });

  it('uses default locale when not specified', () => {
    const result = formatDate(testDate);
    expect(result).toBeTruthy();
  });

  it('handles number input (timestamp)', () => {
    const result = formatDate(testDate.getTime(), { locale: 'en' });
    expect(result).toContain('2024');
  });
});

describe('formatNumber', () => {
  it('formats number with default options', () => {
    const result = formatNumber(1234.56);
    expect(result).toBe('1,235');
  });

  it('formats number in English locale', () => {
    const result = formatNumber(1234567.89, { locale: 'en' });
    expect(result).toContain('1,234,567');
  });

  it('formats number in Korean locale', () => {
    const result = formatNumber(1234567.89, { locale: 'ko' });
    expect(result).toContain('1,234,567');
  });

  it('formats number with decimal style', () => {
    const result = formatNumber(1234.56, { style: 'decimal', locale: 'en' });
    expect(result).toBe('1,235');
  });

  it('formats number with percent style', () => {
    const result = formatNumber(0.85, { style: 'percent', locale: 'en' });
    expect(result).toBe('85%');
  });

  it('formats number with minimum fraction digits', () => {
    const result = formatNumber(1234, { minimumFractionDigits: 2, locale: 'en' });
    expect(result).toBe('1,234.00');
  });

  it('formats number with maximum fraction digits', () => {
    const result = formatNumber(1234.56789, { maximumFractionDigits: 3, locale: 'en' });
    expect(result).toBe('1,234.568');
  });

  it('formats zero correctly', () => {
    const result = formatNumber(0, { locale: 'en' });
    expect(result).toBe('0');
  });

  it('formats negative numbers correctly', () => {
    const result = formatNumber(-1234.56, { locale: 'en' });
    expect(result).toContain('-1,235');
  });

  it('formats large numbers with many digits', () => {
    const result = formatNumber(1234567890.12, { locale: 'en' });
    expect(result).toBe('1,234,567,890');
  });
});

describe('formatRelativeTime', () => {
  beforeAll(() => {
    // Set a fixed reference time for consistent testing
    jest.useFakeTimers().setSystemTime(new Date('2024-01-15T10:30:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for very recent times in English', () => {
    const recentDate = new Date('2024-01-15T10:29:30Z');
    const result = formatRelativeTime(recentDate, 'en');
    expect(result).toBe('just now');
  });

  it('returns "방금" for very recent times in Korean', () => {
    const recentDate = new Date('2024-01-15T10:29:30Z');
    const result = formatRelativeTime(recentDate, 'ko');
    expect(result).toBe('방금');
  });

  it('returns "1 minute ago" for 1 minute ago in English', () => {
    const oneMinuteAgo = new Date('2024-01-15T10:29:00Z');
    const result = formatRelativeTime(oneMinuteAgo, 'en');
    expect(result).toBe('1 minute ago');
  });

  it('returns "1분 전" for 1 minute ago in Korean', () => {
    const oneMinuteAgo = new Date('2024-01-15T10:29:00Z');
    const result = formatRelativeTime(oneMinuteAgo, 'ko');
    expect(result).toBe('1분 전');
  });

  it('returns "5 minutes ago" for 5 minutes ago in English', () => {
    const fiveMinutesAgo = new Date('2024-01-15T10:25:00Z');
    const result = formatRelativeTime(fiveMinutesAgo, 'en');
    expect(result).toBe('5 minutes ago');
  });

  it('returns "5분 전" for 5 minutes ago in Korean', () => {
    const fiveMinutesAgo = new Date('2024-01-15T10:25:00Z');
    const result = formatRelativeTime(fiveMinutesAgo, 'ko');
    expect(result).toBe('5분 전');
  });

  it('returns "1 hour ago" for 1 hour ago in English', () => {
    const oneHourAgo = new Date('2024-01-15T09:30:00Z');
    const result = formatRelativeTime(oneHourAgo, 'en');
    expect(result).toBe('1 hour ago');
  });

  it('returns "1시간 전" for 1 hour ago in Korean', () => {
    const oneHourAgo = new Date('2024-01-15T09:30:00Z');
    const result = formatRelativeTime(oneHourAgo, 'ko');
    expect(result).toBe('1시간 전');
  });

  it('returns "3 hours ago" for 3 hours ago in English', () => {
    const threeHoursAgo = new Date('2024-01-15T07:30:00Z');
    const result = formatRelativeTime(threeHoursAgo, 'en');
    expect(result).toBe('3 hours ago');
  });

  it('returns "3시간 전" for 3 hours ago in Korean', () => {
    const threeHoursAgo = new Date('2024-01-15T07:30:00Z');
    const result = formatRelativeTime(threeHoursAgo, 'ko');
    expect(result).toBe('3시간 전');
  });

  it('returns "1 day ago" for 1 day ago in English', () => {
    const oneDayAgo = new Date('2024-01-14T10:30:00Z');
    const result = formatRelativeTime(oneDayAgo, 'en');
    expect(result).toBe('1 day ago');
  });

  it('returns "1일 전" for 1 day ago in Korean', () => {
    const oneDayAgo = new Date('2024-01-14T10:30:00Z');
    const result = formatRelativeTime(oneDayAgo, 'ko');
    expect(result).toBe('1일 전');
  });

  it('returns "5 days ago" for 5 days ago in English', () => {
    const fiveDaysAgo = new Date('2024-01-10T10:30:00Z');
    const result = formatRelativeTime(fiveDaysAgo, 'en');
    expect(result).toBe('5 days ago');
  });

  it('returns "5일 전" for 5 days ago in Korean', () => {
    const fiveDaysAgo = new Date('2024-01-10T10:30:00Z');
    const result = formatRelativeTime(fiveDaysAgo, 'ko');
    expect(result).toBe('5일 전');
  });

  it('falls back to date formatting for dates older than a week in English', () => {
    const eightDaysAgo = new Date('2024-01-07T10:30:00Z');
    const result = formatRelativeTime(eightDaysAgo, 'en');
    expect(result).toContain('2024');
    expect(result).toContain('January');
  });

  it('falls back to date formatting for dates older than a week in Korean', () => {
    const eightDaysAgo = new Date('2024-01-07T10:30:00Z');
    const result = formatRelativeTime(eightDaysAgo, 'ko');
    expect(result).toContain('2024');
  });

  it('handles edge case of exactly 60 seconds', () => {
    const sixtySecondsAgo = new Date('2024-01-15T10:29:00Z');
    const result = formatRelativeTime(sixtySecondsAgo, 'en');
    expect(result).toBe('1 minute ago');
  });

  it('handles edge case of exactly 60 minutes', () => {
    const sixtyMinutesAgo = new Date('2024-01-15T09:30:00Z');
    const result = formatRelativeTime(sixtyMinutesAgo, 'en');
    expect(result).toBe('1 hour ago');
  });

  it('handles edge case of exactly 24 hours', () => {
    const twentyFourHoursAgo = new Date('2024-01-14T10:30:00Z');
    const result = formatRelativeTime(twentyFourHoursAgo, 'en');
    expect(result).toBe('1 day ago');
  });

  it('handles edge case of exactly 7 days', () => {
    const sevenDaysAgo = new Date('2024-01-08T10:30:00Z');
    const result = formatRelativeTime(sevenDaysAgo, 'en');
    // At exactly 7 days, should still use days ago
    expect(result).toBe('7 days ago');
  });
});
