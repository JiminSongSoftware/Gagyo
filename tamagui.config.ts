import { createTamagui } from '@tamagui/core';
import { createFont, createTokens } from '@tamagui/config';

// Design tokens based on the existing theme system
const sizeTokens = createTokens({
  sm: { 0: 4, 1: 8, 2: 12, 3: 16, 4: 20, 5: 24, 6: 32, 7: 40, 8: 48, 9: 56, 10: 64, 11: 80, 12: 96 },
  md: { 0: 4, 1: 8, 2: 12, 3: 16, 4: 20, 5: 24, 6: 32, 7: 40, 8: 48, 9: 56, 10: 64, 11: 80, 12: 96 },
  lg: { 0: 4, 1: 8, 2: 12, 3: 16, 4: 20, 5: 24, 6: 32, 7: 40, 8: 48, 9: 56, 10: 64, 11: 80, 12: 96 },
});

const spaceTokens = createTokens({
  sm: { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40, 11: 44, 12: 48, 14: 56, 16: 64, 20: 80, 24: 96, 28: 112, 32: 128, 36: 144, 40: 160, 44: 176, 48: 192, 52: 208, 56: 224, 60: 240, 64: 256, 72: 288, 80: 320, 96: 384 },
  md: { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40, 11: 44, 12: 48, 14: 56, 16: 64, 20: 80, 24: 96, 28: 112, 32: 128, 36: 144, 40: 160, 44: 176, 48: 192, 52: 208, 56: 224, 60: 240, 64: 256, 72: 288, 80: 320, 96: 384 },
  lg: { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40, 11: 44, 12: 48, 14: 56, 16: 64, 20: 80, 24: 96, 28: 112, 32: 128, 36: 144, 40: 160, 44: 176, 48: 192, 52: 208, 56: 224, 60: 240, 64: 256, 72: 288, 80: 320, 96: 384 },
});

const radiusTokens = createTokens({
  sm: { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 22, 12: 24, 14: 28, 16: 32, 20: 40, 24: 48, 28: 56, 32: 64, 'full': 9999 },
  md: { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 22, 12: 24, 14: 28, 16: 32, 20: 40, 24: 48, 28: 56, 32: 64, 'full': 9999 },
  lg: { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12, 7: 14, 8: 16, 9: 18, 10: 20, 11: 22, 12: 24, 14: 28, 16: 32, 20: 40, 24: 48, 28: 56, 32: 64, 'full': 9999 },
});

const zIndexTokens = createTokens({
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  max: 9999,
});

// Color palette based on existing theme colors
const colorTokens = createTokens({
  // Base colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Semantic colors - light theme
  light: {
    background: '#fff',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#eaeaea',

    text: '#11181C',
    textSecondary: '#687076',
    textTertiary: '#9BA1A6',
    textInverse: '#ffffff',

    // Primary brand color (from existing tintColorLight)
    primary: '#0a7ea4',
    primaryHover: '#086688',
    primaryActive: '#065570',
    primaryLight: '#e6f4f9',

    // Secondary
    secondary: '#6366f1',
    secondaryHover: '#4f46e5',
    secondaryLight: '#eef2ff',

    // Border
    border: '#e0e0e0',
    borderStrong: '#c0c0c0',
    borderLight: '#f0f0f0',

    // Status colors
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#dbeafe',

    // Icon colors (from existing theme)
    icon: '#687076',
    iconSecondary: '#9BA1A6',

    // Tab icon colors
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.25)',
  },

  // Semantic colors - dark theme
  dark: {
    background: '#151718',
    backgroundSecondary: '#1a1c1e',
    backgroundTertiary: '#202224',

    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textTertiary: '#687076',
    textInverse: '#11181C',

    // Primary brand color (from existing tintColorDark)
    primary: '#ffffff',
    primaryHover: '#f0f0f0',
    primaryActive: '#e0e0e0',
    primaryLight: 'rgba(255, 255, 255, 0.1)',

    // Secondary
    secondary: '#818cf8',
    secondaryHover: '#6366f1',
    secondaryLight: 'rgba(99, 102, 241, 0.15)',

    // Border
    border: '#2a2d2f',
    borderStrong: '#3a3d3f',
    borderLight: '#222426',

    // Status colors
    success: '#34d399',
    successLight: 'rgba(52, 211, 153, 0.15)',
    warning: '#fbbf24',
    warningLight: 'rgba(251, 191, 36, 0.15)',
    danger: '#f87171',
    dangerLight: 'rgba(248, 113, 113, 0.15)',
    info: '#60a5fa',
    infoLight: 'rgba(96, 165, 250, 0.15)',

    // Icon colors
    icon: '#9BA1A6',
    iconSecondary: '#687076',

    // Tab icon colors
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#ffffff',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',
  },
});

