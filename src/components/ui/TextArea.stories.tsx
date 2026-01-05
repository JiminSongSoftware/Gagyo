import type { Meta } from '@storybook/react-native';
import { TextArea } from './TextArea';
import { Column } from './Column';
import { useState } from 'react';

/**
 * TextArea component stories demonstrating variants and features.
 */
export default {
  title: 'Components/TextArea',
  component: TextArea,
} as Meta;

export const Default = {
  args: {
    placeholderKey: 'common.app_name',
    rows: 4,
  },
};

export const WithLabel = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
    rows: 4,
  },
};

export const AllVariants = {
  render: () => (
    <Column gap="$4" width={300}>
      <TextArea variant="default" placeholderKey="common.app_name" rows={4} />
      <TextArea variant="filled" placeholderKey="common.loading" rows={4} />
      <TextArea variant="outline" placeholderKey="common.error" rows={4} />
    </Column>
  ),
};

export const Error = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
    error: true,
    helperTextKey: 'common.error',
    rows: 4,
  },
};

export const Success = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
    success: true,
    helperTextKey: 'common.success',
    rows: 4,
  },
};

export const AutoResize = {
  args: {
    labelKey: 'common.app_name',
    placeholderKey: 'common.loading',
    autoResize: true,
    minHeight: 80,
    maxHeight: 200,
  },
};

export const CharacterCount = {
  render: function CharacterCountStory() {
    const [value, setValue] = useState('');
    const maxLength = 100;
    return (
      <Column gap="$4" width={300}>
        <TextArea
          labelKey="common.app_name"
          placeholderKey="common.loading"
          value={value}
          onChangeText={setValue}
          maxLength={maxLength}
          showCharacterCount
          rows={4}
        />
      </Column>
    );
  },
};

export const Disabled = {
  args: {
    labelKey: 'common.app_name',
    value: 'Disabled text area',
    disabled: true,
    rows: 4,
  },
};

export const Interactive = {
  render: function InteractiveStory() {
    const [value, setValue] = useState('');
    return (
      <Column gap="$4" width={300}>
        <TextArea
          labelKey="common.app_name"
          placeholderKey="common.loading"
          value={value}
          onChangeText={setValue}
          rows={4}
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
    rows: 4,
  },
  parameters: {
    locale: 'ko',
  },
};

export const AllVariantsKorean = {
  name: 'All Variants (Korean)',
  render: () => (
    <Column gap="$4" width={300}>
      <TextArea variant="default" placeholderKey="common.app_name" rows={4} />
      <TextArea variant="filled" placeholderKey="common.loading" rows={4} />
      <TextArea variant="outline" placeholderKey="common.error" rows={4} />
    </Column>
  ),
  parameters: {
    locale: 'ko',
  },
};
