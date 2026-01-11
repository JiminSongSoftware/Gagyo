/**
 * Toast Component
 *
 * Simple toast notification for showing brief messages.
 *
 * @example
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

let toastState: ToastState = {
  visible: false,
  message: '',
  type: 'info',
};

let updateToast: ((state: ToastState) => void) | null = null;

// ============================================================================
// TOAST COMPONENT
// ============================================================================

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
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const Toast = {
  show: (message: string, type: ToastType = 'info') => {
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
  },

  hide: () => {
    toastState = {
      ...toastState,
      visible: false,
    };

    if (updateToast) {
      updateToast(toastState);
    }
  },
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
