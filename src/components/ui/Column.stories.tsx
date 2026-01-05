import type { Meta } from '@storybook/react-native';
import { Column, CenteredColumn, SpacedColumn } from './Column';
import { Box } from './Box';
import { Text } from './Text';

/**
 * Column component stories demonstrating vertical layout.
 */
export default {
  title: 'Components/Column',
  component: Column,
} as Meta;

export const Default = {
  args: {
    gap: '$2',
    children: (
      <>
        <Box bg="$primary" width="100%" height={40} borderRadius="$2" />
        <Box bg="$secondary" width="100%" height={40} borderRadius="$2" />
        <Box bg="$success" width="100%" height={40} borderRadius="$2" />
      </>
    ),
  },
};

export const WithGap = {
  render: () => (
    <Column width={200}>
      <Column gap="$2" mb="$2">
        <Text i18nKey="common.app_name" size="sm" />
        <Text i18nKey="common.loading" size="sm" />
        <Text i18nKey="common.error" size="sm" />
      </Column>
      <Column gap="$4" mb="$2">
        <Text i18nKey="common.app_name" size="sm" />
        <Text i18nKey="common.loading" size="sm" />
        <Text i18nKey="common.error" size="sm" />
      </Column>
      <Column gap="$6">
        <Text i18nKey="common.app_name" size="sm" />
        <Text i18nKey="common.loading" size="sm" />
        <Text i18nKey="common.error" size="sm" />
      </Column>
    </Column>
  ),
};

export const Alignment = {
  render: () => (
    <>
      <Column alignItems="center" gap="$2" mb="$4">
        <Box bg="$primary" width={30} height={30} borderRadius="$2" />
        <Box bg="$secondary" width={40} height={40} borderRadius="$2" />
        <Box bg="$success" width={50} height={50} borderRadius="$2" />
      </Column>
      <Column alignItems="flex-start" gap="$2">
        <Box bg="$primary" width={30} height={30} borderRadius="$2" />
        <Box bg="$secondary" width={40} height={40} borderRadius="$2" />
        <Box bg="$success" width={50} height={50} borderRadius="$2" />
      </Column>
    </>
  ),
};

export const Centered = {
  args: {
    height: 200,
    children: <Text i18nKey="common.app_name" />,
  },
};

export const Spaced = {
  args: {
    height: 200,
    children: (
      <>
        <Text i18nKey="common.app_name" />
        <Text i18nKey="common.loading" />
        <Text i18nKey="common.cancel" />
      </>
    ),
  },
};
