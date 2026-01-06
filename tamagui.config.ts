import { createTamagui } from '@tamagui/core';

// Design tokens based on the existing theme system
const sizeTokens = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 56,
  11: 64,
  12: 80,
  13: 96,
};

const spaceTokens = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
};

const radiusTokens = {
  0: 0,
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 18,
  10: 20,
  11: 22,
  12: 24,
  14: 28,
  16: 32,
  20: 40,
  24: 48,
  28: 56,
  32: 64,
  full: 9999, // full radius
};

const zIndexTokens = {
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
};

// Color palette based on existing theme colors
const colorTokens = {
  // Base colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Light theme colors
  lightBackground: '#fff',
  lightBackgroundSecondary: '#f5f5f5',
  lightBackgroundTertiary: '#eaeaea',
  lightBackgroundWarm: '#FFF8F0', // Small Group
  lightBackgroundCool: '#F0F8FF', // Ministry
  lightBackgroundAccent: '#FFF0F8', // Church Wide
  lightText: '#11181C',
  lightTextSecondary: '#687076',
  lightTextTertiary: '#9BA1A6',
  lightTextInverse: '#ffffff',
  lightPrimary: '#0a7ea4',
  lightPrimaryHover: '#086688',
  lightPrimaryActive: '#065570',
  lightPrimaryLight: '#e6f4f9',
  lightPrimaryDark: '#064d66',
  lightSecondary: '#6366f1',
  lightSecondaryHover: '#4f46e5',
  lightSecondaryLight: '#eef2ff',
  lightBorder: '#e0e0e0',
  lightBorderStrong: '#c0c0c0',
  lightBorderLight: '#f0f0f0',
  lightSuccess: '#10b981',
  lightSuccessLight: '#d1fae5',
  lightWarning: '#f59e0b',
  lightWarningLight: '#fef3c7',
  lightDanger: '#ef4444',
  lightDangerLight: '#fee2e2',
  lightInfo: '#3b82f6',
  lightInfoLight: '#dbeafe',
  lightIcon: '#687076',
  lightIconSecondary: '#9BA1A6',
  lightTabIconDefault: '#687076',
  lightTabIconSelected: '#0a7ea4',
  lightOverlay: 'rgba(0, 0, 0, 0.5)',
  lightOverlayLight: 'rgba(0, 0, 0, 0.25)',

  // Dark theme colors
  darkBackground: '#151718',
  darkBackgroundSecondary: '#1a1c1e',
  darkBackgroundTertiary: '#202224',
  darkBackgroundWarm: '#2A2520', // Small Group
  darkBackgroundCool: '#1A2530', // Ministry
  darkBackgroundAccent: '#2A1A25', // Church Wide
  darkText: '#ECEDEE',
  darkTextSecondary: '#9BA1A6',
  darkTextTertiary: '#687076',
  darkTextInverse: '#11181C',
  darkPrimary: '#ffffff',
  darkPrimaryHover: '#f0f0f0',
  darkPrimaryActive: '#e0e0e0',
  darkPrimaryLight: 'rgba(255, 255, 255, 0.1)',
  darkPrimaryDark: 'rgba(255, 255, 255, 0.2)',
  darkSecondary: '#818cf8',
  darkSecondaryHover: '#6366f1',
  darkSecondaryLight: 'rgba(99, 102, 241, 0.15)',
  darkBorder: '#2a2d2f',
  darkBorderStrong: '#3a3d3f',
  darkBorderLight: '#222426',
  darkSuccess: '#34d399',
  darkSuccessLight: 'rgba(52, 211, 153, 0.15)',
  darkWarning: '#fbbf24',
  darkWarningLight: 'rgba(251, 191, 36, 0.15)',
  darkDanger: '#f87171',
  darkDangerLight: 'rgba(248, 113, 113, 0.15)',
  darkInfo: '#60a5fa',
  darkInfoLight: 'rgba(96, 165, 250, 0.15)',
  darkIcon: '#9BA1A6',
  darkIconSecondary: '#687076',
  darkTabIconDefault: '#9BA1A6',
  darkTabIconSelected: '#ffffff',
  darkOverlay: 'rgba(0, 0, 0, 0.7)',
  darkOverlayLight: 'rgba(0, 0, 0, 0.4)',
};

// Media queries for responsive breakpoints
const mediaTokens = {
  xs: { maxWidth: 390 }, // iPhone SE width
  sm: { maxWidth: 768 }, // Tablet portrait
  md: { maxWidth: 1024 }, // Tablet landscape
  lg: { maxWidth: 1280 }, // Desktop
};

// Font configuration
const bodyFont = {
  family:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 30,
    8: 36,
    9: 48,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 28,
    5: 32,
    6: 36,
    7: 40,
    8: 44,
    9: 56,
  },
  weight: {
    1: '400',
    2: '500',
    3: '600',
    4: '700',
  },
};

