import type { Meta } from '@storybook/react-native';
import { Box, BorderedBox, ElevatedBox } from './Box';
import { Text } from './Text';

/**
 * Box component stories demonstrating variants.
 */
export default {
  title: 'Components/Box',
  component: Box,
} as Meta;

export const Default = {
  args: {
    width: 200,
    height: 100,
    children: <Text i18nKey="common.app_name" />,
  },
};

export const Card = {
  args: {
    variant: 'card',
    width: 200,
    children: <Text i18nKey="common.app_name" />,
  },
};

export const Section = {
  args: {
    variant: 'section',
    children: <Text i18nKey="common.app_name" />,
  },
};

export const Inline = {
  args: {
    variant: 'inline',
    gap: '$2',
    children: (
      <>
        <Text i18nKey="common.app_name" size="sm" />
        <Box bg="$backgroundSecondary" px="$2" py="$1" borderRadius="$2">
          <Text i18nKey="common.loading" size="sm" />
        </Box>
      </>
    ),
  },
};

export const AllVariants = {
  render: () => (
    <>
      <Box variant="card" mb="$4" p="$4">
        <Text i18nKey="common.app_name" weight="semibold" />
      </Box>
      <BorderedBox mb="$4" p="$4">
        <Text i18nKey="common.loading" />
      </BorderedBox>
      <ElevatedBox p="$4">
        <Text i18nKey="common.success" />
      </ElevatedBox>
    </>
  ),
};
