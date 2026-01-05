/**
 * Storybook UI entry point for app integration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { view } from './storybook.requires';

const StorybookUI = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

export default StorybookUI;
