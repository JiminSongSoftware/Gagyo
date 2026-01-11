/**
 * Database type definitions for Supabase.
 *
 * These types define the structure of tables in the public schema.
 * They are used for type-safe queries with the Supabase client.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          notification_preferences: {
            messages: boolean;
            prayers: boolean;
            journals: boolean;
            system: boolean;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_name?: string | null;
          photo_url?: string | null;
          locale?: 'en' | 'ko';
          notification_preferences?: {
            messages: boolean;
            prayers: boolean;
            journals: boolean;
            system: boolean;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          photo_url?: string | null;
          locale?: 'en' | 'ko';
          notification_preferences?: {
            messages: boolean;
            prayers: boolean;
            journals: boolean;
            system: boolean;
          };
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
      messages: {
        Row: {
          id: string;
          tenant_id: string;
          conversation_id: string;
          sender_id: string;
          parent_id: string | null;
          thread_id: string | null;
          quoted_message_id: string | null;
          content: string | null;
          content_type: 'text' | 'image' | 'video' | 'file' | 'prayer_card' | 'system';
          is_event_chat: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          conversation_id: string;
          sender_id: string;
          parent_id?: string | null;
          thread_id?: string | null;
          quoted_message_id?: string | null;
          content?: string | null;
          content_type?: 'text' | 'image' | 'video' | 'file' | 'prayer_card' | 'system';
          is_event_chat?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          parent_id?: string | null;
          thread_id?: string | null;
          quoted_message_id?: string | null;
          content?: string | null;
          content_type?: 'text' | 'image' | 'video' | 'file' | 'prayer_card' | 'system';
          is_event_chat?: boolean;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_quoted_message_id_fkey';
            columns: ['quoted_message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          membership_id: string;
          last_read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          membership_id: string;
          last_read_at?: string | null;
          created_at?: string;
        };
        Update: {
          last_read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_participants_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_participants_membership_id_fkey';
            columns: ['membership_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
        ];
      };
      event_chat_exclusions: {
        Row: {
          id: string;
          message_id: string;
          excluded_membership_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          excluded_membership_id: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          excluded_membership_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_chat_exclusions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_chat_exclusions_excluded_membership_id_fkey';
            columns: ['excluded_membership_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          tenant_id: string;
          message_id: string | null;
          file_name: string;
          file_url: string;
          file_size: number;
          mime_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          message_id?: string | null;
          file_name: string;
          file_url: string;
          file_size: number;
          mime_type: string;
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          message_id?: string | null;
          file_name?: string;
          file_url?: string;
          file_size?: number;
          mime_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attachments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attachments_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      device_tokens: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          last_used_at: string;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          last_used_at?: string;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          tenant_id?: string;
          user_id?: string;
          token?: string;
          platform?: 'ios' | 'android';
          last_used_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'device_tokens_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'device_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      push_notification_logs: {
        Row: {
          id: string;
          tenant_id: string;
          notification_type: string;
          recipient_count: number;
          sent_count: number;
          failed_count: number;
          error_summary: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          notification_type: string;
          recipient_count: number;
          sent_count: number;
          failed_count: number;
          error_summary?: Json | null;
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          notification_type?: string;
          recipient_count?: number;
          sent_count?: number;
          failed_count?: number;
          error_summary?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'push_notification_logs_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      prayer_cards: {
        Row: {
          id: string;
          tenant_id: string;
          author_id: string;
          content: string;
          recipient_scope: 'individual' | 'small_group' | 'church_wide';
          answered: boolean;
          answered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          author_id: string;
          content: string;
          recipient_scope: 'individual' | 'small_group' | 'church_wide';
          answered?: boolean;
          answered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          recipient_scope?: 'individual' | 'small_group' | 'church_wide';
          answered?: boolean;
          answered_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prayer_cards_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prayer_cards_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
        ];
      };
      prayer_card_recipients: {
        Row: {
          id: string;
          prayer_card_id: string;
          recipient_membership_id: string | null;
          recipient_small_group_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prayer_card_id: string;
          recipient_membership_id?: string | null;
          recipient_small_group_id?: string | null;
          created_at?: string;
        };
        Update: {
          recipient_membership_id?: string | null;
          recipient_small_group_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prayer_card_recipients_prayer_card_id_fkey';
            columns: ['prayer_card_id'];
            isOneToOne: false;
            referencedRelation: 'prayer_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prayer_card_recipients_recipient_membership_id_fkey';
            columns: ['recipient_membership_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prayer_card_recipients_recipient_small_group_id_fkey';
            columns: ['recipient_small_group_id'];
            isOneToOne: false;
            referencedRelation: 'small_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      pastoral_journals: {
        Row: {
          id: string;
          tenant_id: string;
          small_group_id: string;
          author_id: string;
          status: 'draft' | 'submitted' | 'zone_reviewed' | 'pastor_confirmed';
          week_start_date: string;
          content: Json | null;
          submitted_at: string | null;
          zone_reviewed_at: string | null;
          pastor_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          small_group_id: string;
          author_id: string;
          status?: 'draft' | 'submitted' | 'zone_reviewed' | 'pastor_confirmed';
          week_start_date: string;
          content?: Json | null;
          submitted_at?: string | null;
          zone_reviewed_at?: string | null;
          pastor_confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'draft' | 'submitted' | 'zone_reviewed' | 'pastor_confirmed';
          content?: Json | null;
          submitted_at?: string | null;
          zone_reviewed_at?: string | null;
          pastor_confirmed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pastoral_journals_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pastoral_journals_small_group_id_fkey';
            columns: ['small_group_id'];
            isOneToOne: false;
            referencedRelation: 'small_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pastoral_journals_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
        ];
      };
      pastoral_journal_comments: {
        Row: {
          id: string;
          tenant_id: string;
          pastoral_journal_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          pastoral_journal_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pastoral_journal_comments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pastoral_journal_comments_pastoral_journal_id_fkey';
            columns: ['pastoral_journal_id'];
            isOneToOne: false;
            referencedRelation: 'pastoral_journals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pastoral_journal_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['id'];
          },
        ];
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

/**
 * Conversation type enum.
 */
