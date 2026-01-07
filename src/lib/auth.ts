/**
 * Authentication utility functions.
 *
 * Provides a clean interface for Supabase auth operations,
 * with error handling and type safety.
 */

import { supabase } from './supabase';
import type { AuthTokenResponsePassword, AuthResponse } from '@supabase/supabase-js';

/**
 * Sign in with email and password.
 *
 * @param email - User email address
 * @param password - User password
 * @returns Auth response with session and user data
 * @throws AuthError if authentication fails
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthTokenResponsePassword['data']> {
  console.log('[auth] signIn called for:', email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log('[auth] signIn error:', {
      message: error.message,
      name: error.name,
      status: error.status,
    });
    throw error;
  }

  console.log('[auth] signIn success, user:', data.user?.id);
  return data;
}

/**
 * Sign up with email and password.
 *
 * Creates a new user account. The user record in the public.users
 * table is created automatically via a database trigger.
 *
 * @param email - User email address
 * @param password - User password (min 8 characters recommended)
 * @returns Auth response with session and user data
 * @throws AuthError if signup fails
 */
export async function signUp(email: string, password: string): Promise<AuthResponse['data']> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out the current user.
 *
 * Clears the session from AsyncStorage and emits the SIGNED_OUT event.
 * Also clears the tenant context to ensure clean logout state.
 *
 * @throws AuthError if sign out fails
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  // Clear tenant context after successful sign out
  // Import dynamically to avoid circular dependency
  const { useTenantStore } = await import('@/stores/tenantStore');
  await useTenantStore.getState().clearTenantContext();
}

/**
 * Send a password reset email.
 *
 * The user will receive an email with a link to reset their password.
 * The password reset flow is handled by Supabase's built-in UI.
 *
 * @param email - User email address
 * @throws AuthError if email sending fails
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: undefined, // Use Supabase default reset page
  });

  if (error) {
    throw error;
  }
}

/**
 * Get the current session.
 *
 * @returns Current session or null if not authenticated
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

/**
 * Get the current user.
 *
 * @returns Current user or null if not authenticated
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

/**
 * Refresh the current session.
 *
 * Automatically called by Supabase client when needed,
 * but can be called manually to force a refresh.
 *
 * @returns Refreshed session or null if refresh failed
 */
export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw error;
  }

  return data.session;
}

/**
 * Update the current user's metadata.
 *
 * @param metadata - Metadata to update (e.g., { display_name: 'John' })
 * @returns Updated user data
 */
export async function updateUserMetadata(metadata: Record<string, unknown>) {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

/**
 * Auth error types for better error handling.
 */
export const AuthErrorType = {
  InvalidCredentials: 'Invalid login credentials',
  EmailNotConfirmed: 'Email not confirmed',
  WeakPassword: 'Password should be at least 8 characters',
  EmailAlreadyExists: 'User already registered',
  InvalidEmail: 'Unable to validate email address',
  SessionExpired: 'Session expired',
} as const;

/**
 * Check if an auth error matches a specific type.
 *
 * @param error - Error object from Supabase auth
 * @param type - Expected error type
 * @returns True if error matches the type
 */
export function isAuthError(error: unknown, type: keyof typeof AuthErrorType): boolean {
  if (error instanceof Error) {
    return error.message === AuthErrorType[type];
  }
  return false;
}

/**
 * Get a user-friendly error message from an auth error.
 *
 * @param error - Error object from Supabase auth
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Map common Supabase error messages to user-friendly strings
    if (message.includes('Invalid login credentials')) {
      return 'auth.invalid_credentials';
    }
    if (message.includes('Email not confirmed')) {
      return 'auth.email_not_confirmed';
    }
    if (message.includes('Password should be at least')) {
      return 'auth.password_too_short';
    }
    if (message.includes('User already registered')) {
      return 'auth.email_already_exists';
    }
    if (message.includes('Unable to validate email')) {
      return 'auth.invalid_email';
    }
  }

  return 'errors:unknown_error';
}
