const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Add SVG transformer support
const { resolver } = config;

config.resolver = {
  ...resolver,
  sourceExts: [...resolver.sourceExts, 'svg'],
  assetExts: [...resolver.assetExts.filter((ext) => ext !== 'svg')],
  // Add custom alias resolution for @/ paths
  resolveRequest: (context, moduleName, platform) => {
    // Handle @/ alias -> src/
    if (moduleName.startsWith('@/')) {
      const subPath = moduleName.substring(2); // Remove '@/'
      const resolvedPath = path.resolve(__dirname, 'src', subPath);
      // Try to resolve as a file
      const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
      for (const ext of extensions) {
        const filePath = resolvedPath + ext;
        if (fs.existsSync(filePath)) {
          return { filePath, type: 'sourceFile' };
        }
      }
      // Try to resolve as an index file in a directory
      const indexPath = path.resolve(resolvedPath, 'index');
      for (const ext of extensions) {
        const filePath = indexPath + ext;
        if (fs.existsSync(filePath)) {
          return { filePath, type: 'sourceFile' };
        }
      }
    }
    // Handle @/assets/ alias -> assets/
    if (moduleName.startsWith('@/assets/')) {
      const subPath = moduleName.substring(9); // Remove '@/assets/'
      const resolvedPath = path.resolve(__dirname, 'assets', subPath);
      return { filePath: resolvedPath, type: 'sourceFile' };
    }
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Enable Storybook when STORYBOOK_ENABLED is set
const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

module.exports = withStorybook(config, {
  configPath: '.storybook',
  enabled: storybookEnabled,
});