export type ConversationType = Database['public']['Tables']['conversations']['Row']['type'];

/**
 * Message content type enum.
 */
export type MessageContentType = Database['public']['Tables']['messages']['Row']['content_type'];

/**
 * Message type.
 */
export type Message = Database['public']['Tables']['messages']['Row'];

/**
 * Conversation type.
 */
export type Conversation = Database['public']['Tables']['conversations']['Row'];

/**
 * Conversation participant type.
 */
export type ConversationParticipant =
  Database['public']['Tables']['conversation_participants']['Row'];

/**
 * Event chat exclusion type.
 */
export type EventChatExclusion = Database['public']['Tables']['event_chat_exclusions']['Row'];

/**
 * Message with sender information joined.
 * Used for displaying messages in the chat UI.
 */
export type MessageWithSender = Message & {
  sender: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
  };
  quoted_message?: {
    id: string;
    content: string | null;
    sender: {
      id: string;
      display_name: string | null;
    };
  } | null;
  reply_count?: number;
};

/**
 * Conversation with last message and participant info.
 * Used for displaying conversation list items.
 */
export type ConversationWithLastMessage = Conversation & {
  last_message: {
    id: string;
    content: string | null;
    content_type: MessageContentType;
    created_at: string;
    sender: {
      id: string;
      display_name: string | null;
    };
  } | null;
  unread_count: number;
  participant_names?: string[];
};

/**
 * Device token type for push notifications.
 */
export type DeviceToken = Database['public']['Tables']['device_tokens']['Row'];

/**
 * Push notification log type.
 */
export type PushNotificationLog = Database['public']['Tables']['push_notification_logs']['Row'];

/**
 * Attachment type for images and files.
 */
export type Attachment = Database['public']['Tables']['attachments']['Row'];

/**
 * Prayer card type.
 */
export type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];

/**
 * Pastoral journal type.
 */
export type PastoralJournal = Database['public']['Tables']['pastoral_journals']['Row'];

/**
 * Pastoral journal comment type.
 */
export type PastoralJournalComment =
  Database['public']['Tables']['pastoral_journal_comments']['Row'];

/**
 * Small group type.
 */
export type SmallGroup = Database['public']['Tables']['small_groups']['Row'];

/**
 * Zone type.
 */
export type Zone = Database['public']['Tables']['zones']['Row'];

/**
 * Prayer card recipient type.
 */
export type PrayerCardRecipient = Database['public']['Tables']['prayer_card_recipients']['Row'];

/**
 * Prayer card recipient scope type.
 */
export type PrayerCardRecipientScope = PrayerCard['recipient_scope'];

/**
 * Prayer card with author information joined.
 * Used for displaying prayer cards in the UI.
 */
export interface PrayerCardWithAuthor extends PrayerCard {
  author: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
  };
}

/**
 * Image attachment with message and conversation context.
 * Used for displaying images in the gallery view.
 */
export interface ImageAttachment {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  message: {
    id: string;
    conversationId: string;
    conversation: {
      id: string;
      name: string | null;
      type: ConversationType;
    };
    sender: {
      displayName: string | null;
      photoUrl: string | null;
    };
  };
}
