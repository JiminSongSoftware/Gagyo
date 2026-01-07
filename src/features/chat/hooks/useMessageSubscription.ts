/**
 * Real-time message subscription hook.
 *
 * Subscribes to Supabase real-time channels for message updates
 * in a specific conversation. Provides callbacks for insert, update,
 * and delete events.
 *
 * Note: Real-time payloads only include message table data, not related sender/user.
 * For INSERT events, we fetch the full message with sender data.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MessageWithSender, MessageContentType } from '@/types/database';

/**
 * Payload types for real-time events.
 * Note: Real-time payloads don't include related data (sender, user).
 */
interface MessageInsertPayload {
  eventType: 'INSERT';
  new: {
    id: string;
    tenant_id: string;
    conversation_id: string;
    sender_id: string;
    parent_id: string | null;
    content: string;
    content_type: string;
    is_event_chat: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  old: Record<string, never>;
}

interface MessageUpdatePayload {
  eventType: 'UPDATE';
  new: MessageWithSender;
  old: MessageWithSender;
}

interface MessageDeletePayload {
  eventType: 'DELETE';
  new: Record<string, never>;
  old: {
    id: string;
    parent_id?: string | null;
    conversation_id?: string;
    [key: string]: unknown;
  };
}

type MessagePayload = MessageInsertPayload | MessageUpdatePayload | MessageDeletePayload;

/**
 * Callbacks for message events.
 */
export interface MessageSubscriptionCallbacks {
  /**
   * Called when a new message is inserted.
   */
  onInsert?: (message: MessageWithSender) => void;

  /**
   * Called when a message is updated.
   */
  onUpdate?: (message: MessageWithSender) => void;

  /**
   * Called when a message is deleted.
   * @param messageId - The ID of the deleted message
   * @param oldMessage - Partial data from the deleted message (may include parent_id for thread updates)
   */
  onDelete?: (messageId: string, oldMessage?: Partial<MessageWithSender>) => void;

  /**
   * Called when a subscription error occurs.
   */
  onError?: (error: Error) => void;
}

/**
 * Hook return type.
 */
export interface MessageSubscriptionState {
  /**
   * Whether the subscription is currently active.
   */
  isSubscribed: boolean;

  /**
   * Manually unsubscribe from the channel.
   */
  unsubscribe: () => void;
}

/**
 * Fetch full message with sender data by ID.
 * Used when real-time INSERT payload doesn't include related data.
 */
async function fetchFullMessage(
  messageId: string,
  tenantId: string
): Promise<MessageWithSender | null> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      tenant_id,
      conversation_id,
      sender_id,
      parent_id,
      content,
      content_type,
      is_event_chat,
      created_at,
      updated_at,
      deleted_at,
      sender:memberships!messages_sender_id_fkey (
        id,
        user:users!memberships_user_id_fkey (
          id,
          display_name,
          photo_url
        )
      ),
      replies:messages!parent_id(count)
    `)
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  const sender = data.sender as {
    id: string;
    user: { id: string; display_name: string | null; photo_url: string | null };
  };

  const replies = data.replies as { count: number }[] | undefined;
  const reply_count = replies?.[0]?.count ?? 0;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    conversation_id: data.conversation_id,
    sender_id: data.sender_id,
    parent_id: data.parent_id,
    content: data.content,
    content_type: data.content_type as MessageContentType,
    is_event_chat: data.is_event_chat,
    created_at: data.created_at,
    updated_at: data.updated_at,
    deleted_at: data.deleted_at,
    sender: {
      id: sender?.id ?? '',
      user: {
        id: sender?.user?.id ?? '',
        display_name: sender?.user?.display_name ?? null,
        photo_url: sender?.user?.photo_url ?? null,
      },
    },
    reply_count,
  } as MessageWithSender;
}

/**
 * Subscribe to real-time message updates for a conversation.
 *
 * @param conversationId - The conversation to subscribe to
 * @param tenantId - The tenant ID for filtering
 * @param callbacks - Event callbacks for insert/update/delete
 * @returns Subscription state and controls
 *
 * @example
 * ```tsx
 * const { isSubscribed } = useMessageSubscription(
 *   conversationId,
 *   tenantId,
 *   {
 *     onInsert: (message) => appendMessage(message),
 *     onUpdate: (message) => updateMessage(message),
 *     onDelete: (id) => removeMessage(id),
 *   }
 * );
 * ```
 */
export function useMessageSubscription(
  conversationId: string | null,
  tenantId: string | null,
  callbacks: MessageSubscriptionCallbacks
): MessageSubscriptionState {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // Store callbacks in refs to avoid re-subscribing on callback changes
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Don't subscribe if missing required IDs
    if (!conversationId || !tenantId) {
      return;
    }

    // Create unique channel name for this conversation
    const channelName = `messages:${conversationId}`;

    // Subscribe to postgres_changes for the messages table
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          try {
            const typedPayload = payload as unknown as MessagePayload;

            switch (typedPayload.eventType) {
              case 'INSERT': {
                // Fetch full message with sender data since real-time payload doesn't include it
                if (tenantId) {
                  fetchFullMessage(typedPayload.new.id, tenantId).then((fullMessage) => {
                    if (fullMessage) {
                      callbacksRef.current.onInsert?.(fullMessage);
                    }
                  });
                }
                break;
              }
              case 'UPDATE':
                callbacksRef.current.onUpdate?.(typedPayload.new);
                break;
              case 'DELETE':
                // Pass full old payload to include parent_id for thread reply count updates
                callbacksRef.current.onDelete?.(typedPayload.old.id, typedPayload.old);
                break;
            }
          } catch (error) {
            callbacksRef.current.onError?.(
              error instanceof Error ? error : new Error('Unknown error')
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CHANNEL_ERROR') {
          callbacksRef.current.onError?.(new Error('Failed to subscribe to messages channel'));
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or when dependencies change
    return () => {
      unsubscribe();
    };
  }, [conversationId, tenantId, unsubscribe]);

  return {
    isSubscribed: isSubscribedRef.current,
    unsubscribe,
  };
}

/**
 * Subscribe to real-time updates for conversation list.
 *
 * Listens for new messages across all conversations the user participates in
 * to update last message previews and unread counts.
 *
 * @param membershipId - The user's membership ID
 * @param tenantId - The tenant ID for filtering
 * @param callbacks - Event callbacks
 * @returns Subscription state and controls
 */
export function useConversationListSubscription(
  membershipId: string | null,
  tenantId: string | null,
  callbacks: {
    onNewMessage?: (conversationId: string, message: MessageWithSender) => void;
    onError?: (error: Error) => void;
  }
): MessageSubscriptionState {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!membershipId || !tenantId) {
      return;
    }

    const channelName = `conversation-list:${membershipId}`;

    // Subscribe to all messages in conversations the user participates in
    // The RLS policies will filter to only conversations the user can see
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          try {
            const message = payload.new as unknown as MessageWithSender;
            callbacksRef.current.onNewMessage?.(message.conversation_id, message);
          } catch (error) {
            callbacksRef.current.onError?.(
              error instanceof Error ? error : new Error('Unknown error')
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CHANNEL_ERROR') {
          callbacksRef.current.onError?.(
            new Error('Failed to subscribe to conversation list channel')
          );
        }
      });

    channelRef.current = channel;

    return () => {
      unsubscribe();
    };
  }, [membershipId, tenantId, unsubscribe]);

  return {
    isSubscribed: isSubscribedRef.current,
    unsubscribe,
  };
}
