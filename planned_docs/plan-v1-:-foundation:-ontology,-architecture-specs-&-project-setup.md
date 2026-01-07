I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

## Observations

The codebase has a solid foundation with well-structured documentation and clear governance rules. However, Phase 1 requires critical groundwork: the domain ontology in `file:claude_docs/01_domain_glossary.md` lacks structured definitions for most entities (missing Type, Lifecycle, Invariants, Relationships, etc.). The `file:package.json` is missing essential dependencies (Tamagui, Jotai, Zustand, Supabase client, Expo Notifications, i18n, Detox). Architecture specs in `file:claude_docs/03_service_architecture.md` and `file:claude_docs/04_multi_tenant_model.md` need expansion to cover all features. TypeScript strict mode is already enabled, but ESLint needs i18n enforcement rules. No CI pipeline exists yet.

## Approach

This plan follows the SDD→TDD→DDD mandate by prioritizing specification completion before any implementation. The approach is ontology-first: finalize all domain concepts with structured definitions, then complete architecture specs that reference these concepts, then establish the technical foundation (dependencies, tooling, CI). This ensures subsequent phases have a stable, well-defined foundation. The plan leverages Product_Manager for spec work, Backend_Expert for schema design, Frontend_Expert for dependency selection, and Design_System_Manager for Tamagui setup guidance. All work respects the MCP-first requirement and secrets discipline.

## Implementation Instructions

### 1. Domain Ontology Finalization

**Objective**: Transform `file:claude_docs/01_domain_glossary.md` into a complete, structured ontology covering all entities required for the full application.

**Subagents Involved**: Product_Manager (primary), Backend_Expert (schema validation), Frontend_Expert (UI entity validation)

**MCPs Used**: 
- `context7` MCP: Consult DDD best practices and ontology patterns
- `figma` MCP: Reference Figma designs to ensure all UI entities are captured

**Steps**:

1. **Expand existing entities with structured definitions**:
   - For each existing entity (Tenant, Membership/Role, Conversation, Message, Event Chat, Prayer Card, Pastoral Journal, Device Token), add:
     - **Type**: Entity | Value Object | Aggregate | Event
     - **Identity rules**: How uniqueness is determined
     - **Lifecycle**: Creation → Mutation → Deletion/Archival states
     - **Invariants**: Conditions that must always hold (e.g., "A message must always belong to exactly one tenant")
     - **Relationships**: Parent/child/references with cardinality
     - **Tenant scope**: Global | Tenant | User
     - **Persistence**: Source of truth table and storage boundaries
     - **Events emitted**: Domain events triggered by state changes

2. **Add missing core entities**:
   - **User**: Identity, profile data, authentication state, tenant memberships
   - **Small Group**: Cell group entity with leader/co-leader assignments, zone association
   - **Zone**: Organizational unit containing multiple small groups, zone leader assignment
   - **Ministry**: Ministry team entity with member assignments
   - **User Profile**: Display name, photo, locale preference, notification settings
   - **Notification**: Push notification entity with delivery status, tenant scope
   - **Prayer Analytics**: Aggregated statistics entity (individual, small group, church-wide)
   - **Comment**: Comments on pastoral journals (zone leader, pastor)
   - **Attachment**: File/image attachments for messages and prayer cards

3. **Add specialized entities**:
   - **Thread**: Message thread relationship (single-level only)
   - **Event Chat Exclusion**: Relationship between message and excluded users
   - **Prayer Card Recipient**: Relationship defining prayer card visibility scope
   - **Pastoral Journal Status**: Workflow state (draft, submitted, zone_reviewed, pastor_confirmed)
   - **Device Token**: Already exists, verify completeness

4. **Define value objects**:
   - **Locale**: Language preference (en, ko)
   - **Role**: Enumeration of membership roles
   - **Conversation Type**: Enumeration (direct, small_group, ministry, church_wide)
   - **Message Content Type**: Enumeration (text, image, prayer_card, system)
   - **Notification Type**: Enumeration (new_message, mention, prayer_answered, pastoral_journal)

