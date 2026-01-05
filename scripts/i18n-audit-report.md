# i18n Translation Audit Report

**Generated:** 2025-01-04  
**Status:** ✅ PASSED

## Summary

All translation keys have parity between English and Korean locales. All JSON files are valid.

## Namespace Breakdown

| Namespace | English Keys | Korean Keys | Status |
|-----------|--------------|-------------|--------|
| `common.json` | 37 keys | 37 keys | ✅ Parity |
| `auth.json` | 26 keys | 26 keys | ✅ Parity |
| `chat.json` | 38 keys | 38 keys | ✅ Parity |
| `errors.json` | 22 keys | 22 keys | ✅ Parity |
| `pastoral.json` | 36 keys | 36 keys | ✅ Parity |
| `prayer.json` | 34 keys | 34 keys | ✅ Parity |
| `settings.json` | 41 keys | 41 keys | ✅ Parity |

**Total:** 234 translation keys per language

## Recent Additions

The following keys were added during this audit:

### common.json (New Keys)
- `home` - "Home" / "홈"
- `menu` - "Menu" / "메뉴"
- `logout` - "Log Out" / "로그아웃"
- `welcome` - "Welcome" / "환영합니다"
- `greeting` - "Hello, {{name}}" / "{{name}}님 안녕하세요"
- `terms` - Rich text for Terms of Service agreement (with `<link>` tag)

## Special Keys

### Intentional English-Only Keys
- `common.test_fallback_key` - Used in tests to verify fallback behavior

## Validation Scripts

Two validation scripts are available:

1. **TypeScript version:** `scripts/check-i18n.ts` (requires bun or tsx)
2. **JavaScript version:** `scripts/check-i18n-js.mjs` (runs with plain node)

## Pre-Commit Hooks

The pre-commit hook (`.husky/pre-commit`) automatically runs:
- `lint-staged` for code formatting
- `i18n:validate` script for translation parity check

## Next Steps

1. ✅ Audit complete - all keys have parity
2. Run full i18n validation suite
3. Test locale switching end-to-end
4. Verify CI pipeline includes i18n checks
