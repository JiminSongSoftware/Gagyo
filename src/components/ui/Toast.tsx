/**
 * Toast Component
 *
 * Simple toast notification for showing brief messages.
 *
 * Supports both declarative and imperative APIs:
 *
 * @example Declarative API (preferred for components)
 * ```tsx
 * const [showToast, setShowToast] = useState(false);
 * <Toast visible={showToast} message="Copied!" onDismiss={() => setShowToast(false)} />
 * ```
 *
 * @example Imperative API (for quick calls)
 * ```tsx
 * Toast.show('Message copied', 'success');
 * Toast.show('Error occurred', 'error');
 * Toast.show('Loading...', 'info');
 * ```
 */

import * as React from 'react';
import { StyleSheet, Text, View, Modal } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface ToastProps {
  /**
   * Whether the toast is visible.
   */
  visible: boolean;

  /**
   * The message to display.
   */
  message: string;

  /**
   * Toast type (affects background color).
   */
  type?: ToastType;

  /**
   * Callback when toast is dismissed.
   */
  onDismiss?: () => void;
}

let toastState: ToastState = {
  visible: false,
  message: '',
  type: 'info',
};

let updateToast: ((state: ToastState) => void) | null = null;

// ============================================================================
// DECLARATIVE TOAST COMPONENT (Preferred API)
// ============================================================================

export function Toast({ visible, message, type = 'info', onDismiss: _onDismiss }: ToastProps) {
  // Note: Auto-hide is NOT handled here to allow parent components control
  // The parent component (e.g., ChatScreen) should manage auto-hide with useEffect
  // If you want auto-hide, use Toast.show() imperative API instead

  if (!visible) return null;

  const backgroundColor = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#374151';

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <View style={[styles.toast, { backgroundColor }]}>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// IMPERATIVE API (Legacy support)
// ============================================================================

/**
 * ToastContainer is a singleton component that enables the imperative API.
 * Place it at the root of your app (e.g., in _layout.tsx).
 */
export function ToastContainer() {
  const [state, setState] = React.useState<ToastState>(toastState);

  React.useEffect(() => {
    updateToast = setState;
    return () => {
      updateToast = null;
    };
  }, []);

  if (!state.visible) return null;

  const backgroundColor =
    state.type === 'error' ? '#EF4444' : state.type === 'success' ? '#10B981' : '#374151';

  return (
    <Modal transparent visible={state.visible} animationType="fade">
      <View style={styles.container}>
        <View style={[styles.toast, { backgroundColor }]}>
          <Text style={styles.message}>{state.message}</Text>
        </View>
      </View>
    </Modal>
  );

  // Note: Auto-hide is handled by the show() method's setTimeout
}

Toast.show = (message: string, type: ToastType = 'info') => {
  toastState = {
    visible: true,
    message,
    type,
  };

  if (updateToast) {
    updateToast(toastState);
  }

  // Auto hide after 3 seconds
  setTimeout(() => {
    Toast.hide();
  }, 3000);
};

Toast.hide = () => {
  toastState = {
    ...toastState,
    visible: false,
  };

  if (updateToast) {
    updateToast(toastState);
  }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
    backgroundColor: 'transparent',
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: '80%',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
