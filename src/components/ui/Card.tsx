import type { StackProps } from 'tamagui';
import {
  Stack,
  styled,
  useTheme,
} from 'tamagui';

export interface CardProps extends StackProps {
  /**
   * Visual variant of the card.
   */
  variant?: 'elevated' | 'outlined' | 'filled';

  /**
   * Padding variant for the card content.
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Whether the card is pressable (interactive).
   */
  pressable?: boolean;

  /**
   * Whether to show hover effect on pressable cards.
   */
  hoverable?: boolean;
}

const variantStyles = {
  elevated: {
    backgroundColor: '$background',
    borderWidth: 0,
    shadowColor: '$shadowColor',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  outlined: {
    backgroundColor: '$background',
    borderWidth: 1,
    borderColor: '$border',
    shadowColor: 'transparent',
  },
  filled: {
    backgroundColor: '$backgroundSecondary',
    borderWidth: 0,
    shadowColor: 'transparent',
  },
} as const;

const paddingStyles = {
  none: { p: 0 },
  sm: { p: '$3' },
  md: { p: '$4' },
  lg: { p: '$5' },
} as const;

/**
 * Card component for content organization.
 *
 * @example
 * ```tsx
 * <Card variant="elevated" padding="md">
 *   <Card.Header>
 *     <Heading i18nKey="common.title" level="h3" />
 *   </Card.Header>
 *   <Card.Body>
 *     <Text i18nKey="common.description" />
 *   </Card.Body>
 * </Card>
 *
 * <Card variant="outlined" pressable onPress={handlePress}>
 *   <Text i18nKey="common.click_me" />
 * </Card>
 * ```
 */
export function Card({
  variant = 'elevated',
  padding = 'md',
  pressable = false,
  hoverable = false,
  children,
  ...props
}: CardProps) {
  const theme = useTheme();

  const baseStyle = {
    ...variantStyles[variant],
    ...paddingStyles[padding],
    borderRadius: '$4',
    ...(pressable || hoverable
      ? {
          cursor: 'pointer',
          ...(hoverable && {
            hoverStyle: {
              backgroundColor: variant === 'filled'
                ? '$backgroundTertiary'
                : '$backgroundSecondary',
            },
          }),
        }
      : null),
  };

  const Wrapper = pressable ? styled(Stack, { name: 'PressableCard' }) : Stack;

  return (
    <Wrapper {...baseStyle} {...props}>
      {children}
    </Wrapper>
  );
}

/**
 * Card.Header component for card header content.
 */
export const CardHeader = styled(Stack, {
  name: 'CardHeader',
  pb: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '$borderLight',
});

/**
 * Card.Body component for card main content.
 */
export const CardBody = styled(Stack, {
  name: 'CardBody',
  flex: 1,
  gap: '$2',
});

/**
 * Card.Footer component for card footer content.
 */
export const CardFooter = styled(Stack, {
  name: 'CardFooter',
  pt: '$3',
  borderTopWidth: 1,
  borderTopColor: '$borderLight',
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'flex-end' as const,
  gap: '$2',
});

// Attach sub-components to Card
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
