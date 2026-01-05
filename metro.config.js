const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

const config = getDefaultConfig(__dirname);

// Enable Storybook when STORYBOOK_ENABLED is set
const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

module.exports = withStorybook(config, {
  // Path to your Storybook configuration
  configPath: '.storybook',
  // Only enable Storybook when the environment variable is set
  enabled: storybookEnabled,
});
