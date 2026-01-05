---
tags: [design-system, tamagui, components, ui]
---

# 13 Design System

## WHAT
The Gagyo design system built on Tamagui, providing type-safe, themeable UI components with enforced i18n.

## WHY
- Consistent visual language across the app
- Type-safe component props with autocomplete
- Compile-time optimizations via Tamagui
- Enforced internationalization prevents hardcoded strings
- Theme support (light/dark) out of the box

## Design Tokens

### Colors
Semantic color tokens for consistent theming:

```typescript
// Light theme
$primary      // #0EA5E9 (sky-500)
$secondary    // #6366F1 (indigo-500)
$success      // #22C55E (green-500)
$warning      // #F59E0B (amber-500)
$danger       // #EF4444 (red-500)
$info         // #3B82F6 (blue-500)

// Neutral colors
$color              // Primary text
$colorHover         // Secondary text
$colorFocus         // Tertiary text
$colorPress         // Disabled text
$background         // Primary background
$backgroundHover    // Secondary background
$backgroundFocus    // Tertiary background

// Border colors
$border             // Default border
$borderHover        // Hover border
$borderFocus        // Focus border
```

### Spacing
Consistent spacing scale using Tamagui tokens:

```typescript
'$0'  // 0px
'$1'  // 4px
'$2'  // 8px
'$3'  // 12px
'$4'  // 16px
'$5'  // 20px
'$6'  // 24px
'$8'  // 32px
'$10' // 40px
'$12' // 48px
```

### Typography
Type scale with consistent line heights and weights:

| Component | Size | Weight | Line Height | Usage |
|-----------|------|--------|-------------|-------|
| Heading h1 | 28px | bold | 32px | Page titles |
| Heading h2 | 24px | semibold | 28px | Section titles |
| Heading h3 | 20px | semibold | 24px | Subsection titles |
| Heading h4 | 18px | medium | 22px | Card titles |
| Text body | 16px | regular | 24px | Body text |
| Text caption | 14px | regular | 20px | Secondary text |
| Text label | 14px | medium | 20px | Form labels |

### Border Radius
```typescript
'$0'  // 0px   (no radius)
'$1'  // 2px   (small)
'$2'  // 4px   (default)
'$3'  // 6px   (medium)
'$4'  // 8px   (large)
'$5'  // 12px  (xlarge)
'$full' // 50%  (circular)
```

### Shadows
```typescript
'$1'  // Small elevation
'$2'  // Medium elevation
'$3'  // Large elevation
'$4'  // X-large elevation
```

## Core Components

### Container
Max-width container with optional centering and padding.

```tsx
import { Container } from '@/components/ui';

<Container padded>
  <Text i18nKey="common.app_name" />
</Container>

<Container maxWidth="md" centered>
  <Text i18nKey="common.home" />
</Container>
```

**Props:**
- `padded?: boolean` - Apply default padding
- `centered?: boolean` - Center content horizontally
- `maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Max width constraint
- All Tamagui Stack props

### Box
Generic container with variants for common patterns.

```tsx
import { Box, BorderedBox, ElevatedBox } from '@/components/ui';

<Box bg="$primary" p="$4" borderRadius="$2">
  <Text i18nKey="common.app_name" />
</Box>

<BorderedBox p="$4">
  <Text i18nKey="common.loading" />
</BorderedBox>

<ElevatedBox p="$4">
  <Text i18nKey="common.success" />
</ElevatedBox>
```

**Props:**
- `variant?: 'default' | 'card' | 'section' | 'inline'` - Pre-configured styles
- All Tamagui Stack props

### Row / Column
Flexible layout components for horizontal and vertical arrangement.

```tsx
import { Row, Column } from '@/components/ui';

<Row gap="$2" alignItems="center">
  <Text i18nKey="common.app_name" />
  <Text i18nKey="common.loading" />
</Row>

<Column gap="$4">
  <Text i18nKey="common.app_name" />
  <Text i18nKey="common.loading" />
</Column>

// Specialized variants
import { CenteredRow, SpacedRow, CenteredColumn, SpacedColumn } from '@/components/ui';

<CenteredRow height={50}>
  <Text i18nKey="common.app_name" />
</CenteredRow>

<SpacedRow>
  <Text i18nKey="common.cancel" />
  <Text i18nKey="common.confirm" />
