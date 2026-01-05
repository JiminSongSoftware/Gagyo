import { start, updateView } from '@storybook/react-native';

import '@storybook/addon-ondevice-controls/register';
import '@storybook/addon-ondevice-actions/register';

const metroRequire = require as typeof require & {
  context: (directory: string, useSubdirectories?: boolean, regExp?: RegExp) => any;
};

const storiesContext = metroRequire.context('../src', true, /\.stories\.(tsx|ts|jsx|js|mdx)$/);

const normalizedStories = [
  {
    titlePrefix: '',
    directory: '../src',
    files: '**/*.stories.@(ts|tsx|js|jsx|mdx)',
    importPathMatcher: /\.stories\.(tsx|ts|jsx|js|mdx)$/,
    // @ts-ignore - Metro augments require with context at runtime
    req: storiesContext,
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __STORYBOOK_VIEW__: ReturnType<typeof start> | undefined;
}

const annotations = [
  require('./preview'),
  require('@storybook/react-native/dist/preview'),
  require('@storybook/addon-ondevice-actions/preview'),
  require('@storybook/addon-ondevice-controls/preview'),
];

const hotModule = import.meta as ImportMeta & { hot?: { accept?: () => void } };
hotModule.hot?.accept?.();

const globalObject = globalThis as typeof globalThis & {
  __STORYBOOK_VIEW__?: ReturnType<typeof start>;
};

if (!globalObject.__STORYBOOK_VIEW__) {
  globalObject.__STORYBOOK_VIEW__ = start({
    annotations,
    storyEntries: normalizedStories,
  });
} else {
  updateView(globalObject.__STORYBOOK_VIEW__, annotations, normalizedStories);
}

export const view = globalObject.__STORYBOOK_VIEW__;
