import type { Meta } from '@storybook/react-native';
import { Text } from './Text';

/**
 * Text component stories demonstrating variants and i18n.
 */
export default {
  title: 'Components/Text',
  component: Text,
} as Meta;

export const Default = {
  args: {
    i18nKey: 'common.app_name',
  },
};

export const Korean = {
  args: {
    i18nKey: 'common.app_name',
  },
  parameters: {
    locale: 'ko',
  },
};

export const AllVariants = {
  render: () => (
    <>
      <Text i18nKey="common.app_name" variant="body" mb="$2" />
      <Text i18nKey="common.loading" variant="caption" mb="$2" />
      <Text i18nKey="common.confirm" variant="label" mb="$2" />
      <Text i18nKey="common.cancel" size="sm" mb="$2" />
      <Text i18nKey="common.delete" size="lg" mb="$2" />
      <Text i18nKey="common.save" weight="semibold" mb="$2" />
      <Text i18nKey="common.edit" weight="bold" color="primary" />
    </>
  ),
};

export const AllVariantsKorean = {
  name: 'All Variants (Korean)',
  render: () => (
    <>
      <Text i18nKey="common.app_name" variant="body" mb="$2" />
      <Text i18nKey="common.loading" variant="caption" mb="$2" />
      <Text i18nKey="common.confirm" variant="label" mb="$2" />
      <Text i18nKey="common.cancel" size="sm" mb="$2" />
      <Text i18nKey="common.delete" size="lg" mb="$2" />
      <Text i18nKey="common.save" weight="semibold" mb="$2" />
      <Text i18nKey="common.edit" weight="bold" color="primary" />
    </>
  ),
  parameters: {
    locale: 'ko',
  },
};

export const Sizes = {
  render: () => (
    <>
      <Text i18nKey="common.app_name" size="sm" mb="$2" />
      <Text i18nKey="common.loading" size="md" mb="$2" />
      <Text i18nKey="common.error" size="lg" mb="$2" />
    </>
  ),
};

export const Weights = {
  render: () => (
    <>
      <Text i18nKey="common.app_name" weight="regular" mb="$2" />
      <Text i18nKey="common.loading" weight="medium" mb="$2" />
      <Text i18nKey="common.confirm" weight="semibold" mb="$2" />
      <Text i18nKey="common.delete" weight="bold" />
    </>
  ),
};

export const Colors = {
  render: () => (
    <>
      <Text i18nKey="common.success" color="success" mb="$2" />
      <Text i18nKey="common.error" color="danger" mb="$2" />
      <Text i18nKey="common.cancel" color="primary" mb="$2" />
      <Text i18nKey="common.loading" color="muted" />
    </>
  ),
};

export const LongText = {
  args: {
    i18nKey: 'common.network_error',
  },
};

export const LongTextKorean = {
  name: 'Long Text (Korean)',
  args: {
    i18nKey: 'common.network_error',
  },
  parameters: {
    locale: 'ko',
  },
};
