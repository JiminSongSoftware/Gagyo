/**
 * Storybook route for on-device component development.
 *
 * To launch Storybook:
 * - iOS: bun run storybook:ios
 * - Android: bun run storybook:android
 * - Or set STORYBOOK_ENABLED=true and run the app normally
 */

import StorybookUI from '../.storybook/index';

export default function StorybookScreen() {
  return <StorybookUI />;
}
