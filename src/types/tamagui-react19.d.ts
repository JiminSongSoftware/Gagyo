import type React from 'react';
import '@tamagui/core';

declare module '@tamagui/core' {
  interface TamaguiComponentPropsBaseBase {
    children?: React.ReactNode;
  }

  interface StackStyleBase {
    children?: React.ReactNode;
  }

  interface TextStylePropsBase {
    children?: React.ReactNode;
  }
}