// Media queries for responsive breakpoints
const mediaTokens = createTokens({
  xs: { 0: 0 },
  sm: { 0: 390 }, // iPhone SE width
  md: { 0: 768 }, // Tablet portrait
  lg: { 0: 1024 }, // Tablet landscape
  xl: { 0: 1280 }, // Desktop
});

// Font configuration
const bodyFont = createFont({
  family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    '2xl': 36,
    '3xl': 40,
    '4xl': 44,
    '5xl': 56,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
});

const headingFont = createFont({
  family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  size: {
    h1: 32,
    h2: 28,
    h3: 24,
    h4: 20,
  },
  lineHeight: {
    h1: 40,
    h2: 36,
    h3: 32,
    h4: 28,
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
});

// Tamagui configuration
const config = createTamagui({
  tokens: {
    color: colorTokens,
    size: sizeTokens,
    space: spaceTokens,
    radius: radiusTokens,
    zIndex: zIndexTokens,
    media: mediaTokens,
  },
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  themes: {
    light: {
      background: colorTokens.light.background,
      backgroundSecondary: colorTokens.light.backgroundSecondary,
      backgroundTertiary: colorTokens.light.backgroundTertiary,

      color: colorTokens.light.text,
      colorHover: colorTokens.light.text,

      // Primary colors
      primary: colorTokens.light.primary,
      primaryHover: colorTokens.light.primaryHover,
      primaryActive: colorTokens.light.primaryActive,
      primaryLight: colorTokens.light.primaryLight,

      // Secondary colors
      secondary: colorTokens.light.secondary,
      secondaryHover: colorTokens.light.secondaryHover,
      secondaryLight: colorTokens.light.secondaryLight,

      // Border colors
      border: colorTokens.light.border,
      borderStrong: colorTokens.light.borderStrong,
      borderLight: colorTokens.light.borderLight,

      // Status colors
      success: colorTokens.light.success,
      successLight: colorTokens.light.successLight,
      warning: colorTokens.light.warning,
      warningLight: colorTokens.light.warningLight,
      danger: colorTokens.light.danger,
      dangerLight: colorTokens.light.dangerLight,
      info: colorTokens.light.info,
      infoLight: colorTokens.light.infoLight,

      // Text colors
      color1: colorTokens.light.text,
      color2: colorTokens.light.textSecondary,
      color3: colorTokens.light.textTertiary,
      color4: colorTokens.light.textInverse,

      // Icon colors
      icon: colorTokens.light.icon,
      iconSecondary: colorTokens.light.iconSecondary,

      // Tab colors
      tabIconDefault: colorTokens.light.tabIconDefault,
      tabIconSelected: colorTokens.light.tabIconSelected,

      // Overlay
      overlay: colorTokens.light.overlay,
      overlayLight: colorTokens.light.overlayLight,

      // Shadow
      shadowColor: colorTokens.black,
      shadowColorHover: 'rgba(0, 0, 0, 0.1)',
    },

    dark: {
      background: colorTokens.dark.background,
      backgroundSecondary: colorTokens.dark.backgroundSecondary,
      backgroundTertiary: colorTokens.dark.backgroundTertiary,

      color: colorTokens.dark.text,
      colorHover: colorTokens.dark.text,

      // Primary colors
      primary: colorTokens.dark.primary,
      primaryHover: colorTokens.dark.primaryHover,
      primaryActive: colorTokens.dark.primaryActive,
      primaryLight: colorTokens.dark.primaryLight,

      // Secondary colors
      secondary: colorTokens.dark.secondary,
      secondaryHover: colorTokens.dark.secondaryHover,
      secondaryLight: colorTokens.dark.secondaryLight,

      // Border colors
      border: colorTokens.dark.border,
      borderStrong: colorTokens.dark.borderStrong,
      borderLight: colorTokens.dark.borderLight,

      // Status colors
      success: colorTokens.dark.success,
      successLight: colorTokens.dark.successLight,
      warning: colorTokens.dark.warning,
      warningLight: colorTokens.dark.warningLight,
      danger: colorTokens.dark.danger,
      dangerLight: colorTokens.dark.dangerLight,
      info: colorTokens.dark.info,
      infoLight: colorTokens.dark.infoLight,

      // Text colors
      color1: colorTokens.dark.text,
      color2: colorTokens.dark.textSecondary,
      color3: colorTokens.dark.textTertiary,
      color4: colorTokens.dark.textInverse,

      // Icon colors
      icon: colorTokens.dark.icon,
      iconSecondary: colorTokens.dark.iconSecondary,

      // Tab colors
      tabIconDefault: colorTokens.dark.tabIconDefault,
      tabIconSelected: colorTokens.dark.tabIconSelected,

      // Overlay
      overlay: colorTokens.dark.overlay,
      overlayLight: colorTokens.dark.overlayLight,

      // Shadow
      shadowColor: colorTokens.black,
      shadowColorHover: 'rgba(0, 0, 0, 0.3)',
    },
  },
  shorthands: {
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    pt: 'paddingTop',
    pr: 'paddingRight',
    pb: 'paddingBottom',
    pl: 'paddingLeft',

    m: 'margin',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    mt: 'marginTop',
    mr: 'marginRight',
    mb: 'marginBottom',
    ml: 'marginLeft',

    ta: 'textAlign',
    fg: 'flexGrow',
    fs: 'flexShrink',
    bw: 'borderWidth',
    bc: 'borderColor',
    br: 'borderRadius',
    bl: 'borderLeftWidth',
    bt: 'borderTopWidth',
    brw: 'borderRightWidth',
    bb: 'borderBottomWidth',

    shadow: 'shadowColor',
    shadowOpacity: 'shadowOpacity',
    shadowRadius: 'shadowRadius',
    shadowOffset: 'shadowOffset',

    ov: 'overflow',
    ox: 'overflowX',
    oy: 'overflowY',

    pe: 'pointerEvents',
    us: 'userSelect',

    bg: 'backgroundColor',
    w: 'width',
    h: 'height',
    minh: 'minHeight',
    maxh: 'maxHeight',
    minw: 'minWidth',
    maxw: 'maxWidth',

    aspectRatio: 'aspectRatio',

    ai: 'alignItems',
    as: 'alignSelf',
    ac: 'alignContent',

    jc: 'justifyContent',
    ji: 'justifyItems',

    ss: 'justifySelf',
    gg: 'gap',

    flex: 'flex',
    direction: 'flexDirection',
    wrap: 'flexWrap',

    pos: 'position',
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
    z: 'zIndex',
    zIndex: 'zIndex',

    op: 'opacity',
    scale: 'scale',
    rotate: 'rotate',
    x: 'x',
    y: 'y',

    otl: 'outlineColor',
    osw: 'outlineStyle',
    owd: 'outlineWidth',

    siz: 'size',
    col: 'color',

    fow: 'fontWeight',
    fos: 'fontSize',
    lh: 'lineHeight',
    ta: 'textAlign',
    ls: 'letterSpacing',

    tt: 'textTransform',
    td: 'textDecoration',

    softShadow: 'shadowColor',
    softShadowTop: 'shadowColor',
    softShadowBottom: 'shadowColor',
    softShadowLeft: 'shadowColor',
    softShadowRight: 'shadowColor',
  },
  settings: {
    // Disable SSR for React Native
    disableSSR: true,

    // Allowed CSS properties for React Native
    allowedStyleValues: {
      // Allow all style values for React Native
      'web': false,
      'native': true,
    },

    // Allow only native style props
    allowedStyleProps: {
      'web': false,
      'native': true,
    },

    // Enforce strict prop types
    strictStyleProps: 'warn',

    // Fast path for style resolution
    fastStyleResolution: true,

    // Handle font resizing
    fontContext: null,

    // Media queries
    media: mediaTokens,

    // Default theme
    defaultTheme: 'light',
  },
  // Add media query tokens
  media: mediaTokens,
});

// TypeScript module augmentation for type safety
type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
