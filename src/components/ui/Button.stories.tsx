import type { Meta } from '@storybook/react-native';
import { Button } from './Button';
import { Column } from './Column';
import { Search, Plus, Trash2 } from '@tamagui/lucide-icons';

/**
 * Button component stories demonstrating variants and states.
 */
export default {
  title: 'Components/Button',
  component: Button,
} as Meta;

export const Primary = {
  args: {
    variant: 'primary',
    size: 'md',
    labelKey: 'common.save',
  },
};

export const AllVariants = {
  render: () => (
    <Column gap="$3" width={200}>
      <Button variant="primary" labelKey="common.save" />
      <Button variant="secondary" labelKey="common.cancel" />
      <Button variant="outline" labelKey="common.edit" />
      <Button variant="ghost" labelKey="common.delete" />
      <Button variant="danger" labelKey="common.confirm" />
    </Column>
  ),
};

export const AllSizes = {
  render: () => (
    <Column gap="$3" alignItems="flex-start" width={200}>
      <Button variant="primary" size="sm" labelKey="common.save" />
      <Button variant="primary" size="md" labelKey="common.save" />
      <Button variant="primary" size="lg" labelKey="common.save" />
    </Column>
  ),
};

export const WithIcons = {
  render: () => (
    <Column gap="$3" width={200}>
      <Button variant="primary" size="md" labelKey="common.save" leadingIcon={<Plus />} />
      <Button variant="outline" size="md" labelKey="common.delete" trailingIcon={<Trash2 />} />
      <Button variant="secondary" size="md" labelKey="common.confirm" leadingIcon={<Search />} />
    </Column>
  ),
};

export const Loading = {
  render: () => (
    <Column gap="$3" width={200}>
      <Button variant="primary" size="md" labelKey="common.loading" loading />
      <Button variant="secondary" size="md" labelKey="common.loading" loading />
      <Button variant="outline" size="md" labelKey="common.loading" loading />
    </Column>
  ),
};

export const Disabled = {
  render: () => (
    <Column gap="$3" width={200}>
      <Button variant="primary" size="md" labelKey="common.save" disabled />
      <Button variant="secondary" size="md" labelKey="common.cancel" disabled />
      <Button variant="outline" size="md" labelKey="common.edit" disabled />
    </Column>
  ),
};

export const FullWidth = {
  args: {
    variant: 'primary',
    size: 'md',
    labelKey: 'common.save',
    width: '100%',
  },
};

export const Korean = {
  name: 'Korean (한국어)',
  args: {
    variant: 'primary',
    size: 'md',
    labelKey: 'common.save',
  },
  parameters: {
    locale: 'ko',
  },
};

export const AllVariantsKorean = {
  name: 'All Variants (Korean)',
  render: () => (
    <Column gap="$3" width={200}>
      <Button variant="primary" labelKey="common.save" />
      <Button variant="secondary" labelKey="common.cancel" />
      <Button variant="outline" labelKey="common.edit" />
      <Button variant="ghost" labelKey="common.delete" />
      <Button variant="danger" labelKey="common.confirm" />
    </Column>
  ),
  parameters: {
    locale: 'ko',
  },
};