</SpacedRow>
```

**Props:**
- `gap?: TokenValue` - Space between children
- `alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch'`
- `justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between'`
- All Tamagui XStack/YStack props

### Text
Text component with enforced i18n.

```tsx
import { Text } from '@/components/ui';

<Text i18nKey="common.app_name" />
<Text i18nKey="common.loading" variant="caption" color="muted" />
<Text i18nKey="common.confirm" weight="semibold" size="lg" color="primary" />
```

**Props:**
- `i18nKey: string` - **Required** translation key
- `i18nParams?: Record<string, string | number | boolean>` - Interpolation values
- `variant?: 'body' | 'caption' | 'label'` - Pre-configured styles
- `size?: 'sm' | 'md' | 'lg'` - Text size
- `weight?: 'regular' | 'medium' | 'semibold' | 'bold'` - Font weight
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'`

### Heading
Heading component with enforced i18n.

```tsx
import { Heading } from '@/components/ui';

<Heading level="h1" i18nKey="common.app_name" />
<Heading level="h2" i18nKey="common.home" color="secondary" />
<Heading level="h3" i18nKey="common.loading" weight="medium" />
```

**Props:**
- `i18nKey: string` - **Required** translation key
- `level: 'h1' | 'h2' | 'h3' | 'h4'` - Heading level
- `weight?: 'bold' | 'semibold' | 'medium' | 'regular'`
- `color?: 'primary' | 'secondary' | 'muted'`
- `truncated?: boolean` - Enable text truncation

### Button
Interactive button with variants and states.

```tsx
import { Button } from '@/components/ui';
import { Search, Plus } from '@tamagui/lucide-icons';

<Button variant="primary" size="md" labelKey="common.save" />
<Button variant="outline" size="sm" labelKey="common.cancel" />
<Button variant="danger" labelKey="common.delete" Icon={Trash2} iconPosition="trailing" />
<Button variant="primary" labelKey="common.loading" loading />
<Button variant="secondary" labelKey="common.confirm" disabled />
```

**Props:**
- `labelKey: string` - **Required** translation key for button text
- `variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'`
- `size?: 'sm' | 'md' | 'lg'`
- `Icon?: IconProps` - Lucide icon component
- `iconPosition?: 'leading' | 'trailing'`
- `loading?: boolean` - Show loading spinner
- `disabled?: boolean` - Disable interaction
- `onPress?: () => void`

### Input
Text input with label and validation states.

```tsx
import { Input } from '@/components/ui';
import { Mail } from '@tamagui/lucide-icons';

<Input labelKey="auth.login.email_label" placeholderKey="auth.login.email_placeholder" />
<Input labelKey="common.confirm" placeholderKey="common.loading" secureTextEntry Icon={Lock} />
<Input labelKey="common.app_name" error helperTextKey="common.error" />
<Input labelKey="common.home" success helperTextKey="common.success" />
```

**Props:**
- `labelKey?: string` - Translation key for label
- `placeholderKey?: string` - Translation key for placeholder
- `variant?: 'default' | 'filled' | 'outline'`
- `error?: boolean` - Show error state
- `success?: boolean` - Show success state
- `helperTextKey?: string` - Translation key for helper text
- `Icon?: IconProps` - Icon component
- `disabled?: boolean`
- `value?: string`
- `onChangeText?: (text: string) => void`

### TextArea
Multi-line text input with auto-resize.

```tsx
import { TextArea } from '@/components/ui';

<TextArea
  labelKey="common.app_name"
  placeholderKey="common.loading"
  rows={4}
/>

<TextArea
  labelKey="common.home"
  autoResize
  minHeight={80}
  maxLength={200}
  showCharacterCount
/>
```

**Props:**
- `labelKey?: string` - Translation key for label
- `placeholderKey?: string` - Translation key for placeholder
- `variant?: 'default' | 'filled' | 'outline'`
- `rows?: number` - Number of visible rows
- `autoResize?: boolean` - Auto-grow with content
- `minHeight?: number` - Minimum height in pixels
- `maxHeight?: number` - Maximum height in pixels
- `maxLength?: number` - Maximum character count
- `showCharacterCount?: boolean` - Display character count
- `error?: boolean`
- `success?: boolean`
- `helperTextKey?: string`

