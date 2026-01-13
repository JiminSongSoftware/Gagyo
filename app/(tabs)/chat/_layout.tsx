/**
 * Chat tab layout.
 *
 * Uses a Stack navigator within the tab so that:
 * - The conversation list (index) is the root screen
 * - Chat detail ([id]) pushes onto the same stack
 * - Tab bar remains visible when navigating to chat detail
 * - Tab bar only hides when keyboard appears (iOS native behavior)
 */

import { Stack } from 'expo-router';

export default function ChatTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* File-based routing handles index.tsx and [id].tsx automatically */}
    </Stack>
  );
}