const headingFont = {
  family:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  size: {
    1: 32,
    2: 28,
    3: 24,
    4: 20,
  },
  lineHeight: {
    1: 40,
    2: 36,
    3: 32,
    4: 28,
  },
  weight: {
    1: '400',
    2: '500',
    3: '600',
    4: '700',
  },
};

// Tamagui configuration
const config = createTamagui({
  tokens: {
    color: colorTokens,
    size: sizeTokens,
    space: spaceTokens,
    radius: radiusTokens,
    zIndex: zIndexTokens,
  },
  media: mediaTokens,
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  themes: {
    light: {
      background: colorTokens.lightBackground,
      backgroundSecondary: colorTokens.lightBackgroundSecondary,
      backgroundTertiary: colorTokens.lightBackgroundTertiary,
      backgroundWarm: colorTokens.lightBackgroundWarm,
      backgroundCool: colorTokens.lightBackgroundCool,
      backgroundAccent: colorTokens.lightBackgroundAccent,
      color: colorTokens.lightText,
      colorHover: colorTokens.lightText,
      primary: colorTokens.lightPrimary,
      primaryHover: colorTokens.lightPrimaryHover,
      primaryActive: colorTokens.lightPrimaryActive,
      primaryLight: colorTokens.lightPrimaryLight,
      primaryDark: colorTokens.lightPrimaryDark,
      secondary: colorTokens.lightSecondary,
      secondaryHover: colorTokens.lightSecondaryHover,
      secondaryLight: colorTokens.lightSecondaryLight,
      border: colorTokens.lightBorder,
      borderStrong: colorTokens.lightBorderStrong,
      borderLight: colorTokens.lightBorderLight,
      success: colorTokens.lightSuccess,
      successLight: colorTokens.lightSuccessLight,
      warning: colorTokens.lightWarning,
      warningLight: colorTokens.lightWarningLight,
      danger: colorTokens.lightDanger,
      dangerLight: colorTokens.lightDangerLight,
      info: colorTokens.lightInfo,
      infoLight: colorTokens.lightInfoLight,
      color1: colorTokens.lightText,
      color2: colorTokens.lightTextSecondary,
      color3: colorTokens.lightTextTertiary,
      color4: colorTokens.lightTextInverse,
      icon: colorTokens.lightIcon,
      iconSecondary: colorTokens.lightIconSecondary,
      tabIconDefault: colorTokens.lightTabIconDefault,
      tabIconSelected: colorTokens.lightTabIconSelected,
      overlay: colorTokens.lightOverlay,
      overlayLight: colorTokens.lightOverlayLight,
      shadowColor: colorTokens.black,
      shadowColorHover: 'rgba(0, 0, 0, 0.1)',
    },

    dark: {
      background: colorTokens.darkBackground,
      backgroundSecondary: colorTokens.darkBackgroundSecondary,
      backgroundTertiary: colorTokens.darkBackgroundTertiary,
      backgroundWarm: colorTokens.darkBackgroundWarm,
      backgroundCool: colorTokens.darkBackgroundCool,
      backgroundAccent: colorTokens.darkBackgroundAccent,
      color: colorTokens.darkText,
      colorHover: colorTokens.darkText,
      primary: colorTokens.darkPrimary,
      primaryHover: colorTokens.darkPrimaryHover,
      primaryActive: colorTokens.darkPrimaryActive,
      primaryLight: colorTokens.darkPrimaryLight,
      primaryDark: colorTokens.darkPrimaryDark,
      secondary: colorTokens.darkSecondary,
      secondaryHover: colorTokens.darkSecondaryHover,
      secondaryLight: colorTokens.darkSecondaryLight,
      border: colorTokens.darkBorder,
      borderStrong: colorTokens.darkBorderStrong,
      borderLight: colorTokens.darkBorderLight,
      success: colorTokens.darkSuccess,
      successLight: colorTokens.darkSuccessLight,
      warning: colorTokens.darkWarning,
      warningLight: colorTokens.darkWarningLight,
      danger: colorTokens.darkDanger,
      dangerLight: colorTokens.darkDangerLight,
      info: colorTokens.darkInfo,
      infoLight: colorTokens.darkInfoLight,
      color1: colorTokens.darkText,
      color2: colorTokens.darkTextSecondary,
      color3: colorTokens.darkTextTertiary,
      color4: colorTokens.darkTextInverse,
      icon: colorTokens.darkIcon,
      iconSecondary: colorTokens.darkIconSecondary,
      tabIconDefault: colorTokens.darkTabIconDefault,
      tabIconSelected: colorTokens.darkTabIconSelected,
      overlay: colorTokens.darkOverlay,
      overlayLight: colorTokens.darkOverlayLight,
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

    // Allow tokens + common RN values without blocking valid styles.
    allowedStyleValues: 'somewhat-strict',
  },
});

// TypeScript module augmentation for type safety
type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
