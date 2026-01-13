import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  backgroundColor?: string;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
}

/**
 * Wrapper component for screens that need safe area padding.
 * Designed to work with native tabs - doesn't interfere with tab bar layout.
 */
export function SafeScreen({ children, backgroundColor, edges = ['top'] }: SafeScreenProps) {
  const insets = useSafeAreaInsets();

  const paddingStyles = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
  };

  return (
    <View style={[paddingStyles, { flex: 1, backgroundColor }]}>
      {children}
    </View>
  );
}