### Card
Container component with elevated/outlined/filled variants.

```tsx
import { Card } from '@/components/ui';

<Card variant="elevated" p="$4">
  <Text i18nKey="common.app_name" />
</Card>

// With composition
<Card variant="elevated">
  <Card.Header>
    <Heading level="h3" i18nKey="common.app_name" />
  </Card.Header>
  <Card.Body>
    <Text i18nKey="common.loading" color="muted" />
  </Card.Body>
  <Card.Footer>
    <Button variant="primary" size="sm" labelKey="common.confirm" />
  </Card.Footer>
</Card>
```

**Props:**
- `variant?: 'elevated' | 'outlined' | 'filled'`
- `pressable?: boolean` - Enable press handling
- `onPress?: () => void`

**Sub-components:**
- `<Card.Header />` - Card header section
- `<Card.Body />` - Card content section
- `<Card.Footer />` - Card footer section

### Sheet
Bottom sheet component for mobile overlays.

```tsx
import { Sheet } from '@/components/ui';

<Sheet
  open={open}
  onOpenChange={setOpen}
  snapPoints={[25, 50, 75]}
  confirmLabelKey="common.save"
  cancelLabelKey="common.cancel"
  onConfirm={handleSave}
>
  <Sheet.Content padding="$4">
    <Text i18nKey="common.app_name" />
  </Sheet.Content>
</Sheet>
```

**Props:**
- `open: boolean` - Control open state
- `onOpenChange: (open: boolean) => void`
- `snapPoints?: number[]` - Snap points in percentages
- `defaultSnapPoint?: number` - Initial snap point index
- `dismissOnSnapToBottom?: boolean` - Allow dismiss by dragging to bottom
- `backdrop?: boolean` - Show backdrop overlay
- `dismissible?: boolean` - Allow dismiss by backdrop tap
- `confirmLabelKey?: string` - Translation key for confirm button
- `cancelLabelKey?: string` - Translation key for cancel button
- `onConfirm?: () => void`
- `onCancel?: () => void`

**Sub-components:**
- `<Sheet.Header />` - Sheet header section
- `<Sheet.Content />` - Sheet content section

## Theme Usage

### Switching Themes
Themes are controlled via the preferences store:

```typescript
import { usePreferencesStore } from '@/stores/preferences';

function ThemeToggle() {
  const { theme, setTheme } = usePreferencesStore();
  
  return (
    <Button
      labelKey={theme === 'light' ? 'common.dark_mode' : 'common.light_mode'}
      onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    />
  );
}
```

### Theme-Aware Styling
Use Tamagui's theme tokens for automatic theme switching:

```tsx
<Box bg="$background" p="$4">
  <Text color="$color">Themed text</Text>
</Box>
```

## i18n Integration

### Adding Translations
Add new keys to both locale files:

```json
// src/i18n/locales/en/common.json
{
  "new_key": "New text"
}

// src/i18n/locales/ko/common.json
{
  "new_key": "새 텍스트"
}
```

### Using Interpolation
```tsx
// Translation: "Hello, {{name}}!"
<Text i18nKey="common.greeting" i18nParams={{ name: userName }} />
```

### Type Safety
Translation keys are type-safe via TypeScript module augmentation:

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
t('common.app_name'); // ✅ Autocomplete available
t('common.typo');     // ❌ Type error
```

## Storybook

### Running Storybook
```bash
# Enable Storybook mode
STORYBOOK_ENABLED=true bun start

# Navigate to Storybook route in the app
```

### Component Stories
All components have `.stories.tsx` files demonstrating usage.

To add stories for a new component:

```tsx
import type { Meta } from '@storybook/react-native';
import { YourComponent } from './YourComponent';

export default {
  title: 'Components/YourComponent',
  component: YourComponent,
} as Meta;

export const Default = {
  args: {
    // Component props
  },
};
```

## Best Practices

1. **Always use i18nKey** - Never hardcode strings in components
2. **Use semantic colors** - `$primary`, `$success` instead of hex values
3. **Follow spacing scale** - Use token values (`$2`, `$4`) instead of pixels
4. **Compose with variants** - Use pre-configured variants before custom props
5. **Type safety** - All components have full TypeScript support
6. **Storybook first** - Create stories alongside component development
7. **Theme awareness** - Use theme tokens for automatic dark mode support
