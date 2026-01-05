/**
 * Supabase Client Configuration
 *
 * Initializes the Supabase client with AsyncStorage for session persistence.
 * All auth operations and database queries go through this client.
 *
 * Environment variables required:
 * - EXPO_PUBLIC_SUPABASE_URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL environment variable is not set');
}

if (!supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is not set');
}

/**
 * Supabase client instance configured for React Native.
 *
 * Features:
 * - AsyncStorage adapter for session persistence
 * - Automatic token refresh
 * - Session persistence across app restarts
 * - No URL detection (mobile app doesn't use URL-based auth)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as unknown as Storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Type alias for Supabase client for convenience.
 */
export type SupabaseClient = typeof supabase;

/**
 * Database types matching the Supabase schema.
 * These types should be generated using:
 * bunx supabase gen types typescript --local > src/types/database.ts
 *
 * For now, we define the core types inline.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Json | null;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          display_name: string | null;
          photo_url: string | null;
          locale: 'en' | 'ko';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          photo_url?: string | null;
          locale?: 'en' | 'ko';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          photo_url?: string | null;
          locale?: 'en' | 'ko';
          updated_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: 'member' | 'small_group_leader' | 'zone_leader' | 'pastor' | 'admin';
          small_group_id: string | null;
          status: 'invited' | 'active' | 'suspended' | 'removed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          role: 'member' | 'small_group_leader' | 'zone_leader' | 'pastor' | 'admin';
          small_group_id?: string | null;
          status?: 'invited' | 'active' | 'suspended' | 'removed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: 'member' | 'small_group_leader' | 'zone_leader' | 'pastor' | 'admin';
          small_group_id?: string | null;
          status?: 'invited' | 'active' | 'suspended' | 'removed';
          updated_at?: string;
        };
      };
    };
  };
}
