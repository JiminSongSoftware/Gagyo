const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

const config = getDefaultConfig(__dirname);

// Add SVG transformer support
const { resolver } = config;

config.resolver = {
  ...resolver,
  sourceExts: [...resolver.sourceExts, 'svg'],
  assetExts: [...resolver.assetExts.filter((ext) => ext !== 'svg')],
};

// Enable Storybook when STORYBOOK_ENABLED is set
const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

module.exports = withStorybook(config, {
  configPath: '.storybook',
  enabled: storybookEnabled,
});