5. **Define domain events**:
   - **MessageSent**: Triggers push notifications, real-time updates
   - **PrayerAnswered**: Triggers celebratory notifications to all recipients
   - **PastoralJournalSubmitted**: Triggers zone leader notification
   - **PastoralJournalForwarded**: Triggers pastor notification
   - **PastoralJournalConfirmed**: Triggers leader notification
   - **UserJoinedTenant**: Triggers onboarding flows
   - **TenantSwitched**: Triggers context refresh

6. **Document relationships and aggregates**:
   - **Tenant Aggregate**: Root entity containing memberships, conversations, messages, prayer cards, pastoral journals
   - **Conversation Aggregate**: Contains messages, threads, participants
   - **Prayer Card Aggregate**: Contains recipients, answered status, analytics
   - **Pastoral Journal Aggregate**: Contains comments, status transitions, notifications

7. **Validate ontology completeness**:
   - Cross-reference with Figma designs to ensure all UI entities are captured
   - Cross-reference with `file:claude_docs/00_product_spec.md` to ensure all features are covered
   - Ensure every entity has tenant scope defined
   - Ensure every entity has persistence strategy defined

**Exit Criteria**:
- All entities from Figma and product spec are defined in structured format
- Every entity has Type, Identity rules, Lifecycle, Invariants, Relationships, Tenant scope, Persistence, and Events emitted
- No ambiguous or undefined domain concepts remain
- Product_Manager and Backend_Expert sign off on completeness

---

### 2. Architecture Specs Completion

**Objective**: Expand `file:claude_docs/03_service_architecture.md` and `file:claude_docs/04_multi_tenant_model.md` to cover all service boundaries, complete schema definitions, and integration patterns.

**Subagents Involved**: Backend_Expert (primary), Product_Manager (validation), Frontend_Expert (API contract validation)

**MCPs Used**:
- `supabase` MCP: Validate schema design patterns and RLS capabilities
- `context7` MCP: Consult Supabase best practices and multi-tenant patterns

**Steps**:

1. **Expand Service Architecture (`file:claude_docs/03_service_architecture.md`)**:
   - **Add Edge Function specifications**:
     - `send-push-notification`: Triggered by message events, prayer answered, pastoral journal workflow
     - `process-pastoral-journal`: Handles workflow state transitions and notifications
     - `generate-prayer-analytics`: Aggregates prayer card statistics
     - `ai-comment-suggestions`: Provides AI-assisted commenting for zone leaders (if in scope)
   - **Define API contracts**:
     - Request/response schemas for each Edge Function
     - Authentication requirements (JWT claims)
     - Rate limiting rules
     - Error response formats
   - **Add real-time subscription patterns**:
     - Chat message subscriptions with tenant filtering
     - Notification subscriptions
     - Pastoral journal status subscriptions
   - **Expand observability section**:
     - Sentry event taxonomy for all features
     - PostHog event taxonomy for all user actions
     - Logging standards for Edge Functions
   - **Add caching strategy**:
     - Client-side caching for conversation lists
     - Prayer card analytics caching
     - User profile caching

