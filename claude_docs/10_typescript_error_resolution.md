---
tags: [typescript, build, i18n, tamagui, tests, auth]
---

# 10 TypeScript Error Resolution

## WHAT
Stabilize TypeScript type-checking by aligning Tamagui configuration with token usage,
standardizing i18n namespace keys, tightening test helper typings, and resolving missing
imports/exports for UI and hooks across auth, tabs, and settings.

## WHY
- `bun run typecheck` fails due to mismatched Tamagui tokens, i18n typings, and strict test typings.
- Auth + tab UI should remain Tamagui-first with i18n-only user strings and consistent token usage.
- Integration/unit tests should compile without `unknown` or `never` inference masking data flow.
- Edge functions remain Deno-only and should stay outside the React Native TS pipeline.

## HOW

### Tamagui Tokens + Shorthands
- Add semantic font size tokens (`xs` → `6xl`) to match existing `$sm`, `$xl`, `$2xl` usage.
- Remove non-shorthand aliases (e.g., `flex`, `shadowOffset`) that block style props typing.
- Keep existing size/space tokens and shorthands that are actively used.

### Auth + Tabs UI Imports
- Add a UI barrel file (`src/components/ui/index.ts`) to resolve `@/components/ui` imports.
- Keep visual layout unchanged; only align props with supported Tamagui tokens and variants.

### i18n Namespaces + Typing
- Introduce an `images` namespace (move `common.images` keys into `images.json`).
- Keep dot-separated namespace keys (`auth.sign_in`, `prayer.answered`) with `nsSeparator='.'`.
- Update i18n type augmentation to use actual resource shapes for strict key typing.

### Auth UI (Login / Signup / Tenant Selection)
- Continue using design-system components (`Text`, `Heading`, `Input`, `Button`).
- Use `i18nKey`/`labelKey`/`placeholderKey` for all user-facing text.
- Keep testIDs and navigation behavior unchanged.

### i18n & Key Usage
- Continue using `namespace.key` format (`auth.sign_in`, `prayer.answered`, `images.title`).
- Keep `nsSeparator='.'` and `keySeparator='.'` to support namespace dot notation.
- Maintain parity between `locales/en` and `locales/ko` for any new keys.

### Tamagui Config
- Extend `fonts` size/lineHeight maps with semantic size keys.
- Keep `allowedStyleValues` within supported options.
- Ensure shorthands only include real abbreviations.

### Tests & Helpers
- Update Supabase SQL helpers to return typed row records instead of `unknown`.
- Fix test mocks (expo-file-system, Supabase storage/database) to match current SDK types.
- Use `.select()` or safe optional chaining where Supabase responses may be empty.
- Normalize jest mock typings to avoid `global.jest.*` and `never` inference.

### Supabase Edge Functions
- Exclude `supabase/functions/**` from the app TypeScript config.
- Deno-based tests remain runnable via `deno test` within `supabase/functions/...`.

## Flows
- Auth flow remains: login/signup -> auth guard -> tenant selection -> tabs.
- No new screens or routing changes introduced.

## Tenant Scope
- No changes to tenant isolation rules or auth scoping.
- Test helpers remain tenant-aware.

## Test Implications
- `bun run typecheck` should pass after fixes.
- Run targeted tests where touched:
  - `bun test src/lib/__tests__/imageUpload.test.ts`
  - `bun test __tests__/integration/tenant-selection.test.tsx`
  - `bun test __tests__/integration/pastoral-journal-rls.test.ts`
  - `bun test __tests__/integration/settings-profile.test.ts`
  - `bun test src/features/settings/hooks/__tests__/useUpdateProfile.test.ts`
- Deno edge-function tests run separately:
  - `deno test --allow-all supabase/functions/<function>/<function>.test.ts`

## Figma References
- No visual changes intended; validate against the existing auth + tab flows:
  - https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=156-1028
  - https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=38-643

## Acceptance Criteria
- Given `bun run typecheck`, when the command finishes, then it exits with code 0.
- Given auth, tabs, images, and settings screens, when they render, then all text comes from i18n keys and no layout changes are introduced.
- Given integration/unit tests touched in this spec, when executed, then they compile without `unknown`/`never` type errors.

## Test Plan
### Unit Tests
- [ ] Settings hooks (`useUpdateProfile`, `useDeleteAccount`, `useUploadProfilePhoto`)
- [ ] Image upload helper (`src/lib/__tests__/imageUpload.test.ts`)

### Integration Tests
- [ ] Tenant selection integration test compiles and runs
- [ ] Settings profile integration test compiles and runs

### E2E Tests
- [ ] Not in scope for this TS-only fix (no behavior changes)
