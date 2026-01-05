import type { Meta } from '@storybook/react-native';
import { Input } from './Input';
import { Column } from './Column';
import { Mail, Lock, AlertCircle } from '@tamagui/lucide-icons';
import { useState } from 'react';

/**
 * Input component stories demonstrating variants and states.
 */
export default {
  title: 'Components/Input',
  component: Input,
} as Meta;

export const Default = {
  args: {
    placeholderKey: 'common.app_name',
  },
};

export const WithLabel = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
  },
};

export const AllVariants = {
  render: () => (
    <Column gap="$4" width={300}>
      <Input variant="default" placeholderKey="common.app_name" />
      <Input variant="filled" placeholderKey="common.loading" />
      <Input variant="outline" placeholderKey="common.error" />
    </Column>
  ),
};

export const Error = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
    error: true,
    helperTextKey: 'common.error',
  },
};

export const Success = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
    success: true,
    helperTextKey: 'common.success',
  },
};

export const WithIcon = {
  render: () => (
    <Column gap="$4" width={300}>
      <Input labelKey="common.app_name" placeholderKey="common.loading" leadingIcon={<Mail />} />
      <Input labelKey="common.confirm" placeholderKey="common.loading" secureTextEntry leadingIcon={<Lock />} />
      <Input labelKey="common.error" placeholderKey="common.loading" error leadingIcon={<AlertCircle />} />
    </Column>
  ),
};

export const Disabled = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
    value: 'Disabled input',
    disabled: true,
  },
};

export const Interactive = {
  render: function InteractiveStory() {
    const [value, setValue] = useState('');
    return (
      <Column gap="$4" width={300}>
        <Input
          labelKey="common.app_name"
          placeholderKey="common.loading"
          value={value}
          onChangeText={setValue}
        />
      </Column>
    );
  },
};

export const Korean = {
  name: 'Korean (한국어)',
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
  },
  parameters: {
    locale: 'ko',
  },
};

export const AllVariantsKorean = {
  name: 'All Variants (Korean)',
  render: () => (
    <Column gap="$4" width={300}>
      <Input variant="default" placeholderKey="common.app_name" />
      <Input variant="filled" placeholderKey="common.loading" />
      <Input variant="outline" placeholderKey="common.error" />
    </Column>
  ),
  parameters: {
    locale: 'ko',
  },
};
