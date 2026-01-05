/**
 * Tenant context hook.
 *
 * Re-exports the tenant context interface for convenient importing.
 * Provides a clean API for components to access and modify tenant state.
 */

export {
  useTenantContext,
  useActiveTenantId,
  useHasTenant,
  type TenantContext,
} from '@/stores/tenantStore';
