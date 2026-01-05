# Running the Project

This document provides instructions for setting up, running, and developing the Gagyo application.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 20.19.4 | Required for React Native 0.81.5 |
| bun | >= 10.x | Comes with Node.js |
| Expo CLI | Latest | Installed globally or via bunx |
| Xcode | >= 15.0 | For iOS development (macOS only) |
| Android Studio | Latest | For Android development |
| Watchman | Latest | Recommended for macOS |

### Optional Tools

| Tool | Purpose |
|------|---------|
| EAS CLI | For building and submitting to app stores |
| Detox CLI | For running E2E tests locally |
| CocoaPods | For iOS native dependencies |

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/gagyo.git
cd gagyo
```

### 2. Install Dependencies

```bash
bun install --legacy-peer-deps
```

> **Note**: The `--legacy-peer-deps` flag is required due to peer dependency conflicts with some packages.

### 3. Configure Environment Variables

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Sentry (optional for local dev)
SENTRY_DSN=

# PostHog (optional for local dev)
EXPO_PUBLIC_POSTHOG_API_KEY=

# Environment
EXPO_PUBLIC_ENV=development
```

### 4. Setup iOS (macOS only)

```bash
cd ios
pod install
cd ..
```

### 5. Setup Android

Ensure you have an Android emulator configured in Android Studio, or connect a physical device with USB debugging enabled.

---

## Running the App

### Development Server

Start the Expo development server:

```bash
bun start
```

This will open the Expo DevTools in your browser.

### Running on iOS Simulator

```bash
bun run ios
```

Or press `i` in the Expo DevTools terminal.

### Running on Android Emulator

```bash
bun run android
```

Or press `a` in the Expo DevTools terminal.

### Running on Physical Device

1. Install the Expo Go app from the App Store or Google Play
2. Scan the QR code shown in the terminal or Expo DevTools
3. The app will load on your device

---

## Development Commands

### Type Checking

```bash
bun run typecheck
```

### Linting

```bash
# Check for linting errors
bun run lint

# Fix auto-fixable linting errors
bun run lint:fix
```

### Formatting

```bash
# Format all files
bun run format

# Check formatting without changes
bun run format:check
```

### Unit Tests

```bash
# Run tests once
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

### E2E Tests

```bash
# Build for iOS E2E testing
bun run e2e:build:ios

# Run iOS E2E tests
bun run e2e:test:ios

# Build for Android E2E testing
bun run e2e:build:android

# Run Android E2E tests
bun run e2e:test:android
```

---

## Project Structure

```
gagyo/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── claude_docs/            # Architecture documentation
├── agent_docs/             # Agent guidance documents
├── e2e/                    # E2E test files
├── locales/                # i18n translation files
│   ├── en/                 # English translations
│   └── ko/                 # Korean translations
├── src/
│   ├── atoms/              # Jotai atoms (feature-scoped state)
│   ├── stores/             # Zustand stores (global state)
│   ├── components/         # Reusable UI components
│   ├── screens/            # Screen components
│   ├── services/           # API and external service clients
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript type definitions
├── App.tsx                 # Application entry point
├── app.json                # Expo configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

---

## Environment-Specific Configurations

### Development

- `.env.development` - Development environment variables
- Debug mode enabled
- Verbose logging
- Mock services available

### Staging

- `.env.staging` - Staging environment variables
- Connects to staging Supabase project
- Full observability enabled

### Production

- `.env.production` - Production environment variables
- Connects to production Supabase project
- Error tracking enabled
- Minimal logging

---

## Supabase Local Development

For local Supabase development:

### 1. Install Supabase CLI

```bash
bun install -g supabase
```

### 2. Start Local Supabase

```bash
supabase start
```

### 3. Update Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
```

### 4. Apply Migrations

```bash
supabase db push
```

---

## Troubleshooting

### Common Issues

#### "Metro Bundler couldn't connect to the device"

```bash
# Clear Metro cache
bunx expo start --clear
```

#### "Pod install fails"

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
```

#### "Android build fails"

```bash
cd android
./gradlew clean
cd ..
bun run android
```

#### "TypeScript errors after dependency update"

```bash
# Regenerate TypeScript cache
rm -rf node_modules/.cache
bun run typecheck
```

---

## Debugging

### React Native Debugger

1. Install React Native Debugger from [GitHub releases](https://github.com/jhen0409/react-native-debugger)
2. Start the app in debug mode
3. Open React Native Debugger

### Flipper

1. Install [Flipper](https://fbflipper.com/)
2. The app will automatically connect when running in development

### Console Logs

View console logs in:
- Expo DevTools terminal
- Metro Bundler terminal
- Device logs (Android Studio Logcat / Xcode Console)

---

## Building for Production

### Using EAS Build

```bash
# Install EAS CLI
bun install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Manual Builds

See `agent_docs/04_release_and_ci.md` for detailed build and release instructions.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial documentation |
