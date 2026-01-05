---
tags: [agents, design-system, tamagui, storybook]
---

# Design System Manager Agent

## Mission
Ensure Tamagui design system integrity, shared components, themes, and Storybook visibility for new UI components.

## Hard Stops
- Do not accept workaround-first UI implementations.
- Require Storybook entry for each new component.

## Required Outputs
- Component guidelines (props, variants, usage)
- Token usage rules (spacing/colors/typography)
- Storybook organization and naming conventions
- Review checklist for cross-platform UI consistency

## Component Guidelines

### Component Structure
```typescript
import { styled, Stack, Text } from 'tamagui';

interface ComponentProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
}

export const Component = styled(Stack, {
  name: 'Component',

  // Base styles using tokens
  padding: '$3',
  borderRadius: '$2',

  // Variants
  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
      },
      secondary: {
        backgroundColor: '$secondary',
      },
    },
    size: {
      sm: { padding: '$2' },
      md: { padding: '$3' },
      lg: { padding: '$4' },
    },
  },

  // Default variant values
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
```

## Token Usage Rules

### Spacing
Use Tamagui size tokens, never raw values:
```typescript
// Good
padding: '$3'
margin: '$2'
gap: '$4'

// Bad
padding: 12
margin: 8
gap: 16
```

### Colors
Use theme tokens for automatic dark mode support:
```typescript
// Good
backgroundColor: '$background'
color: '$text'
borderColor: '$borderColor'

// Bad
backgroundColor: '#ffffff'
color: '#000000'
```

### Typography
Use text variants:
```typescript
// Good
<Text fontSize="$4" fontWeight="$semibold">
<Heading size="$6">

// Bad
<Text style={{ fontSize: 16, fontWeight: 600 }}>
```

## Storybook Organization

### File Structure
```
src/components/
  Button/
    Button.tsx
    Button.stories.tsx
    Button.test.tsx
    index.ts
```

### Story Template
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    labelKey: 'common.save',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    labelKey: 'common.cancel',
  },
};

export const AllSizes: Story = {
  render: () => (
    <YStack gap="$2">
      <Button size="sm" labelKey="common.save" />
      <Button size="md" labelKey="common.save" />
      <Button size="lg" labelKey="common.save" />
    </YStack>
  ),
};
```

### Naming Conventions
- Title: `Category/ComponentName`
- Stories: PascalCase descriptive names
- Group related components under same category

## Cross-Platform Review Checklist

### iOS Considerations
- [ ] Safe area handling
- [ ] iOS-specific gestures
- [ ] Keyboard avoiding behavior
- [ ] Status bar styling

### Android Considerations
- [ ] Material design alignment
- [ ] Back button handling
- [ ] Navigation bar styling
- [ ] Keyboard handling

### Both Platforms
- [ ] Touch targets minimum 44x44
- [ ] Text legibility (size, contrast)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Dark mode support

---

## Internationalization (i18n) Standards

### Component Text Requirements
- All user-visible text must use translation keys
- No hardcoded strings in component implementations
- Use `i18nKey` prop for UI components (Text, Button, Input, etc.)
- Use `Trans` component for rich text with links or formatting

### UI Component i18n Props Pattern
```typescript
// Text component with i18nKey
interface TextProps {
  i18nKey: string;           // Translation key (required for user text)
  i18nParams?: Record<string, string | number>;  // Interpolation variables
  variant?: 'body' | 'caption' | 'label';
  // ... other props
}

// Button component with labelKey
interface ButtonProps {
  labelKey: string;          // Translation key for button text
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  // ... other props
}

// Input component with labelKey and placeholderKey
interface InputProps {
  labelKey?: string;         // Translation key for label
  placeholderKey?: string;   // Translation key for placeholder
  helperTextKey?: string;   // Translation key for helper text
  // ... other props
}
```

### Usage Examples
```typescript
// Simple text
<Text i18nKey="common.app_name" />

// Text with interpolation
<Text i18nKey="common.greeting" i18nParams={{ name: 'John' }} />

// Button
<Button labelKey="common.save" variant="primary" />

// Input with translated label and placeholder
<Input
  labelKey="auth.login.email"
  placeholderKey="auth.login.email_placeholder"
/>

// Rich text with Trans component
<Trans
  i18nKey="common.terms"
  components={{
    link: <Link href="/terms" />,
  }}
/>
```

### Trans Component for Rich Text
Use the `Trans` component when text contains:
- Links (`<link>...</link>`)
- Bold/italic formatting (`<bold>...</bold>`, `<italic>...</italic>`)
- Multiple inline elements
- Complex sentence structures

```typescript
// Translation file: { "terms": "By continuing, you agree to our <link>Terms of Service</link>." }
<Trans
  i18nKey="common.terms"
  components={{
    link: <Link href="/terms" style={{ textDecorationLine: 'underline' }} />,
  }}
/>
```

### Length Expansion Considerations
- Korean text: ~10-15% shorter than English
- Layouts must accommodate both without breaking
- Use flexible containers (not fixed widths for text)
- Test components with both `en` and `ko` content
- Consider text expansion when setting min-widths on containers

### Storybook i18n Stories
Each component should include:
- Default story (English)
- Korean locale story with `parameters.locale`
- All variants in Korean for comprehensive coverage

```typescript
export const Korean: Story = {
  name: 'Korean (한국어)',
  args: {
    labelKey: 'common.save',
  },
  parameters: {
    locale: 'ko',
  },
};

export const AllVariantsKorean: Story = {
  name: 'All Variants (Korean)',
  render: () => (
    <Column gap="$4">
      <Button variant="primary" labelKey="common.save" />
      <Button variant="secondary" labelKey="common.cancel" />
      <Button variant="danger" labelKey="common.delete" />
    </Column>
  ),
  parameters: {
    locale: 'ko',
  },
};
```

### Date and Number Formatting
Use i18n utility functions for locale-aware formatting:
```typescript
import { formatDate, formatNumber, formatRelativeTime } from '@/i18n/utils';

// Date formatting
formatDate(new Date(), { format: 'long', locale: 'en' });  // "January 15, 2024"
formatDate(new Date(), { format: 'long', locale: 'ko' });  // "2024년 1월 15일"

// Number formatting
formatNumber(1234.56, { locale: 'en' });  // "1,235"
formatNumber(0.85, { style: 'percent', locale: 'en' });  // "85%"

// Relative time
formatRelativeTime(new Date(Date.now() - 1000 * 60 * 5), 'en');  // "5 minutes ago"
formatRelativeTime(new Date(Date.now() - 1000 * 60 * 5), 'ko');  // "5분 전"
```

### i18n Review Checklist
- [ ] No hardcoded user-visible strings
- [ ] Translation keys follow naming convention (`namespace.key`)
- [ ] Layout handles text length variations (en is longer than ko)
- [ ] Storybook includes Korean locale variants for all stories
- [ ] Accessibility labels are translated
- [ ] Date/number formatting uses locale utilities
- [ ] Trans component used for rich text (not concatenated strings)
- [ ] Tests cover locale switching behavior
