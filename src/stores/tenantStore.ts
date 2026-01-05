/**
 * Tenant Context Store
 *
 * Manages the active tenant context for multi-tenant support.
 * Persists the selected tenant ID to AsyncStorage so the user's
 * church choice persists across app restarts.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const TENANT_STORAGE_KEY = '@gagyo:active_tenant_id';

export interface TenantState {
  /**
   * The ID of the currently active tenant.
   */
  activeTenantId: string | null;

  /**
   * The name of the currently active tenant.
   */
  activeTenantName: string | null;

  /**
   * Indicates whether the store is loading initial state.
   */
  loading: boolean;

  /**
   * Set the active tenant and persist to AsyncStorage.
   *
   * @param tenantId - The tenant ID to set as active
   * @param tenantName - The display name of the tenant
   */
  setActiveTenant: (tenantId: string, tenantName: string) => Promise<void>;

  /**
   * Clear the active tenant context.
   * Called on logout or when tenant membership is revoked.
   */
  clearTenantContext: () => Promise<void>;

  /**
   * Load tenant context from AsyncStorage and validate membership.
   * Called on app startup to restore the previous tenant selection.
   */
  loadTenantFromStorage: () => Promise<void>;

  /**
   * Check if the user has an active membership in the given tenant.
   *
   * @param tenantId - The tenant ID to check
   * @returns True if user has an active membership
   */
  validateMembership: (tenantId: string) => Promise<boolean>;
}

/**
 * Tenant store with AsyncStorage persistence.
 *
 * The store maintains the currently selected tenant (church) for the
 * authenticated user. This context is used to scope all data queries
 * to the appropriate tenant.
 *
 * @example
 * ```tsx
 * function TenantSelector() {
 *   const { activeTenantId, setActiveTenant } = useTenantStore();
 *
 *   const handleSelect = (tenant: Tenant) => {
 *     setActiveTenant(tenant.id, tenant.name);
 *   };
 *
 *   return <TenantList onSelect={handleSelect} selectedId={activeTenantId} />;
 * }
 * ```
 */
export const useTenantStore = create<TenantState>((set, get) => ({
  // Initial state
  activeTenantId: null,
  activeTenantName: null,
  loading: true,

  setActiveTenant: async (tenantId: string, tenantName: string) => {
    // Persist to AsyncStorage
    await AsyncStorage.setItem(TENANT_STORAGE_KEY, tenantId);

    // Update state
    set({
      activeTenantId: tenantId,
      activeTenantName: tenantName,
    });
  },

  clearTenantContext: async () => {
    // Remove from AsyncStorage
    await AsyncStorage.removeItem(TENANT_STORAGE_KEY);

    // Clear state
    set({
      activeTenantId: null,
      activeTenantName: null,
    });
  },

  loadTenantFromStorage: async () => {
    try {
      const tenantId = await AsyncStorage.getItem(TENANT_STORAGE_KEY);

      if (!tenantId) {
        set({ loading: false });
        return;
      }

      // Verify tenant still valid by checking membership
      const isValid = await get().validateMembership(tenantId);

      if (isValid) {
        // Fetch tenant name
        const { data } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenantId)
          .single();

        set({
          activeTenantId: tenantId,
          activeTenantName: data?.name ?? null,
          loading: false,
        });
      } else {
        // Membership no longer active, clear context
        await AsyncStorage.removeItem(TENANT_STORAGE_KEY);
        set({
          activeTenantId: null,
          activeTenantName: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Failed to load tenant from storage:', error);
      set({
        activeTenantId: null,
        activeTenantName: null,
        loading: false,
      });
    }
  },

  validateMembership: async (tenantId: string) => {
    try {
      // Check if user has an active membership in this tenant
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      return !error && data !== null;
    } catch {
      return false;
    }
  },
}));

/**
 * Hook for accessing tenant context.
 *
 * Provides a clean interface for components to access and modify
 * the active tenant context.
 *
 * @returns Tenant context with active tenant info and actions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { activeTenantId, activeTenantName, hasTenant, setActiveTenant } = useTenantContext();
 *
 *   if (!hasTenant) {
 *     return <PleaseSelectTenant />;
 *   }
 *
 *   return <div>Active church: {activeTenantName}</div>;
 * }
 * ```
 */
export interface TenantContext {
  activeTenantId: string | null;
  activeTenantName: string | null;
  loading: boolean;
  hasTenant: boolean;
  setActiveTenant: (tenantId: string, tenantName: string) => Promise<void>;
  clearTenantContext: () => Promise<void>;
}

export function useTenantContext(): TenantContext {
  const activeTenantId = useTenantStore((state) => state.activeTenantId);
  const activeTenantName = useTenantStore((state) => state.activeTenantName);
  const loading = useTenantStore((state) => state.loading);
  const setActiveTenant = useTenantStore((state) => state.setActiveTenant);
  const clearTenantContext = useTenantStore((state) => state.clearTenantContext);

  return {
    activeTenantId,
    activeTenantName,
    loading,
    setActiveTenant,
    clearTenantContext,
    hasTenant: activeTenantId !== null,
  };
}

/**
 * Convenience hook for just the active tenant ID.
 */
export function useActiveTenantId(): string | null {
  return useTenantStore((state) => state.activeTenantId);
}

/**
 * Convenience hook for checking if a tenant is active.
 */
export function useHasTenant(): boolean {
  return useTenantStore((state) => state.activeTenantId !== null);
}
