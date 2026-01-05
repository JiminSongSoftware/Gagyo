---
tags: [conventions, typescript, react-native, tamagui, testing]
---

# 02 Code Conventions

## WHAT
Code style + structural conventions for React Native + TypeScript, with a bias toward testability and Tamagui reuse.

## WHY
- Predictability for multi-agent development.
- Enables stable refactors and consistent reviews.

## HOW

### TypeScript Strictness
- Prefer explicit types at boundaries (function params, return types, API responses)
- Enable strict mode in tsconfig.json
- Avoid `any` type; use `unknown` with type guards when necessary

### Tamagui-First UI
- Extend/wrap Tamagui components; avoid workaround-first behavior
- Use Tamagui tokens for spacing, colors, and typography
- Build custom components on top of Tamagui primitives
- If a component is missing, create it using Tamagui foundations (do not bypass the system)

### Storybook Requirement
- Required for every new component (mobile + web views)
- Document props, variants, and usage examples
- Include accessibility considerations

### Feature-First Structure
```
src/features/chat/*
src/features/tenants/*
src/features/push/*
src/features/prayer/*
src/features/pastoral-journal/*
src/features/auth/*
src/features/settings/*
```

### Component Structure
```
src/components/ui/*        # Shared UI components
src/components/forms/*     # Form components
src/components/layout/*    # Layout components
```

### Testing Conventions
- Tests co-located in `__tests__` directories within feature folders
- Naming: `ComponentName.test.tsx`, `functionName.test.ts`
- Deterministic tests: no network unless explicitly integration/E2E
- Mock external dependencies consistently

### State Management
- Jotai: Local/feature-scoped atoms
- Zustand: Global session and UI state
- Avoid prop drilling; use context or state management

### Naming Conventions
- Components: PascalCase (`ChatMessage.tsx`)
- Hooks: camelCase with `use` prefix (`useTenantContext.ts`)
- Utils: camelCase (`formatDate.ts`)
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase with descriptive names

### Import Order
1. React/React Native imports
2. External library imports
3. Internal absolute imports
4. Relative imports
5. Type imports

---

## i18n Standards

### No Hardcoded UI Strings
- All user-facing text must use the i18n system
- Exceptions (explicitly allowed):
  - Debug logs and console output
  - Error messages in catch blocks (for logging only)
  - Test assertions
- Components must import and use translation hooks

### Translation Key Naming Convention
```
<feature>.<component>.<element>

Examples:
chat.message_input.placeholder
prayer.card.answered_button
settings.profile.save_button
auth.login.email_label
common.button.cancel
common.error.network_failed
```

### Message Catalog Location
```
src/i18n/locales/
  en/
    common.json
    chat.json
    auth.json
  ko/
    common.json
    chat.json
    auth.json
```

### Catalog Structure
Each namespace file contains keys for that domain:
```json
{
  "app_name": "Gagyo",
  "home": "Home",
  "loading": "Loading...",
  "error": "Error",
  "success": "Success",
  "confirm": "Confirm",
  "cancel": "Cancel",
  "save": "Save",
  "delete": "Delete",
  "edit": "Edit"
}
```

### Component-Based i18n Usage
All UI components enforce i18n via props (no hardcoded strings, no children):

```tsx
// ✅ Correct: Use i18nKey prop
<Text i18nKey="common.app_name" />
<Heading level="h1" i18nKey="common.home" />
<Button labelKey="common.save" />
<Input labelKey="auth.login.email_label" placeholderKey="auth.login.email_placeholder" />

// ❌ Incorrect: Hardcoded strings
<Text>Hello World</Text>
<Button>Save</Button>
```

### Translation Keys in Components
```typescript
// Text component
interface TextProps {
  i18nKey: string;           // Required
  i18nParams?: Record<string, string | number | boolean>;  // For interpolation
  variant?: 'body' | 'caption' | 'label';
  size?: 'sm' | 'md' | 'lg';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
}

// Button component
interface ButtonProps {
  labelKey: string;          // Required
  Icon?: IconProps;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}
```

### Fallback Behavior
1. Look up key in current locale (`ko`)
2. If missing, fall back to `en`
3. If still missing:
   - Development: Show key with warning prefix `[MISSING: key.name]`
   - Production: Show empty string and log error

### Missing Key Handling
```typescript
// Development: visible warning
// Production: silent fallback + error logging
const t = useTranslation();
t('missing.key'); // Returns "[MISSING: missing.key]" in dev
```

### Interpolation
```typescript
// Translation file
{ "greeting": "Hello, {name}!" }

// Usage
t('greeting', { name: userName })
```

### Rich Text / Formatting
```typescript
// For bold, links, etc., use Trans component
// Translation file (locales/en/common.json)
{
  "terms": "By continuing, you agree to our <link>Terms of Service</link>.",
  "welcome": "Welcome, <bold>{{name}}</bold>!"
}

// Usage with Trans component for rich formatting
import { Trans } from '@/components/ui/Trans';

<Trans
  i18nKey="common.terms"
  components={{ link: <Link href="/terms" /> }}
/>

<Trans
  i18nKey="common.welcome"
  i18nParams={{ name: 'John' }}
  components={{ bold: <Text style={{ fontWeight: 'bold' }} /> }}
/>
```

### When to Use Trans vs Text
- **Use `<Text i18nKey="..." />`** for:
  - Simple, single-line text
  - Text without formatting
  - Labels, buttons, headings
- **Use `<Trans i18nKey="..." />`** for:
  - Text with links (`<link>`)
  - Text with formatting (`<bold>`, `<italic>`)
  - Text with variable interpolation inside formatting
  - Multi-sentence paragraphs with inline elements

### Date/Number Formatting
```typescript
// Use locale-aware formatters from i18n utils
import { formatDate, formatNumber, formatRelativeTime } from '@/i18n/utils';

formatDate(new Date(), 'en');     // "Jan 15, 2024"
formatDate(new Date(), 'ko');     // "2024년 1월 15일"

formatNumber(1000, 'en');         // "1,000"
formatNumber(1000, 'ko');         // "1,000"

formatRelativeTime(-1, 'day', 'en');  // "yesterday"
formatRelativeTime(-1, 'day', 'ko');  // "어제"
```

### Lint/Test Requirements
- **ESLint rule**: Warn on hardcoded strings in JSX
- **CI check**: Fail build if any key exists in one locale but not another
- **Pre-commit hook**: Validate JSON syntax of locale files
- **Unit tests**: Test fallback behavior and interpolation
