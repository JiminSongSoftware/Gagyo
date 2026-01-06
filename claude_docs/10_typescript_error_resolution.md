---
tags: [typescript, build, i18n, tamagui, tests, auth]
---

# 10 TypeScript Error Resolution

## WHAT
Stabilize TypeScript type-checking by aligning auth UI components with the design system,
standardizing i18n key usage, tightening test helper typings, and isolating Deno-only
Supabase functions from the React Native type-check pipeline.

## WHY
- `bun run typecheck` currently fails due to type errors across auth screens, tests,
  and Deno edge functions.
- Auth UI must follow i18n-first UI component conventions (no hardcoded children text).
- Integration/unit tests should compile with strict typing without masking runtime issues.
- Deno edge functions should be typechecked with Deno tooling, not the app TypeScript config.

## HOW

### Auth UI (Login / Signup / Tenant Selection)
- Replace direct Tamagui primitives with design-system components (`Text`, `Heading`, `Input`, `Button`).
- Use `i18nKey`/`labelKey`/`placeholderKey` props for all user-facing text.
- Keep testIDs and navigation behavior unchanged.
- Ensure error alerts use namespace-qualified auth keys (e.g., `auth.invalid_credentials`).

### i18n & Key Usage
- Continue using `namespace.key` format (`common.home_screen.welcome`, `auth.sign_in`).
- Provide defaultValue fallbacks where needed in non-component usage (alerts, tab titles).
- Maintain parity between `locales/en` and `locales/ko` for any new keys.

### Tamagui Config
- Use supported imports from `tamagui` for `createFont` and `createTokens`.
- Remove unsupported `settings` fields (web/native maps, strict props toggles) and
  use valid `allowedStyleValues` settings.

### Tests & Helpers
- Update Supabase SQL helpers to return typed row records instead of `unknown`.
- Fix test mocks (expo-file-system, Supabase storage/database) to match current SDK types.
- Use `.select()` or safe optional chaining where Supabase responses may be empty.

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
- Deno edge-function tests run separately:
  - `deno test --allow-all supabase/functions/<function>/<function>.test.ts`

## Figma References
- No visual changes intended; no Figma updates required.
