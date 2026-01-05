import type { Meta } from '@storybook/react-native';
import { Heading } from './Heading';
import { Column } from './Column';

/**
 * Heading component stories demonstrating all levels and i18n.
 */
export default {
  title: 'Components/Heading',
  component: Heading,
} as Meta;

export const Default = {
  args: {
    level: 'h1',
    i18nKey: 'common.app_name',
  },
};

export const AllLevels = {
  render: () => (
    <Column gap="$4">
      <Heading level="h1" i18nKey="common.app_name" />
      <Heading level="h2" i18nKey="common.app_name" />
      <Heading level="h3" i18nKey="common.app_name" />
      <Heading level="h4" i18nKey="common.app_name" />
    </Column>
  ),
};

export const Weights = {
  render: () => (
    <Column gap="$4">
      <Heading level="h1" weight="bold" i18nKey="common.app_name" />
      <Heading level="h2" weight="semibold" i18nKey="common.app_name" />
      <Heading level="h3" weight="medium" i18nKey="common.app_name" />
      <Heading level="h4" weight="regular" i18nKey="common.app_name" />
    </Column>
  ),
};

export const Colors = {
  render: () => (
    <Column gap="$4">
      <Heading level="h1" color="primary" i18nKey="common.success" />
      <Heading level="h2" color="secondary" i18nKey="common.error" />
      <Heading level="h3" color="muted" i18nKey="common.loading" />
    </Column>
  ),
};

export const Truncated = {
  args: {
    level: 'h2',
    i18nKey: 'common.network_error',
    truncated: true,
  },
};

export const Korean = {
  name: 'Korean (한국어)',
  args: {
    level: 'h1',
    i18nKey: 'common.app_name',
  },
  parameters: {
    locale: 'ko',
  },
};

export const AllLevelsKorean = {
  name: 'All Levels (Korean)',
  render: () => (
    <Column gap="$4">
      <Heading level="h1" i18nKey="common.app_name" />
      <Heading level="h2" i18nKey="common.app_name" />
      <Heading level="h3" i18nKey="common.app_name" />
      <Heading level="h4" i18nKey="common.app_name" />
    </Column>
  ),
  parameters: {
    locale: 'ko',
  },
};

export const ColorsKorean = {
  name: 'Colors (Korean)',
  render: () => (
    <Column gap="$4">
      <Heading level="h1" color="primary" i18nKey="common.success" />
      <Heading level="h2" color="secondary" i18nKey="common.error" />
      <Heading level="h3" color="muted" i18nKey="common.loading" />
    </Column>
  ),
  parameters: {
    locale: 'ko',
  },
};
