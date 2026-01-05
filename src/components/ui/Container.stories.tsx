import type { Meta } from '@storybook/react-native';
import { Container } from './Container';
import { Text } from './Text';
import { Box } from './Box';

/**
 * Container component stories demonstrating layout variants.
 */
export default {
  title: 'Components/Container',
  component: Container,
} as Meta;

export const Default = {
  args: {
    children: <Box bg="$backgroundSecondary" p="$4" width="100%">
      <Text i18nKey="common.app_name" />
    </Box>,
  },
};

export const Centered = {
  args: {
    centered: true,
    children: (
      <Box bg="$backgroundSecondary" p="$4" width={200}>
        <Text i18nKey="common.app_name" />
      </Box>
    ),
  },
};

export const Padded = {
  args: {
    padded: true,
    children: <Text i18nKey="common.app_name" />,
  },
};

export const WithMaxWidth = {
  args: {
    maxWidth: 'sm',
    centered: true,
    children: (
      <Box bg="$backgroundSecondary" p="$4" width="100%">
        <Text i18nKey="common.app_name" />
      </Box>
    ),
  },
};

export const AllVariants = {
  render: () => (
    <>
      <Container padded mb="$4">
        <Text i18nKey="common.app_name" />
      </Container>
      <Container centered padded mb="$4">
        <Box bg="$backgroundSecondary" p="$4">
          <Text i18nKey="common.app_name" />
        </Box>
      </Container>
      <Container maxWidth="md" padded>
        <Text i18nKey="common.app_name" />
      </Container>
    </>
  ),
};