2. **Complete Multi-Tenant Model (`file:claude_docs/04_multi_tenant_model.md`)**:
   - **Add missing schema tables**:
     - `users`: Profile data (display_name, photo_url, locale, created_at, updated_at)
     - `small_groups`: Small group entity (tenant_id, name, leader_id, co_leader_id, zone_id, created_at)
     - `zones`: Zone entity (tenant_id, name, zone_leader_id, created_at)
     - `ministries`: Ministry entity (tenant_id, name, created_at)
     - `ministry_memberships`: User-ministry relationships (ministry_id, user_id, created_at)
     - `prayer_cards`: Prayer card entity (tenant_id, author_id, content, recipient_scope, recipient_ids, answered, answered_at, created_at)
     - `pastoral_journals`: Journal entity (tenant_id, small_group_id, author_id, content, status, zone_leader_comment, pastor_comment, created_at, updated_at)
     - `notifications`: Notification log (tenant_id, user_id, type, payload, read, created_at)
     - `attachments`: File attachments (tenant_id, message_id, prayer_card_id, url, type, created_at)
   - **Define complete RLS policies for each table**:
     - Tenant isolation policies (all tables)
     - Role-based access policies (pastoral journals, prayer cards)
     - Event Chat visibility policies (messages)
     - Small group leader access policies (pastoral journals)
   - **Add indexes for performance**:
     - Tenant-scoped queries (tenant_id + created_at)
     - Conversation message queries (conversation_id + created_at)
     - User notification queries (user_id + read + created_at)
     - Prayer card analytics queries (tenant_id + answered + created_at)
   - **Define foreign key constraints and cascading rules**:
     - ON DELETE CASCADE for tenant deletion
     - ON DELETE SET NULL for user deletion (preserve data)
     - ON DELETE CASCADE for conversation deletion
   - **Add migration strategy**:
     - Initial schema creation order
     - RLS policy application order
     - Seed data requirements (test tenants, users)

3. **Create new architecture document: `file:claude_docs/10_state_management.md`**:
   - **Jotai atom patterns**:
     - Feature-scoped atoms (chat, prayer, pastoral journal)
     - Atom families for entity collections
     - Derived atoms for computed state
   - **Zustand store patterns**:
     - Global session store (user, tenant, auth state)
     - UI state store (modals, toasts, navigation)
     - Persistence configuration (AsyncStorage)
   - **State synchronization**:
     - Supabase real-time → Jotai atom updates
     - Optimistic updates for messages
     - Conflict resolution strategies

4. **Create new architecture document: `file:claude_docs/11_i18n_architecture.md`**:
   - **Translation system design**:
     - Library selection rationale (i18next vs expo-localization)
     - Translation key structure and namespacing
     - Fallback behavior implementation
     - Locale switching mechanism
   - **Translation catalog structure**:
     - File organization (`/locales/en.json`, `/locales/ko.json`)
     - Namespace organization (common, chat, prayer, pastoral, settings, auth)
     - Interpolation patterns
     - Pluralization rules (if needed)
   - **Integration points**:
     - React context provider setup
     - Hook usage patterns (`useTranslation`, `useLocale`)
     - Component-level translation
     - Date/number formatting utilities

**Exit Criteria**:
- All tables required for full application are defined with complete schemas
- All RLS policies are specified with positive and negative test cases
- All Edge Functions are specified with API contracts
- State management patterns are documented
- i18n architecture is fully specified
- Backend_Expert and Product_Manager sign off on completeness

---

### 3. Project Dependencies Setup

**Objective**: Install and configure all required dependencies in `file:package.json` with proper versions and peer dependencies.

**Subagents Involved**: Frontend_Expert (primary), Design_System_Manager (Tamagui), Backend_Expert (Supabase client)

**MCPs Used**:
- `context7` MCP: Verify latest stable versions and compatibility
- `expo-docs` MCP: Verify Expo SDK compatibility
- `web-search-prime` MCP: Check for breaking changes and migration guides

**Steps**:

1. **Install Tamagui**:
   ```bash
   bun add tamagui @tamagui/config
   bun add -d @tamagui/babel-plugin
   ```
   - Verify compatibility with Expo SDK 54
   - Check for React Native 0.81.5 compatibility
   - Document any required Babel configuration in `file:babel.config.js`

2. **Install state management libraries**:
   ```bash
   bun add jotai zustand
   bun add @react-native-async-storage/async-storage
   ```
   - Jotai for feature-scoped atoms
   - Zustand for global state with persistence
   - AsyncStorage for Zustand persistence

