/**
 * Real-time message subscription hook.
 *
 * Subscribes to Supabase real-time channels for message updates
 * in a specific conversation. Provides callbacks for insert, update,
 * and delete events.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MessageWithSender } from '@/types/database';

/**
 * Payload types for real-time events.
 */
interface MessageInsertPayload {
  eventType: 'INSERT';
  new: MessageWithSender;
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
  old: { id: string };
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
   */
  onDelete?: (messageId: string) => void;

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
              case 'INSERT':
                callbacksRef.current.onInsert?.(typedPayload.new);
                break;
              case 'UPDATE':
                callbacksRef.current.onUpdate?.(typedPayload.new);
                break;
              case 'DELETE':
                callbacksRef.current.onDelete?.(typedPayload.old.id);
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
