module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      // Tamagui plugin for compile-time optimizations
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
          logTimings: true,
          disableExtraction: process.env.NODE_ENV === 'development',
        },
      ],
      // React Native Reanimated
      'react-native-reanimated/plugin',
    ],
  };
};
