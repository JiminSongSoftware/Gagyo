import * as Storybook from '@storybook/react-native';

/**
 * Storybook configuration for on-device development.
 */
module.exports = {
  stories: ['../src/components/**/*.stories.@(tsx|mdx)'],
  addons: [
    '@storybook/addon-ondevice',
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
  ],
};
