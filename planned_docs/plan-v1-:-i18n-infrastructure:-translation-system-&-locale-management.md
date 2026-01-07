I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

## Observations

The i18n infrastructure is **substantially complete** with i18next, react-i18next, translation files for en/ko, enforced i18nKey props in UI components, ESLint rules, and a validation script. However, critical gaps remain: missing `date-fns` dependency, uninitialized i18n in App.tsx and Storybook, no Trans component for rich text, CI validation doesn't fail builds, missing comprehensive tests for fallback/persistence, and no pre-commit hooks or developer documentation for adding translations.

## Approach

Complete the i18n system by addressing infrastructure gaps (dependencies, initialization), enhancing validation (strict CI, pre-commit hooks), implementing missing features (Trans component, Storybook locale switcher), expanding test coverage (fallback, persistence, E2E), and documenting workflows. This ensures full compliance with the non-negotiable i18n requirements while maintaining the existing component-based i18nKey pattern and SDD → TDD → DDD discipline.

## Implementation Steps

### 1. Fix Missing Dependencies and Configuration

**Add missing date-fns package**
- Add `date-fns` to `file:package.json` dependencies (required by `file:src/i18n/utils.ts`)
- Run `bun install` to update lockfile
- Verify import paths in `file:src/i18n/utils.ts` work correctly

**Configure eslint-plugin-i18n-json**
- Add eslint-plugin-i18n-json configuration to `file:eslint.config.js`
- Configure rules to validate JSON structure and key consistency across locales
- Set up to check `locales/en/*.json` and `locales/ko/*.json` files
- Ensure it runs as part of `bun run lint`

**Update CI to fail on i18n validation errors**
- Modify `file:.github/workflows/ci.yml` i18n-validate job
- Remove `|| true` from `bun run i18n:validate` command
- Make the job fail if translation keys are missing or mismatched
- Add explicit error reporting for missing keys

---

### 2. Initialize i18n System Properly

**Initialize i18n in App.tsx**
- Import and call `initI18n()` from `file:src/i18n/index.ts` before rendering
- Wrap app with `I18nextProvider` from react-i18next
- Add loading state while i18n initializes
- Sync with `usePreferencesStore` to restore saved locale preference
- Handle hydration state from preferences store

**Fix Storybook i18n initialization**
- Update `file:.storybook/preview.tsx` to call `initI18n()` before rendering stories
- Ensure i18n is fully initialized before I18nextProvider wraps stories
- Add error boundary for i18n initialization failures

**Create locale initialization utility**
- Create `file:src/i18n/init.ts` with initialization logic
- Handle device locale detection → preferences store → i18n.changeLanguage
- Export reusable initialization function for App and Storybook
- Add error handling and fallback to 'en' if initialization fails

---

### 3. Implement Trans Component for Rich Text

**Create Trans component wrapper**
- Create `file:src/components/ui/Trans.tsx` wrapping react-i18next's Trans
- Support i18nKey prop pattern consistent with Text/Heading components
- Allow component interpolation for links, bold, etc.
- Type-safe props with i18nParams for variable substitution

**Add Trans component tests**
- Create `file:src/components/ui/__tests__/Trans.test.tsx`
- Test basic text rendering with i18nKey
- Test component interpolation (e.g., `<link>` → `<Link>`)
- Test variable substitution with i18nParams
- Test fallback behavior when key is missing

**Add Trans component Storybook stories**
- Create `file:src/components/ui/Trans.stories.tsx`
- Show examples with links, bold text, and variable interpolation
- Include both en and ko locale examples
- Document usage patterns in story descriptions

**Update code conventions documentation**
- Add Trans component usage to `file:claude_docs/02_code_conventions.md`
- Document when to use Trans vs Text component
- Provide examples of rich text patterns
- Add to component guidelines in `file:agents/Design_System_Manager.md`

---

### 4. Enhance Storybook i18n Support

**Create locale switcher decorator**
- Create `file:.storybook/decorators/withLocale.tsx`
- Implement decorator that wraps stories with locale context
- Add UI control to switch between en/ko in Storybook
- Persist locale selection in Storybook state

**Update Storybook preview configuration**
- Add locale switcher decorator to `file:.storybook/preview.tsx`
- Configure global locale parameter with en/ko options
- Add locale toolbar item for easy switching
- Document usage in Storybook addon panel

**Update component stories with locale variants**
- Update `file:src/components/ui/Text.stories.tsx` with proper Korean story using decorator
- Update `file:src/components/ui/Button.stories.tsx` with locale variants
- Update `file:src/components/ui/Input.stories.tsx` with locale variants
- Update `file:src/components/ui/Heading.stories.tsx` with locale variants
- Add "Long Text" stories to test layout with both locales

---

### 5. Expand Test Coverage

**Add comprehensive fallback tests**
- Update `file:src/i18n/__tests__/i18n.test.ts`
- Test ko → en fallback when Korean key is missing
- Test en → key display fallback when English key is missing
- Test development vs production fallback behavior (warning vs silent)
- Test missing key logging in development mode

**Add locale switching and persistence tests**
- Create `file:src/hooks/__tests__/useLocale.test.ts`
- Test locale switching with `changeLocale()`
- Test persistence to AsyncStorage via preferences store
- Test locale restoration on app restart
- Test device locale detection on first launch

**Add component i18n integration tests**
- Update `file:src/components/ui/__tests__/Text.test.tsx`
- Test locale switching updates rendered text
- Test missing key fallback in components
- Test interpolation with i18nParams
- Add snapshot tests for both en and ko locales