3. **Install Supabase client**:
   ```bash
   bun add @supabase/supabase-js
   ```
   - Verify version compatibility with Supabase backend
   - Check for React Native specific configuration requirements

4. **Install Expo Notifications**:
   ```bash
   bun add expo-notifications
   ```
   - Verify Expo SDK 54 compatibility
   - Document required permissions in `file:app.json`

5. **Install i18n library**:
   ```bash
   bun add i18next react-i18next expo-localization
   ```
   - i18next for translation management
   - react-i18next for React bindings
   - expo-localization for device locale detection
   - Alternative: Consider `expo-localization` alone if simpler solution preferred

6. **Install Detox for E2E testing**:
   ```bash
   bun add -d detox detox-cli
   bun add -d jest
   ```
   - Configure Detox for iOS and Android
   - Create `.detoxrc.js` configuration file
   - Document simulator/emulator requirements

7. **Install testing utilities**:
   ```bash
   bun add -d @testing-library/react-native @testing-library/jest-native
   bun add -d jest-expo
   ```
   - React Native Testing Library for component tests
   - Jest Native matchers for assertions

8. **Install Sentry and PostHog**:
   ```bash
   bun add @sentry/react-native sentry-expo
   bun add posthog-react-native
   ```
   - Sentry for error tracking
   - PostHog for analytics
   - Document initialization in app entry point

9. **Install development tools**:
   ```bash
   bun add -d @storybook/react-native
   bun add -d prettier eslint-plugin-react-native
   ```
   - Storybook for component development
   - ESLint plugins for React Native best practices

10. **Update `file:package.json` scripts**:
    ```json
    {
      "scripts": {
        "start": "expo start",
        "android": "expo start --android",
        "ios": "expo start --ios",
        "web": "expo start --web",
        "test": "jest",
        "test:watch": "jest --watch",
        "test:e2e": "detox test",
        "test:e2e:build": "detox build",
        "lint": "eslint . --ext .ts,.tsx",
        "lint:fix": "eslint . --ext .ts,.tsx --fix",
        "type-check": "tsc --noEmit",
        "storybook": "storybook dev",
        "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
      }
    }
    ```

11. **Verify all dependencies**:
    - Run `bun install` to ensure all dependencies resolve
    - Check for peer dependency warnings
    - Document any version conflicts or workarounds in `file:claude_docs/08_running_the_project.md`

**Exit Criteria**:
- All required dependencies are installed and listed in `file:package.json`
- `bun install` completes without errors
- No critical peer dependency warnings
- Scripts are defined for all common tasks
- Frontend_Expert and Design_System_Manager verify completeness

---

### 4. Tooling Configuration

**Objective**: Configure Bun runtime, ESLint with i18n enforcement, TypeScript strict mode (already enabled), and CI pipeline skeleton.

**Subagents Involved**: Frontend_Expert (primary), Quality_Assurance_Manager (CI/testing), Backend_Expert (secrets validation)

**MCPs Used**:
- `github` MCP: Create GitHub Actions workflow files
- `context7` MCP: Verify ESLint plugin configurations and best practices

**Steps**:

1. **Verify Bun runtime configuration**:
   - Ensure `bun` is used in all scripts (already using `bun` in package.json)
   - Create `.bunfig.toml` if custom configuration needed
   - Document Bun version requirement in `file:claude_docs/08_running_the_project.md`
   - Add Bun installation instructions for team members

2. **Configure ESLint for i18n enforcement**:
   - Update `file:eslint.config.js`:
     ```javascript
     const { defineConfig } = require('eslint/config');
     const expoConfig = require('eslint-config-expo/flat');
     
     module.exports = defineConfig([
       expoConfig,
       {
         ignores: ['dist/*', 'node_modules/*', '.expo/*'],
       },
       {
         rules: {
           // Warn on hardcoded strings in JSX
           'no-restricted-syntax': [
             'warn',
             {
               selector: 'JSXText[value=/[a-zA-Z]/]',
               message: 'Hardcoded UI strings are not allowed. Use i18n translation keys.',
             },
           ],
           // Enforce TypeScript strict rules
           '@typescript-eslint/no-explicit-any': 'error',
           '@typescript-eslint/explicit-function-return-type': 'warn',
         },
       },
     ]);
     ```
   - Install additional ESLint plugins:
     ```bash
     bun add -d @typescript-eslint/eslint-plugin @typescript-eslint/parser
     ```
   - Document ESLint rules in `file:claude_docs/02_code_conventions.md`

