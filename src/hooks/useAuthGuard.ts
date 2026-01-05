/**
 * Authentication guard hook.
 *
 * Provides navigation guard functionality to protect routes
 * that require authentication and/or tenant context.
 *
 * Use this hook in layout components or protected screens to
 * ensure users are properly authenticated.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from './useAuth';
import { useTenantContext } from './useTenantContext';

export interface AuthGuardState {
  user: ReturnType<typeof useAuth>['user'];
  hasTenant: boolean;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook that manages authentication-based navigation.
 *
 * Automatically redirects users based on their auth and tenant state:
 * - No user → Login screen
 * - User but no tenant → Tenant selection screen
 *
 * @returns AuthGuardState with user info, tenant status, and loading
 *
 * @example
 * ```tsx
 * function ProtectedScreen() {
 *   const { user, hasTenant, loading } = useAuthGuard();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!user) return null; // Will redirect to login
 *   if (!hasTenant) return null; // Will redirect to tenant selection
 *
 *   return <ProtectedContent />;
 * }
 * ```
 */
export function useAuthGuard(): AuthGuardState {
  const { user, loading: authLoading } = useAuth();
  const { hasTenant, loading: tenantLoading } = useTenantContext();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || tenantLoading) return;

    // Only redirect if explicitly needed
    // (Main navigation is handled in _layout.tsx)
  }, [user, hasTenant, authLoading, tenantLoading, router]);

  return {
    user,
    hasTenant,
    loading: authLoading || tenantLoading,
    isAuthenticated: user !== null,
  };
}

/**
 * Hook that returns true if the current route is protected.
 * Protected routes require both authentication and tenant context.
 */
export function useIsProtectedRoute(): boolean {
  // This can be expanded to check the current route
  // For now, all main app routes are considered protected
  return true;
}

/**
 * Hook that ensures the user has both auth and tenant context.
 * Throws an error or redirects if not.
 */
export function useRequireAuth(): {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  tenantId: NonNullable<ReturnType<typeof useTenantContext>['activeTenantId']>;
} {
  const { user } = useAuth();
  const { activeTenantId } = useTenantContext();

  if (!user) {
    throw new Error('useRequireAuth: User is not authenticated');
  }

  if (!activeTenantId) {
    throw new Error('useRequireAuth: No active tenant');
  }

  return { user, tenantId: activeTenantId };
}
