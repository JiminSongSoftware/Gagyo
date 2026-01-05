import type { Meta } from '@storybook/react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Button } from './Button';
import { Column } from './Column';

/**
 * Card component stories demonstrating variants and composition.
 */
export default {
  title: 'Components/Card',
  component: Card,
} as Meta;

export const Elevated = {
  args: {
    variant: 'elevated',
    children: <Text i18nKey="common.app_name" />,
  },
};

export const Outlined = {
  args: {
    variant: 'outlined',
    children: <Text i18nKey="common.app_name" />,
  },
};

export const Filled = {
  args: {
    variant: 'filled',
    children: <Text i18nKey="common.app_name" />,
  },
};

export const WithComposition = {
  render: () => (
    <Card variant="elevated" width={300}>
      <Card.Header>
        <Text i18nKey="common.app_name" weight="semibold" size="lg" />
      </Card.Header>
      <Card.Body>
        <Text i18nKey="common.loading" color="muted" />
      </Card.Body>
      <Card.Footer>
        <Button variant="primary" size="sm" labelKey="common.confirm" flex={1} mr="$2" />
        <Button variant="outline" size="sm" labelKey="common.cancel" flex={1} />
      </Card.Footer>
    </Card>
  ),
};

export const Pressable = {
  args: {
    variant: 'elevated',
    pressable: true,
    onPress: () => console.log('Card pressed'),
    children: (
      <Column gap="$2" p="$4">
        <Text i18nKey="common.app_name" weight="semibold" />
        <Text i18nKey="common.loading" size="sm" color="muted" />
      </Column>
    ),
  },
};

export const CustomColors = {
  render: () => (
    <Column gap="$4" width={300}>
      <Card bg="$primary" p="$4">
        <Text i18nKey="common.app_name" color="$white" />
      </Card>
      <Card bg="$success" p="$4">
        <Text i18nKey="common.success" color="$white" />
      </Card>
      <Card bg="$danger" p="$4">
        <Text i18nKey="common.error" color="$white" />
      </Card>
    </Column>
  ),
};

export const AllVariants = {
  render: () => (
    <Column gap="$4" width={300}>
      <Card variant="elevated" p="$4">
        <Text i18nKey="common.app_name" weight="semibold" />
      </Card>
      <Card variant="outlined" p="$4">
        <Text i18nKey="common.loading" weight="semibold" />
      </Card>
      <Card variant="filled" p="$4">
        <Text i18nKey="common.error" weight="semibold" />
      </Card>
    </Column>
  ),
};
