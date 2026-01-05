# Release and CI/CD Documentation

This document provides guidance for CI/CD pipelines, release processes, and deployment strategies for the Gagyo application.

---

## CI/CD Overview

Gagyo uses GitHub Actions for continuous integration and EAS (Expo Application Services) for building and deploying.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GitHub Actions                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Lint     │  │    Test     │  │   i18n      │  │   Security  │    │
│  │ TypeCheck   │  │  Coverage   │  │  Validate   │  │    Audit    │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│                                   ▼                                      │
│                          ┌───────────────┐                              │
│                          │  Build Check  │                              │
│                          └───────┬───────┘                              │
│                                  │                                       │
└──────────────────────────────────┼───────────────────────────────────────┘
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │      EAS Build          │
                     │   (on release branch)   │
                     └───────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
      │  iOS Build   │   │ Android Build│   │  E2E Tests   │
      └──────┬───────┘   └──────┬───────┘   └──────────────┘
             │                  │
             ▼                  ▼
      ┌──────────────┐   ┌──────────────┐
      │  TestFlight  │   │  Play Store  │
      │  (Internal)  │   │  (Internal)  │
      └──────────────┘   └──────────────┘
```

---

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Trigger**: Push/PR to `main` or `develop` branches

**Jobs**:

| Job | Purpose | Duration |
|-----|---------|----------|
| `lint` | ESLint, TypeScript check, Prettier | ~2 min |
| `test` | Unit tests with coverage | ~3 min |
| `i18n-validate` | Validate translation completeness | ~1 min |
| `build-check` | Verify Expo config and web export | ~3 min |
| `security` | bun audit and secret scanning | ~2 min |

### E2E Workflow (`.github/workflows/e2e.yml`)

**Trigger**: Push/PR to `main` branch, manual dispatch

**Jobs**:

| Job | Platform | Runner | Duration |
|-----|----------|--------|----------|
| `e2e-ios` | iOS Simulator | macos-14 | ~30 min |
| `e2e-android` | Android Emulator | ubuntu-latest | ~30 min |

---

## Release Process

### Branch Strategy

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/xxx
  │     ├── feature/yyy
  │     └── bugfix/zzz
  │
  └── release/x.x.x (release candidates)
```

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. **Create Release Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/1.2.0
   ```

2. **Update Version**
   - Update `version` in `app.json`
   - Update `version` in `package.json`
   - Update iOS build number in `app.json`
   - Update Android version code in `app.json`

3. **Create Release Notes**
   - Document new features
   - Document bug fixes
   - Document breaking changes (if any)

4. **QA Testing**
   - Run full E2E test suite
   - Manual testing on physical devices
   - Performance testing

5. **Merge to Main**
   ```bash
   git checkout main
   git merge release/1.2.0
   git tag v1.2.0
   git push origin main --tags
   ```

6. **Build and Deploy**
   - EAS Build triggers automatically on main
   - Submit to TestFlight/Play Store Internal Testing
   - After validation, promote to production

---

## EAS Configuration

### `eas.json`

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-services-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## Environment Secrets

### GitHub Actions Secrets

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token for CI |
| `CODECOV_TOKEN` | Codecov upload token |
| `SENTRY_AUTH_TOKEN` | Sentry release auth token |

### EAS Secrets

```bash
# Set secrets via EAS CLI
eas secret:create --scope project --name SUPABASE_URL --value "https://..."
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "..."
eas secret:create --scope project --name SENTRY_DSN --value "..."
eas secret:create --scope project --name POSTHOG_API_KEY --value "..."
```

---

## Build Commands

### Development Build

```bash
# iOS Simulator
eas build --profile development --platform ios

# Android APK
eas build --profile development --platform android
```

### Preview Build (Internal Testing)

```bash
# Both platforms
eas build --profile preview --platform all
```

### Production Build

```bash
# Both platforms
eas build --profile production --platform all
```

---

## Deployment

### iOS Deployment

1. **TestFlight (Internal)**
   ```bash
   eas submit --platform ios --latest
   ```

2. **App Store Review**
   - Log into App Store Connect
   - Add release notes
   - Submit for review

3. **Production Release**
   - After approval, release from App Store Connect

### Android Deployment

1. **Internal Testing**
   ```bash
   eas submit --platform android --latest
   ```

2. **Closed Testing**
   - Promote from internal to closed testing in Play Console

3. **Production Release**
   - Promote from closed testing to production
   - Configure rollout percentage

---

## Monitoring and Rollback

### Release Monitoring

- **Sentry**: Monitor crash rates and error trends
- **PostHog**: Monitor user engagement metrics
- **Firebase Crashlytics**: Additional crash reporting (optional)

### Rollback Procedure

1. **Identify Issue**
   - Monitor Sentry for crash spike
   - Check user feedback

2. **Rollback iOS**
   - In App Store Connect, remove latest version from sale
   - Users will no longer be able to download/update

3. **Rollback Android**
   - In Play Console, halt staged rollout
   - Promote previous version if needed

4. **Post-Mortem**
   - Document issue and root cause
   - Create fix branch
   - Fast-track new release

---

## Hotfix Process

For critical production issues:

1. **Create Hotfix Branch**
   ```bash
   git checkout main
   git checkout -b hotfix/1.2.1
   ```

2. **Apply Fix**
   - Minimal, targeted changes only
   - Full test suite must pass

3. **Fast-Track Release**
   ```bash
   # Bump patch version
   # Build immediately
   eas build --profile production --platform all
   ```

4. **Expedited Review**
   - Use App Store expedited review (if critical)
   - Use Play Store expedited review

5. **Merge Back**
   ```bash
   git checkout develop
   git merge hotfix/1.2.1
   ```

---

## Best Practices

### CI/CD

- Keep builds under 30 minutes when possible
- Cache dependencies and build artifacts
- Run tests in parallel where possible
- Use build matrix for multiple configurations

### Releases

- Always test on physical devices before release
- Use staged rollouts (10% → 50% → 100%)
- Monitor metrics for 24-48 hours before full rollout
- Keep rollback plan ready

### Security

- Never commit secrets to repository
- Use environment-specific secrets
- Rotate secrets regularly
- Audit dependencies regularly

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial documentation |