**Add utility function tests**
- Update `file:src/i18n/__tests__/i18n.test.ts`
- Fix existing formatRelativeTime tests (signature mismatch)
- Test formatDate with both locales and all format options
- Test formatNumber with both locales and style options
- Test edge cases (null, undefined, invalid dates)

**Add E2E tests for i18n flows**
- Create `file:e2e/i18n.test.ts`
- Test locale switching in Settings screen
- Test UI updates immediately after locale change
- Test locale persistence across app restarts
- Test critical flows in both en and ko locales (auth, chat)

---

### 6. Add Pre-commit Hooks and Validation

**Set up Husky for pre-commit hooks**
- Add `husky` to devDependencies in `file:package.json`
- Initialize Husky with `bunx husky init`
- Create `.husky/pre-commit` hook

**Add pre-commit i18n validation**
- Configure pre-commit hook to run `bun run i18n:validate`
- Add JSON syntax validation for locale files
- Add check for hardcoded strings in staged files (grep for common patterns)
- Fail commit if validation errors are found

**Add lint-staged for targeted checks**
- Add `lint-staged` to devDependencies
- Configure to run ESLint on staged `.tsx` files
- Configure to run Prettier on staged files
- Configure to run i18n validation if locale files changed

---

### 7. Create Developer Documentation

**Create i18n developer guide**
- Create `file:claude_docs/11_i18n_architecture.md` (already exists, update it)
- Document how to add new translation keys
- Document translation key naming conventions
- Document how to use Text, Button, Input, Heading, Trans components
- Document how to test i18n in components
- Document how to add new locales (future-proofing)

**Add i18n workflow to dev docs**
- Update `file:agent_docs/02_dev_workflow.md`
- Add section on i18n workflow: key creation → translation → validation
- Document how to run i18n:validate locally
- Document how to fix missing key errors
- Document how to test locale switching

**Update Design System Manager agent docs**
- Update `file:agents/Design_System_Manager.md`
- Add i18n checklist to component review process
- Document Storybook locale testing requirements
- Add examples of i18n-compliant component patterns

---

### 8. Add Missing Translation Keys

**Audit existing components for missing keys**
- Run `bun run i18n:validate` to identify missing keys
- Check all UI components for hardcoded strings
- Run ESLint to find hardcoded string warnings
- Create list of missing keys by namespace

**Add missing keys to translation files**
- Add missing keys to `file:locales/en/common.json`
- Add missing keys to `file:locales/ko/common.json`
- Add missing keys to other namespace files as needed
- Ensure key parity between en and ko

**Add character count translation key**
- Add `character_count` key to common.json (already exists)
- Implement character count display in TextArea component
- Use i18n for character count label with interpolation
- Test with both locales

---

### 9. Validation and Quality Assurance

**Run full i18n validation suite**
- Run `bun run i18n:validate` and fix all errors
- Run `bun run lint` and fix hardcoded string warnings
- Run `bun run test` and ensure all i18n tests pass
- Run `bun run type-check` to verify TypeScript types

**Test locale switching end-to-end**
- Use `rn-debugger` MCP to inspect runtime i18n state
- Use `ios-simulator` MCP to capture screenshots of both locales
- Verify all screens render correctly in both en and ko
- Verify locale persistence across app restarts
- Verify fallback behavior when keys are missing

**Verify CI pipeline**
- Push changes and verify CI passes
- Verify i18n-validate job fails if keys are missing
- Verify lint job catches hardcoded strings
- Verify test job runs i18n tests successfully

---

### 10. Update SKILL.md Context

**Document i18n implementation learnings**
- Update `file:skills/SKILL.md` with i18n system architecture
- Document component-based i18nKey pattern rationale
- Document fallback behavior and why it's important
- Document common pitfalls and how to avoid them
- Document testing strategies for i18n

**Document MCP usage for i18n validation**
- Document how `context7` MCP was used to verify i18next best practices
- Document how `expo-docs` MCP was used to verify Expo Localization API
- Document debugging techniques with `rn-debugger` MCP

---

## Subagents Involved

- **Design_System_Manager**: Component i18n patterns, Storybook locale support, Trans component design
- **Frontend_Expert**: i18n initialization, hooks implementation, component integration, E2E tests
- **Quality_Assurance_Manager**: Test coverage expansion, validation scripts, CI configuration, pre-commit hooks
- **Product_Manager**: Translation key structure, namespace organization, developer documentation

---

## MCPs Used

- **context7**: Consult i18next and react-i18next documentation for best practices
- **expo-docs**: Verify Expo Localization API usage and device locale detection
- **rn-debugger**: Inspect runtime i18n state, verify locale switching, debug fallback behavior
- **ios-simulator**: Capture screenshots of both locales, verify UI rendering, test locale persistence

---

## Exit Criteria

- ✅ All dependencies installed (date-fns, husky, lint-staged)
- ✅ i18n initialized in App.tsx and Storybook preview
- ✅ Trans component implemented with tests and stories
- ✅ Storybook locale switcher decorator working
- ✅ All component stories include locale variants
- ✅ Comprehensive test coverage for fallback, persistence, and locale switching
- ✅ Pre-commit hooks validate i18n on every commit
- ✅ CI fails build if translation keys are missing
- ✅ Developer documentation complete with examples
- ✅ All existing hardcoded strings replaced with i18n keys
- ✅ `bun run i18n:validate` passes with zero errors
- ✅ `bun run lint` passes with zero hardcoded string warnings
- ✅ `bun run test` passes with 90%+ coverage for i18n code
- ✅ E2E tests verify locale switching in both iOS and Android
- ✅ SKILL.md updated with i18n learnings and context