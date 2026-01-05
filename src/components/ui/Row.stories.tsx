import type { Meta } from '@storybook/react-native';
import { Row, CenteredRow, SpacedRow } from './Row';
import { Box } from './Box';
import { Text } from './Text';

/**
 * Row component stories demonstrating horizontal layout.
 */
export default {
  title: 'Components/Row',
  component: Row,
} as Meta;

export const Default = {
  args: {
    gap: '$2',
    children: (
      <>
        <Box bg="$primary" width={40} height={40} borderRadius="$2" />
        <Box bg="$secondary" width={40} height={40} borderRadius="$2" />
        <Box bg="$success" width={40} height={40} borderRadius="$2" />
      </>
    ),
  },
};

export const WithGap = {
  render: () => (
    <>
      <Row gap="$2" mb="$2">
        <Text i18nKey="common.app_name" size="sm" />
        <Text i18nKey="common.loading" size="sm" />
        <Text i18nKey="common.error" size="sm" />
      </Row>
      <Row gap="$4" mb="$2">
        <Text i18nKey="common.app_name" size="sm" />
        <Text i18nKey="common.loading" size="sm" />
        <Text i18nKey="common.error" size="sm" />
      </Row>
      <Row gap="$6">
        <Text i18nKey="common.app_name" size="sm" />
        <Text i18nKey="common.loading" size="sm" />
        <Text i18nKey="common.error" size="sm" />
      </Row>
    </>
  ),
};

export const Alignment = {
  render: () => (
    <>
      <Row alignItems="center" gap="$2" mb="$4">
        <Box bg="$primary" width={30} height={30} borderRadius="$2" />
        <Box bg="$secondary" width={40} height={40} borderRadius="$2" />
        <Box bg="$success" width={50} height={50} borderRadius="$2" />
      </Row>
      <Row alignItems="flex-end" gap="$2">
        <Box bg="$primary" width={30} height={30} borderRadius="$2" />
        <Box bg="$secondary" width={40} height={40} borderRadius="$2" />
        <Box bg="$success" width={50} height={50} borderRadius="$2" />
      </Row>
    </>
  ),
};

export const Responsive = {
  args: {
    flexWrap: true,
    gap: '$2',
    children: (
      <>
        <Text i18nKey="common.app_name" size="sm" />
        <Text i18nKey="common.loading" size="sm" />
        <Text i18nKey="common.error" size="sm" />
        <Text i18nKey="common.success" size="sm" />
        <Text i18nKey="common.cancel" size="sm" />
      </>
    ),
  },
};

export const Centered = {
  args: {
    children: <Text i18nKey="common.app_name" />,
  },
};

export const Spaced = {
  args: {
    children: (
      <>
        <Text i18nKey="common.app_name" />
        <Text i18nKey="common.loading" />
        <Text i18nKey="common.cancel" />
      </>
    ),
  },
};
