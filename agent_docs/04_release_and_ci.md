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

### Pre-Release Checklist

#### Feature Completeness

- [ ] All features from Figma implemented
- [ ] All screens match Figma designs
- [ ] All user flows tested end-to-end
- [ ] All edge cases handled

#### Code Quality

- [ ] Test coverage ≥90% for critical paths
- [ ] All E2E tests passing (iOS + Android)
- [ ] All integration tests passing
- [ ] All unit tests passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Code reviewed and approved

#### Internationalization

- [ ] All UI strings use i18n system
- [ ] English translations complete
- [ ] Korean translations complete
- [ ] i18n validation passing
- [ ] E2E tests run in both locales

#### Security

- [ ] No hardcoded secrets in code
- [ ] All secrets in GitHub Secrets / EAS Secrets
- [ ] Secret scanning passing (Gitleaks)
- [ ] Dependency audit passing
- [ ] RLS policies tested

#### Monitoring

- [ ] Sentry configured and tested
- [ ] PostHog configured and tested
- [ ] Error tracking verified
- [ ] Analytics events verified

#### Release Preparation

- [ ] Version bumped in `app.json` and `package.json`
- [ ] iOS build number incremented
- [ ] Android version code incremented
- [ ] Release notes written (English + Korean)
- [ ] Changelog updated

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
   git checkout -b release/1.0.0
   ```

2. **Update Version Numbers**
   - Update `version` in `app.json`: `"1.0.0"`
   - Update `version` in `package.json`: `"1.0.0"`
   - Update `buildNumber` in `app.json` (iOS): `"1"`
   - Update `versionCode` in `app.json` (Android): `1`

3. **Run Full Test Suite**
   ```bash
   # Lint and type check
   bun run lint
   bun run typecheck

   # Unit tests with coverage
   bun run test:coverage

   # Integration tests
   bun jest __tests__/integration --coverage

   # E2E tests (iOS)
   bun run e2e:build:ios && bun run e2e:test:ios

   # E2E tests (Android)
   bun run e2e:build:android && bun run e2e:test:android
   ```

4. **Create Release Notes**
   - Document new features
   - Document bug fixes
   - Document breaking changes (if any)
   - Include English and Korean versions

5. **QA Testing**
   - Run full E2E test suite
   - Manual testing on physical devices
   - Performance testing
   - Security validation

6. **Build with EAS**
   ```bash
   # Preview build for QA
   eas build --profile preview --platform all

   # Production build (after QA approval)
   eas build --profile production --platform all
   ```

7. **Merge to Main**
   ```bash
   git checkout main
   git merge release/1.0.0
   git tag v1.0.0
   git push origin main --tags
   ```

8. **Submit to Stores**
   ```bash
   # Trigger via GitHub Actions for safety
   # Or manually:
   eas submit --platform ios --latest
   eas submit --platform android --latest
   ```

9. **Monitor Release**
   - Check Sentry for error spikes
   - Check PostHog for engagement metrics
   - Monitor crash-free session rate
   - Review user feedback

---

## EAS Configuration

### `eas.json`

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true,
        "bundleIdentifier": "com.gagyo.app.dev"
      },
      "android": {
        "buildType": "apk",
        "package": "com.gagyo.app.dev"
      },
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "bundleIdentifier": "com.gagyo.app.preview",
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "package": "com.gagyo.app.preview"
      },
      "env": {
        "EXPO_PUBLIC_ENV": "preview"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "bundleIdentifier": "com.gagyo.app",
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle",
        "package": "com.gagyo.app"
      },
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {},
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

| Secret | Type | Description | How to Obtain |
|--------|------|-------------|---------------|
| `EXPO_TOKEN` | Repository | Expo access token for CI | Run `eas login` then `eas whoami --json` |
| `CODECOC_TOKEN` | Repository | Codecov upload token | From Codecov project settings |
| `SENTRY_AUTH_TOKEN` | Repository | Sentry release auth token | From Sentry account settings |
| `SUPABASE_TEST_URL` | Repository | Test database URL | From Supabase test project |
| `SUPABASE_TEST_ANON_KEY` | Repository | Test anon key | From Supabase test project |
| `APPLE_ID` | Repository | Apple Developer email | Your Apple ID |
| `ASC_APP_ID` | Repository | App Store Connect ID | From App Store Connect |
| `APPLE_TEAM_ID` | Repository | Apple Team ID | From Apple Developer account |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Repository | Play Store service account (base64) | From Google Cloud Console |

#### Setting GitHub Secrets

```bash
# Navigate to repository settings
# Settings > Secrets and variables > Actions > New repository secret

