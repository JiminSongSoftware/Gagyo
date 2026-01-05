/**
 * Database type definitions for Supabase.
 *
 * These types define the structure of tables in the public schema.
 * They are used for type-safe queries with the Supabase client.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Database type with all tables and their relationships.
 */
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
          id?: string;
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
        Relationships: [
          {
            foreignKeyName: 'memberships_tenant_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['tenant_id'];
          },
          {
            foreignKeyName: 'conversations_tenant_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['tenant_id'];
          },
        ];
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
          id?: string;
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
        Relationships: [
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['user_id'];
          },
        ];
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
          role?: 'member' | 'small_group_leader' | 'zone_leader' | 'pastor' | 'admin';
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
        Relationships: [
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_small_group_id_fkey';
            columns: ['small_group_id'];
            isOneToOne: false;
            referencedRelation: 'small_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      small_groups: {
        Row: {
          id: string;
          tenant_id: string;
          zone_id: string | null;
          name: string;
          leader_id: string;
          co_leader_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          zone_id?: string | null;
          name: string;
          leader_id: string;
          co_leader_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          zone_id?: string | null;
          name?: string;
          leader_id?: string;
          co_leader_id?: string | null;
          updated_at?: string;
        };
      };
      zones: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          zone_leader_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          zone_leader_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          name?: string;
          zone_leader_id?: string | null;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          type: 'direct' | 'small_group' | 'ministry' | 'church_wide';
          name: string | null;
          small_group_id: string | null;
          ministry_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type?: 'direct' | 'small_group' | 'ministry' | 'church_wide';
          name?: string | null;
          small_group_id?: string | null;
          ministry_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          type?: 'direct' | 'small_group' | 'ministry' | 'church_wide';
          name?: string | null;
          small_group_id?: string | null;
          ministry_id?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/**
 * Membership type with tenant information joined.
 */
export type Membership = Database['public']['Tables']['memberships']['Row'] & {
  tenant?: Database['public']['Tables']['tenants']['Row'];
};

/**
 * Tenant type.
 */
export type Tenant = Database['public']['Tables']['tenants']['Row'];

/**
 * User type.
 */
export type User = Database['public']['Tables']['users']['Row'];

/**
 * Role type.
 */
export type Role = Database['public']['Tables']['memberships']['Insert']['role'];

/**
 * Membership status type.
 */
export type MembershipStatus = Database['public']['Tables']['memberships']['Insert']['status'];

/**
 * Locale type.
 */
export type Locale = Database['public']['Tables']['users']['Insert']['locale'];
