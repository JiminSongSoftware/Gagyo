import type { TransProps as I18NextTransProps } from 'react-i18next';
import { Trans as I18NextTrans } from 'react-i18next';
import type { TextStyle, ViewStyle } from 'react-native';
import { Text as RNText, StyleSheet } from 'react-native';

export interface TransProps extends Omit<I18NextTransProps, 'components'> {
  /**
   * The i18n translation key.
   */
  i18nKey: string;

  /**
   * Optional parameters for interpolation in the translation string.
   */
  i18nParams?: Record<string, string | number | boolean>;

  /**
   * Components to interpolate into the translation string.
   * Map tag names in your translation to React components.
   *
   * @example
   * Translation: "Click <link>here</link> to learn more."
   * Components: { link: <Link href="/learn" /> }
   */
  components?: Record<string, React.ReactElement>;

  /**
   * Text style for the Trans component.
   */
  style?: TextStyle;

  /**
   * Container style for wrapping the Trans content.
   */
  containerStyle?: ViewStyle;

  /**
   * Whether the text should be rendered as a paragraph (with margins).
   * @default false
   */
  paragraph?: boolean;
}

/**
 * Trans component for rich text translations with component interpolation.
 *
 * This component wraps react-i18next's Trans component to provide:
 * - Consistent i18nKey prop pattern (like Text, Heading components)
 * - Type-safe component interpolation
 * - Styled rendering options
 *
 * @example
 * ```tsx
 * // Simple usage with link interpolation
 * <Trans
 *   i18nKey="common.terms_notice"
 *   components={{
 *     link: <Link href="/terms" />,
 *   }}
 * />
 *
 * // With parameters and styling
 * <Trans
 *   i18nKey="common.welcome_user"
 *   i18nParams={{ name: 'John' }}
 *   components={{
 *     bold: <Text style={{ fontWeight: 'bold' }} />,
 *   }}
 *   style={{ color: 'gray' }}
 * />
 *
 * // Translation file would have:
 * // {
 * //   "terms_notice": "By continuing, you agree to our <link>Terms of Service</link>.",
 * //   "welcome_user": "Welcome, <bold>{{name}}</bold>!"
 * // }
 * ```
 *
 * When to use Trans vs Text:
 * - Use `<Text i18nKey="..." />` for simple, single-line text
 * - Use `<Trans i18nKey="..." />` for text with links, bold, italic, or other rich elements
 *
 * @see {@link https://www.i18next.com/principles/translation#trans-interpolation | i18next Trans documentation}
 */
export function Trans({
  i18nKey,
  i18nParams,
  components,
  style,
  containerStyle,
  paragraph = false,
  ...props
}: TransProps) {
  // Convert our components prop to the format expected by react-i18next
  // react-i18next expects an array or a map with index/tag as key
  const i18nextComponents: Record<string, React.ReactElement> = {};

  if (components) {
    Object.entries(components).forEach(([tag, element]) => {
      // Wrap each component to ensure it renders correctly
      i18nextComponents[tag] = element;
    });
  }

  const content = (
    <I18NextTrans
      i18nKey={i18nKey}
      values={i18nParams}
      components={i18nextComponents as any}
      {...props}
    />
  );

  // Apply paragraph styling if requested
  if (paragraph) {
    return (
      <RNText style={[styles.paragraph, style]}>{content}</RNText>
    );
  }

  // If style is provided but not paragraph mode, wrap in Text
  if (style) {
    return <RNText style={style}>{content}</RNText>;
  }

  return <>{content}</>;
}

const styles = StyleSheet.create({
  paragraph: {
    marginVertical: 8,
    lineHeight: 22,
  },
});