3. **Verify TypeScript strict mode**:
   - Confirm `file:tsconfig.json` has `"strict": true` (already present ✓)
   - Add additional strict checks:
     ```json
     {
       "compilerOptions": {
         "strict": true,
         "noUncheckedIndexedAccess": true,
         "noImplicitOverride": true,
         "noPropertyAccessFromIndexSignature": true
       }
     }
     ```

4. **Create CI pipeline skeleton**:
   - Create `.github/workflows/ci.yml`:
     ```yaml
     name: CI
     
     on:
       push:
         branches: [main, develop]
       pull_request:
         branches: [main, develop]
     
     jobs:
       lint:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: oven-sh/setup-bun@v1
           - run: bun install
           - run: bun run lint
       
       type-check:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: oven-sh/setup-bun@v1
           - run: bun install
           - run: bun run type-check
       
       unit-tests:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: oven-sh/setup-bun@v1
           - run: bun install
           - run: bun run test
       
       secret-scan:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: gitleaks/gitleaks-action@v2
             env:
               GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       
       i18n-check:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: oven-sh/setup-bun@v1
           - run: bun install
           - name: Check translation key parity
             run: |
               # Script to verify all keys exist in both en.json and ko.json
               # Will be implemented in Phase 4 (i18n Infrastructure)
               echo "i18n check placeholder"
     ```

5. **Create additional CI workflows**:
   - Create `.github/workflows/e2e.yml` for Detox tests (runs on PR only, requires simulator):
     ```yaml
     name: E2E Tests
     
     on:
       pull_request:
         branches: [main, develop]
     
     jobs:
       e2e-ios:
         runs-on: macos-latest
         steps:
           - uses: actions/checkout@v4
           - uses: oven-sh/setup-bun@v1
           - run: bun install
           - name: Build Detox
             run: bun run test:e2e:build
           - name: Run Detox Tests
             run: bun run test:e2e
     ```

6. **Configure Prettier**:
   - Create `.prettierrc.json`:
     ```json
     {
       "semi": true,
       "trailingComma": "es5",
       "singleQuote": true,
       "printWidth": 100,
       "tabWidth": 2,
       "arrowParens": "always"
     }
     ```
   - Create `.prettierignore`:
     ```
     node_modules
     .expo
     dist
     build
     coverage
     ios
     android
     ```

7. **Configure Jest**:
   - Create `jest.config.js`:
     ```javascript
     module.exports = {
       preset: 'jest-expo',
       transformIgnorePatterns: [
         'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
       ],
       setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
       collectCoverageFrom: [
         'src/**/*.{ts,tsx}',
         'app/**/*.{ts,tsx}',
         '!**/*.stories.tsx',
         '!**/*.test.{ts,tsx}',
       ],
     };
     ```

8. **Configure Detox**:
   - Create `.detoxrc.js`:
     ```javascript
     module.exports = {
       testRunner: {
         args: {
           $0: 'jest',
           config: 'e2e/jest.config.js',
         },
         jest: {
           setupTimeout: 120000,
         },
       },
       apps: {
         'ios.debug': {
           type: 'ios.app',
           binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Gagyo.app',
           build: 'xcodebuild -workspace ios/Gagyo.xcworkspace -scheme Gagyo -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
         },
         'android.debug': {
           type: 'android.apk',
           binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
           build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
         },
       },
       devices: {
         simulator: {
           type: 'ios.simulator',
           device: {
             type: 'iPhone 15 Pro',
           },
         },
         emulator: {
           type: 'android.emulator',
           device: {
             avdName: 'Pixel_7_API_34',
           },
         },
       },
       configurations: {
         'ios.debug': {
           device: 'simulator',
           app: 'ios.debug',
         },
         'android.debug': {
           device: 'emulator',
           app: 'android.debug',
         },
       },
     };
     ```