# Add each secret with its value
```

### EAS Secrets

| Secret | Scope | Description |
|--------|-------|-------------|
| `SUPABASE_URL` | Project | Production Supabase URL |
| `SUPABASE_ANON_KEY` | Project | Production Supabase anon key |
| `SENTRY_DSN` | Project | Sentry error tracking DSN |
| `POSTHOG_API_KEY` | Project | PostHog analytics key |

#### Setting EAS Secrets

Use the provided setup script:

```bash
./scripts/setup-eas-secrets.sh
```

Or set manually:

```bash
# Set secrets via EAS CLI
eas secret:create --scope project --name SUPABASE_URL --value "https://..."
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "..."
eas secret:create --scope project --name SENTRY_DSN --value "..."
eas secret:create --scope project --name POSTHOG_API_KEY --value "..."
```

To list secrets:

```bash
eas secret:list --scope project
```

### Secret Rotation Policy

- **Review**: Quarterly review of all secrets
- **Rotate**: Immediately after any suspected exposure
- **Audit**: Check for unused secrets during each release cycle

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

#### Metrics to Track

| Metric | Tool | Target | Alert Threshold |
|--------|------|--------|-----------------|
| Crash-free session rate | Sentry | >99% | <98% |
| Error rate | Sentry | <0.1% | >0.5% |
| API response time | Sentry | <500ms | >1000ms |
| Daily active users | PostHog | Baseline | -20% |
| Session duration | PostHog | Baseline | -20% |
| App launches | PostHog | Baseline | -15% |

#### Monitoring Checklist

- [ ] Sentry dashboard configured with release tracking
- [ ] Error rate alerts configured
- [ ] PostHog events verified
- [ ] Crash reports reviewed
- [ ] Performance metrics monitored
- [ ] User feedback channels checked

### Rollback Procedure

#### Decision Criteria

Consider rollback if:
- Crash-free session rate drops below 98%
- Critical functionality is broken for >10% of users
- Data loss or corruption occurs
- Security vulnerability is discovered
- App Store/Play Store receives significant negative feedback

#### iOS Rollback

1. **Immediate Action**
   ```bash
   # Log into App Store Connect
   # Navigate to TestFlight or App Store section
   ```

2. **Remove from Sale**
   - Go to App > Pricing and Availability
   - Click "Remove from Sale"
   - Confirm removal

3. **Communicate**
   - Notify stakeholders of rollback
   - Post message to community channels
   - Update issue tracker

4. **Post-Rollback**
   - Users will no longer receive updates
   - Existing installs remain functional
   - Previous version can be re-enabled if needed

#### Android Rollback

1. **Immediate Action**
   ```bash
   # Log into Play Console
   # Navigate to the app
   ```

2. **Halt Rollout**
   - Go to Release > Production / Internal Testing
   - Click "Halt Rollout"
   - Select "Stop rollout" or "Pause rollout"

3. **Promote Previous Version** (if needed)
   - Go to Release > Internal/Closed Testing
   - Promote stable previous version
   - Initiate new rollout

4. **Post-Rollback**
   - New installs receive previous version
   - Existing users can downgrade (if configured)
   - Monitor metrics stabilize

#### Post-Mortem Process

1. **Document Incident**
   - What happened
   - When did it happen
   - Who was affected
   - What was the impact

2. **Root Cause Analysis**
   - Review logs and metrics
   - Reproduce issue if possible
   - Identify code changes

3. **Create Fix**
   ```bash
   git checkout main
   git checkout -b hotfix/1.0.1
   # Apply minimal fix
   # Run full test suite
   ```

4. **Fast-Track Release**
   - Expedited review requests to stores
   - Bypass full QA cycle for critical fixes
   - Release with comprehensive monitoring

5. **Prevent Recurrence**
   - Add regression test
   - Update documentation
   - Adjust release process

---

## GitHub Environments

### Production Environment Setup

GitHub Environments provide deployment protection with required approvals.

#### Setup Steps

1. **Navigate to repository settings**
   - Go to Settings > Environments

2. **Create production environment**
   - Click "New environment"
   - Name: `production`
   - Click "Configure environment"

3. **Configure protection rules**
   - **Required reviewers**: Add at least 1 team member
   - **Deployment branches**: Restrict to `main` only
   - **Wait timer**: Optional (e.g., 5 minutes for review window)

4. **Add environment secrets** (optional)
   - Use environment-specific secrets if needed
   - These override repository secrets during deployment

#### Approval Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    EAS Submit Trigger                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Workflow Starts     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Validation Checks  │
              │  - Tests pass        │
              │  - Version matches    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Awaiting Approval   │
              │  (environment: prod) │
              └──────────┬───────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
     ┌─────────────┐           ┌─────────────┐
     │  Approve    │           │   Reject    │
     └──────┬──────┘           └──────┬──────┘
            │                         │
            ▼                         ▼
     ┌─────────────┐           ┌─────────────┐
     │  Submit to  │           │   Cancel    │
     │   Stores    │           │  Workflow   │
     └─────────────┘           └─────────────┘
```

#### Environment-Specific Configuration

The `eas-submit.yml` workflow references the production environment:

```yaml
jobs:
  submit-ios:
    environment: production  # Requires approval
    runs-on: ubuntu-latest
```

This ensures:
- Manual approval before submission
- Audit trail of who approved
- Branch protection (main only)
- Secret isolation at environment level

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