9. **Create environment template files**:
   - Create `.env.example`:
     ```
     # Supabase
     SUPABASE_URL=YOUR_SUPABASE_URL_HERE
     SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
     
     # Sentry
     SENTRY_DSN=YOUR_SENTRY_DSN_HERE
     
     # PostHog
     POSTHOG_API_KEY=YOUR_POSTHOG_KEY_HERE
     POSTHOG_HOST=YOUR_POSTHOG_HOST_HERE
     ```
   - Verify `.env` is in `.gitignore` (already present ✓)

10. **Update documentation**:
    - Update `file:claude_docs/08_running_the_project.md` with:
      - Bun installation instructions
      - Environment setup steps
      - Development server startup
      - Testing commands
    - Update `file:agent_docs/04_release_and_ci.md` with:
      - CI pipeline overview
      - GitHub Secrets requirements
      - Deployment workflow (placeholder for later phases)

**Exit Criteria**:
- Bun is configured and documented
- ESLint enforces i18n rules and TypeScript strictness
- TypeScript strict mode is enabled with additional checks
- CI pipeline runs lint, type-check, unit tests, and secret scanning
- Prettier and Jest are configured
- Detox is configured for iOS and Android
- Environment template files exist
- All configuration is documented
- Frontend_Expert and Quality_Assurance_Manager verify completeness

---

## Validation and Sign-off

**Final Checklist**:
- [ ] Domain ontology in `file:claude_docs/01_domain_glossary.md` is complete with all entities in structured format
- [ ] Architecture specs in `file:claude_docs/03_service_architecture.md` and `file:claude_docs/04_multi_tenant_model.md` are complete
- [ ] New architecture documents created: `file:claude_docs/10_state_management.md`, `file:claude_docs/11_i18n_architecture.md`
- [ ] All required dependencies are installed in `file:package.json`
- [ ] Bun runtime is configured and documented
- [ ] ESLint enforces i18n and TypeScript rules
- [ ] CI pipeline skeleton is functional
- [ ] All configuration files are created and documented
- [ ] Product_Manager, Backend_Expert, Frontend_Expert, Design_System_Manager, and Quality_Assurance_Manager sign off

**Artifacts Produced**:
- Updated `file:claude_docs/01_domain_glossary.md` with complete ontology
- Updated `file:claude_docs/03_service_architecture.md` with service boundaries and Edge Functions
- Updated `file:claude_docs/04_multi_tenant_model.md` with complete schema
- New `file:claude_docs/10_state_management.md`
- New `file:claude_docs/11_i18n_architecture.md`
- Updated `file:package.json` with all dependencies
- Updated `file:eslint.config.js` with i18n rules
- Updated `file:tsconfig.json` with additional strict checks
- New `.github/workflows/ci.yml`
- New `.github/workflows/e2e.yml`
- New `.prettierrc.json`
- New `jest.config.js`
- New `.detoxrc.js`
- New `.env.example`
- Updated `file:claude_docs/08_running_the_project.md`
- Updated `file:agent_docs/04_release_and_ci.md`

**Handoff to Next Phase**:
This phase establishes the foundation for all subsequent work. Phase 2 (Backend Foundation) can begin immediately after sign-off, using the complete schema definitions and RLS policies from `file:claude_docs/04_multi_tenant_model.md`. Phase 3 (Design System) can begin using the Tamagui dependencies and configuration. Phase 4 (i18n Infrastructure) can begin using the i18n architecture spec and installed dependencies.